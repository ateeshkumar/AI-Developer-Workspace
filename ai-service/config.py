import os
from pathlib import Path


SERVICE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = Path(os.getenv("AI_PROJECT_ROOT", str(SERVICE_DIR.parent))).resolve()
VECTOR_DB_DIR = SERVICE_DIR / "vector-db"
EMBEDDINGS_DIR = SERVICE_DIR / "embeddings"
VECTOR_DB_PATH = VECTOR_DB_DIR / "index.sqlite3"
EMBEDDING_MANIFEST_PATH = EMBEDDINGS_DIR / "latest-index.json"

DEFAULT_INCLUDE_DIRS = tuple(
    part.strip()
    for part in os.getenv("AI_INCLUDE_DIRS", "my-backend,my-frontend").split(",")
    if part.strip()
)

EXCLUDED_DIR_NAMES = {
    ".git",
    ".idea",
    ".vscode",
    "__pycache__",
    "node_modules",
    "generated",
    "dist",
    "build",
    "coverage",
    "vector-db",
    "embeddings",
}

SUPPORTED_EXTENSIONS = {
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".py",
    ".json",
    ".md",
    ".css",
    ".html",
    ".sql",
    ".prisma",
    ".yml",
    ".yaml",
    ".env",
}

SUPPORTED_FILENAMES = {
    "dockerfile",
    "makefile",
    "readme",
}

CHUNK_SIZE = int(os.getenv("AI_CHUNK_SIZE", "1400"))
CHUNK_OVERLAP = int(os.getenv("AI_CHUNK_OVERLAP", "200"))
TOP_K = int(os.getenv("AI_TOP_K", "6"))
AUTO_INDEX_ON_STARTUP = os.getenv("AI_AUTO_INDEX_ON_STARTUP", "false").lower() == "true"

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
OLLAMA_CHAT_MODEL = os.getenv("OLLAMA_CHAT_MODEL", "qwen2.5-coder:7b")
OLLAMA_EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")

RUNNER_TIMEOUT_SECONDS = int(os.getenv("RUNNER_TIMEOUT_SECONDS", "10"))
RUNNER_MEMORY_LIMIT = os.getenv("RUNNER_MEMORY_LIMIT", "256m")
RUNNER_CPU_LIMIT = os.getenv("RUNNER_CPU_LIMIT", "0.5")
RUNNER_PIDS_LIMIT = int(os.getenv("RUNNER_PIDS_LIMIT", "64"))
RUNNER_OUTPUT_LIMIT = int(os.getenv("RUNNER_OUTPUT_LIMIT", "20000"))


def ensure_directories() -> None:
    VECTOR_DB_DIR.mkdir(parents=True, exist_ok=True)
    EMBEDDINGS_DIR.mkdir(parents=True, exist_ok=True)
