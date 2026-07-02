import base64
import hashlib
import io
import tarfile
import time
import uuid
from typing import Dict, List, Optional

import docker
import jwt
import requests
from docker.errors import DockerException, ImageNotFound

from config import (
    BACKEND_API_URL,
    HOST_PUBLIC_IP,
    JWT_SECRET,
    TERMINAL_CANDIDATE_PORTS,
    TERMINAL_CPU_LIMIT,
    TERMINAL_IDLE_TIMEOUT_SECONDS,
    TERMINAL_IMAGE_DIR,
    TERMINAL_IMAGE_TAG,
    TERMINAL_MEMORY_LIMIT,
    TERMINAL_PIDS_LIMIT,
    TERMINAL_SYNC_EXCLUDED_DIR_NAMES,
    TERMINAL_SYNC_MAX_FILE_SIZE_BYTES,
)
from docker_runner import RunnerUnavailableError


class TerminalError(RuntimeError):
    pass


_sessions: Dict[str, dict] = {}
_sync_state: Dict[str, Dict[str, str]] = {}


def _get_client():
    try:
        return docker.from_env()
    except DockerException as error:
        raise RunnerUnavailableError(
            "Could not reach the Docker daemon. Terminal sessions require Docker socket access."
        ) from error


def ensure_image(client) -> None:
    try:
        client.images.get(TERMINAL_IMAGE_TAG)
    except ImageNotFound:
        client.images.build(path=str(TERMINAL_IMAGE_DIR), tag=TERMINAL_IMAGE_TAG)


def get_host_ip() -> str:
    # ai-service always runs inside a container in this project's deployment model.
    # A socket-based "outbound IP" probe run from in here would return the
    # container's own address on the Docker bridge network (e.g. 172.18.0.x),
    # which is unreachable from the browser -- not the Docker host's real address.
    # Default to "localhost", which Docker Desktop's published ports forward
    # correctly for the common case (browser on the same machine as the Docker
    # host). Set HOST_PUBLIC_IP explicitly when the browser is on a different
    # machine (LAN IP, remote VM, devcontainer, etc.).
    return HOST_PUBLIC_IP or "localhost"


def _file_bytes(content: str) -> bytes:
    if content.startswith("data:") and ";base64," in content:
        return base64.b64decode(content.split(",", 1)[1])
    return content.encode("utf-8")


def _build_tar(files: List[dict]) -> bytes:
    buffer = io.BytesIO()

    with tarfile.open(fileobj=buffer, mode="w") as tar:
        for file in files:
            path = (file.get("path") or "").strip()

            if not path or path.startswith("/") or ".." in path.split("/"):
                continue

            data = _file_bytes(file.get("content") or "")
            info = tarfile.TarInfo(name=path)
            info.size = len(data)
            info.mtime = int(time.time())
            tar.addfile(info, io.BytesIO(data))

    buffer.seek(0)
    return buffer.read()


def _read_port_mapping(container) -> Dict[str, Optional[int]]:
    container.reload()
    ports_info = container.attrs.get("NetworkSettings", {}).get("Ports") or {}
    mapping: Dict[str, Optional[int]] = {}

    for port in TERMINAL_CANDIDATE_PORTS:
        entry = ports_info.get(f"{port}/tcp")
        mapping[str(port)] = int(entry[0]["HostPort"]) if entry else None

    return mapping


def _canonicalize(raw: bytes) -> str:
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError:
        return f"data:application/octet-stream;base64,{base64.b64encode(raw).decode('ascii')}"


