import shutil
import subprocess
import tempfile
from pathlib import Path

from config import (
    RUNNER_CPU_LIMIT,
    RUNNER_MEMORY_LIMIT,
    RUNNER_OUTPUT_LIMIT,
    RUNNER_PIDS_LIMIT,
    RUNNER_TIMEOUT_SECONDS,
)
from llm_client import LocalModelError


LANGUAGE_CONFIG = {
    "javascript": {
        "filename": "main.js",
        "image": "node:20-alpine",
        "command": ["node", "/workspace/main.js"],
    },
    "js": {
        "filename": "main.js",
        "image": "node:20-alpine",
        "command": ["node", "/workspace/main.js"],
    },
    "python": {
        "filename": "main.py",
        "image": "python:3.11-alpine",
        "command": ["python", "/workspace/main.py"],
    },
    "py": {
        "filename": "main.py",
        "image": "python:3.11-alpine",
        "command": ["python", "/workspace/main.py"],
    },
}


class CodeExecutionError(RuntimeError):
    pass


class RunnerUnavailableError(CodeExecutionError):
    pass


def _truncate_output(text: str) -> str:
    if len(text) <= RUNNER_OUTPUT_LIMIT:
        return text
    return text[:RUNNER_OUTPUT_LIMIT] + "\n...[output truncated]..."


def _normalize_language(language: str) -> str:
    key = str(language or "").strip().lower()
    if key not in LANGUAGE_CONFIG:
        raise CodeExecutionError("Supported languages are: javascript, js, python, py")
    return key


def execute_code(language: str, code: str, stdin: str = "", timeout_seconds: int = 10) -> dict:
    docker_path = shutil.which("docker")
    if not docker_path:
        raise CodeExecutionError("Docker is not installed or not available in PATH")

    normalized_language = _normalize_language(language)
    config = LANGUAGE_CONFIG[normalized_language]
    effective_timeout = min(max(int(timeout_seconds or RUNNER_TIMEOUT_SECONDS), 1), 30)

    with tempfile.TemporaryDirectory(prefix="ai-runner-") as temp_dir:
        workspace = Path(temp_dir)
        source_file = workspace / config["filename"]
        source_file.write_text(code, encoding="utf-8")

        container_command = [
            docker_path,
            "run",
            "--rm",
            "--network",
            "none",
            "--memory",
            RUNNER_MEMORY_LIMIT,
            "--cpus",
            RUNNER_CPU_LIMIT,
            "--pids-limit",
            str(RUNNER_PIDS_LIMIT),
            "--read-only",
            "--tmpfs",
            "/tmp",
            "-i",
            "-v",
            f"{workspace.resolve()}:/workspace:ro",
            config["image"],
            *config["command"],
        ]

        try:
            completed = subprocess.run(
                container_command,
                input=stdin,
                text=True,
                capture_output=True,
                timeout=effective_timeout,
                check=False,
            )

            combined_error = f"{completed.stdout}\n{completed.stderr}".lower()
            if (
                "docker: error during connect" in combined_error
                or "the docker client must be run with elevated privileges" in combined_error
                or "open //./pipe/docker_engine" in combined_error
                or "cannot connect to the docker daemon" in combined_error
            ):
                raise RunnerUnavailableError(
                    "Docker daemon is not reachable for code execution. "
                    "Start Docker Desktop or grant daemon access to the service process."
                )

            return {
                "language": normalized_language,
                "exit_code": int(completed.returncode),
                "stdout": _truncate_output(completed.stdout),
                "stderr": _truncate_output(completed.stderr),
                "timed_out": False,
                "command": " ".join(config["command"]),
                "image": config["image"],
            }
        except subprocess.TimeoutExpired as error:
            return {
                "language": normalized_language,
                "exit_code": -1,
                "stdout": _truncate_output(error.stdout or ""),
                "stderr": _truncate_output((error.stderr or "") + "\nExecution timed out"),
                "timed_out": True,
                "command": " ".join(config["command"]),
                "image": config["image"],
            }
        except OSError as error:
            raise CodeExecutionError(f"Failed to execute Docker runner: {error}") from error