def _content_hash(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def _is_excluded_path(path: str) -> bool:
    return any(part in TERMINAL_SYNC_EXCLUDED_DIR_NAMES for part in path.split("/"))


def _seed_sync_state(files: List[dict]) -> Dict[str, str]:
    seeded: Dict[str, str] = {}

    for file in files:
        path = (file.get("path") or "").strip()

        if not path or path.startswith("/") or ".." in path.split("/") or _is_excluded_path(path):
            continue

        raw = _file_bytes(file.get("content") or "")

        if len(raw) > TERMINAL_SYNC_MAX_FILE_SIZE_BYTES:
            continue

        seeded[path] = _content_hash(_canonicalize(raw))

    return seeded


def _read_workspace_files(container) -> Dict[str, str]:
    stream, _stat = container.get_archive("/workspace")
    buffer = io.BytesIO()

    for chunk in stream:
        buffer.write(chunk)

    buffer.seek(0)
    files: Dict[str, str] = {}

    with tarfile.open(fileobj=buffer, mode="r") as tar:
        for member in tar.getmembers():
            if not member.isfile():
                continue

            name = member.name

            if name.startswith("workspace/"):
                name = name[len("workspace/") :]
            elif name == "workspace":
                continue

            if not name or _is_excluded_path(name) or member.size > TERMINAL_SYNC_MAX_FILE_SIZE_BYTES:
                continue

            extracted = tar.extractfile(member)

            if extracted is None:
                continue

            files[name] = _canonicalize(extracted.read())

    return files


def mint_backend_token(user_id: str) -> str:
    now = int(time.time())
    payload = {"sub": user_id, "type": "access", "iat": now, "exp": now + 300}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def _backend_headers(user_id: str) -> dict:
    return {
        "Authorization": f"Bearer {mint_backend_token(user_id)}",
        "Content-Type": "application/json",
    }


def _flatten_tree_file_ids(nodes: List[dict]) -> Dict[str, str]:
    result: Dict[str, str] = {}

    for node in nodes:
        if node.get("type") == "file" and node.get("id"):
            result[node["path"]] = node["id"]

        if node.get("children"):
            result.update(_flatten_tree_file_ids(node["children"]))

    return result


def sync_workspace(session_id: str) -> dict:
    result = {"created": 0, "updated": 0, "deleted": 0, "skipped": 0}
    record = _sessions.get(session_id)

    if not record:
        return result

    container = record["container"]
    repo_id = record["repo_id"]
    user_id = record["user_id"]

    try:
        current_files = _read_workspace_files(container)
    except DockerException:
        return result

    previous_hashes = _sync_state.get(session_id, {})
    current_hashes = {path: _content_hash(content) for path, content in current_files.items()}

    changed_paths = [path for path, digest in current_hashes.items() if previous_hashes.get(path) != digest]
    removed_paths = [path for path in previous_hashes if path not in current_hashes]

    if changed_paths or removed_paths:
        try:
            file_ids = _fetch_repo_file_ids(repo_id, user_id)
            headers = _backend_headers(user_id)

            for path in changed_paths:
                existing_id = file_ids.get(path)

                try:
                    if existing_id:
                        response = requests.patch(
                            f"{BACKEND_API_URL}/repos/{repo_id}/files/{existing_id}",
                            headers=headers,
                            json={"content": current_files[path], "summary": "Updated from terminal"},
                            timeout=10,
                        )
                    else:
                        response = requests.post(
                            f"{BACKEND_API_URL}/repos/{repo_id}/files",
                            headers=headers,
                            json={"path": path, "content": current_files[path], "summary": "Created from terminal"},
                            timeout=10,
                        )

                    if response.status_code >= 400:
                        result["skipped"] += 1
                    else:
                        result["updated" if existing_id else "created"] += 1
                except requests.RequestException:
                    result["skipped"] += 1

            for path in removed_paths:
                existing_id = file_ids.get(path)

                if not existing_id:
                    continue

                try:
                    response = requests.delete(
                        f"{BACKEND_API_URL}/repos/{repo_id}/files/{existing_id}",
                        headers=headers,
                        timeout=10,
                    )
                    result["deleted" if response.status_code < 400 else "skipped"] += 1
                except requests.RequestException:
                    result["skipped"] += 1
        except requests.RequestException:
            return result

    _sync_state[session_id] = current_hashes
    return result


def _fetch_repo_file_ids(repo_id: str, user_id: str) -> Dict[str, str]:
    response = requests.get(
        f"{BACKEND_API_URL}/repos/{repo_id}/files/tree",
        headers=_backend_headers(user_id),
        timeout=10,
    )
    response.raise_for_status()
    return _flatten_tree_file_ids(response.json())


def create_session(repo_id: str, repo_name: str, files: List[dict], user_id: str) -> dict:
    client = _get_client()

    try:
        ensure_image(client)
    except DockerException as error:
        raise RunnerUnavailableError(f"Could not build the terminal image: {error}") from error

    port_bindings = {f"{port}/tcp": None for port in TERMINAL_CANDIDATE_PORTS}

    try:
        container = client.containers.create(
            image=TERMINAL_IMAGE_TAG,
            command="bash",
            tty=True,
            stdin_open=True,
            detach=True,
            working_dir="/workspace",
            mem_limit=TERMINAL_MEMORY_LIMIT,
            nano_cpus=int(TERMINAL_CPU_LIMIT * 1_000_000_000),
            pids_limit=TERMINAL_PIDS_LIMIT,
            ports=port_bindings,
            labels={"repo_id": repo_id, "repo_name": repo_name, "user_id": user_id},
        )

        tar_bytes = _build_tar(files)
        if tar_bytes:
            container.put_archive("/workspace", tar_bytes)

        container.start()
    except DockerException as error:
        raise RunnerUnavailableError(f"Could not start terminal session: {error}") from error

    session_id = str(uuid.uuid4())
    now = time.time()
    _sessions[session_id] = {
        "container": container,
        "repo_id": repo_id,
        "user_id": user_id,
        "created_at": now,
        "last_active_at": now,
    }
    _sync_state[session_id] = _seed_sync_state(files)

    return {
        "session_id": session_id,
        "host": get_host_ip(),
        "ports": _read_port_mapping(container),
    }


def get_session(session_id: str) -> dict:
    record = _sessions.get(session_id)

    if not record:
        raise TerminalError("Unknown or expired terminal session")

    record["last_active_at"] = time.time()
    return record


def touch_session(session_id: str) -> None:
    record = _sessions.get(session_id)
    if record:
        record["last_active_at"] = time.time()


def get_ports(session_id: str) -> dict:
    record = get_session(session_id)
    container = record["container"]
    return {
        "session_id": session_id,
        "host": get_host_ip(),
        "ports": _read_port_mapping(container),
    }


def attach_pty_socket(session_id: str):
    record = get_session(session_id)
    container = record["container"]
    return container.attach_socket(params={"stdin": 1, "stdout": 1, "stderr": 1, "stream": 1})


def resize_session(session_id: str, rows: int, cols: int) -> None:
    record = get_session(session_id)
    try:
        record["container"].resize(height=rows, width=cols)
    except DockerException:
        pass


def destroy_session(session_id: str) -> None:
    record = _sessions.pop(session_id, None)
    _sync_state.pop(session_id, None)

    if not record:
        return

    container = record["container"]

    try:
        container.stop(timeout=2)
    except DockerException:
        pass

    try:
        container.remove(force=True)
    except DockerException:
        pass


def reap_idle_sessions() -> None:
    now = time.time()
    stale_ids = [
        session_id
        for session_id, record in _sessions.items()
        if now - record["last_active_at"] > TERMINAL_IDLE_TIMEOUT_SECONDS
    ]

    for session_id in stale_ids:
        destroy_session(session_id)
