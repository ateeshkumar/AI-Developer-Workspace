import hashlib
import json
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, List

from config import (
    CHUNK_OVERLAP,
    CHUNK_SIZE,
    DEFAULT_INCLUDE_DIRS,
    EMBEDDING_MANIFEST_PATH,
    EXCLUDED_DIR_NAMES,
    PROJECT_ROOT,
    SUPPORTED_EXTENSIONS,
    SUPPORTED_FILENAMES,
)
from llm_client import embed_text
import vector_store


@dataclass
class Chunk:
    repo_name: str
    file_path: str
    rel_path: str
    chunk_index: int
    start_line: int
    end_line: int
    content: str
    file_hash: str


def _should_index_file(path: Path) -> bool:
    if path.suffix.lower() in SUPPORTED_EXTENSIONS:
        return True

    stem = path.name.lower()
    return stem in SUPPORTED_FILENAMES


def _iter_source_files(root_paths: Iterable[Path]) -> Iterable[Path]:
    for root in root_paths:
        if not root.exists():
            continue

        for path in root.rglob("*"):
            if path.is_dir():
                continue

            if any(part in EXCLUDED_DIR_NAMES for part in path.parts):
                continue

            if not _should_index_file(path):
                continue

            yield path


def _read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return path.read_text(encoding="utf-8", errors="ignore")


def _hash_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _build_chunks(repo_name: str, path_str: str, rel_path: str, text: str) -> List[Chunk]:
    lines = text.splitlines() or [""]
    chunks: List[Chunk] = []
    current_lines: List[str] = []
    current_length = 0
    start_line = 1
    file_hash = _hash_text(text)

    for line_number, line in enumerate(lines, start=1):
        line_length = len(line) + 1

        if current_lines and current_length + line_length > CHUNK_SIZE:
            content = "\n".join(current_lines).strip()
            if content:
                chunks.append(
                    Chunk(
                        repo_name=repo_name,
                        file_path=path_str,
                        rel_path=rel_path,
                        chunk_index=len(chunks),
                        start_line=start_line,
                        end_line=line_number - 1,
                        content=content,
                        file_hash=file_hash,
                    )
                )

            overlap_text = content[-CHUNK_OVERLAP:] if content else ""
            current_lines = [overlap_text] if overlap_text else []
            current_length = len(overlap_text)
            start_line = line_number

        current_lines.append(line)
        current_length += line_length

    final_content = "\n".join(current_lines).strip()
    if final_content:
        chunks.append(
            Chunk(
                repo_name=repo_name,
                file_path=path_str,
                rel_path=rel_path,
                chunk_index=len(chunks),
                start_line=start_line,
                end_line=len(lines),
                content=final_content,
                file_hash=file_hash,
            )
        )

    return chunks


def _split_into_chunks(repo_name: str, file_path: Path, text: str) -> List[Chunk]:
    rel_path = file_path.relative_to(PROJECT_ROOT).as_posix()
    return _build_chunks(repo_name, str(file_path), rel_path, text)


def _resolve_roots(include_dirs: List[str]) -> List[Path]:
    selected = include_dirs or list(DEFAULT_INCLUDE_DIRS)
    return [PROJECT_ROOT / item for item in selected]


def index_repositories(include_dirs: List[str] | None = None) -> dict:
    vector_store.initialize()
    vector_store.clear_index()

    roots = _resolve_roots(include_dirs or [])
    chunks: List[Chunk] = []
    indexed_files = 0

    for root in roots:
        repo_name = root.name
        for file_path in _iter_source_files([root]):
            text = _read_text(file_path)
            file_chunks = _split_into_chunks(repo_name, file_path, text)
            if file_chunks:
                indexed_files += 1
                chunks.extend(file_chunks)

    created_at = datetime.now(timezone.utc).isoformat()
    rows = []
    for chunk in chunks:
        rows.append(
            {
                "id": str(uuid.uuid4()),
                "repo_name": chunk.repo_name,
                "file_path": chunk.file_path,
                "rel_path": chunk.rel_path,
                "chunk_index": chunk.chunk_index,
                "start_line": chunk.start_line,
                "end_line": chunk.end_line,
                "content": chunk.content,
                "embedding": embed_text(chunk.content),
                "file_hash": chunk.file_hash,
                "created_at": created_at,
            }
        )

    if rows:
        vector_store.insert_chunks(rows)

    summary = {
        "indexed_files": indexed_files,
        "indexed_chunks": len(rows),
        "included_roots": [root.name for root in roots if root.exists()],
        "created_at": created_at,
    }
    vector_store.upsert_metadata("index_summary", summary)
    EMBEDDING_MANIFEST_PATH.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    return summary


def index_repo_files(repo_id: str, repo_name: str, files: List[dict]) -> dict:
    vector_store.initialize()
    vector_store.clear_index(repo_id=repo_id)

    chunks: List[Chunk] = []
    indexed_files = 0

    for file in files:
        path_str = file.get("path") or ""
        text = file.get("content") or ""

        if not path_str or text.startswith("data:"):
            continue

        file_chunks = _build_chunks(repo_name, path_str, path_str, text)
        if file_chunks:
            indexed_files += 1
            chunks.extend(file_chunks)

    created_at = datetime.now(timezone.utc).isoformat()
    rows = []
    for chunk in chunks:
        rows.append(
            {
                "id": str(uuid.uuid4()),
                "repo_name": chunk.repo_name,
                "file_path": chunk.file_path,
                "rel_path": chunk.rel_path,
                "chunk_index": chunk.chunk_index,
                "start_line": chunk.start_line,
                "end_line": chunk.end_line,
                "content": chunk.content,
                "embedding": embed_text(chunk.content),
                "file_hash": chunk.file_hash,
                "created_at": created_at,
                "repo_id": repo_id,
            }
        )

    if rows:
        vector_store.insert_chunks(rows)

    summary = {
        "indexed_files": indexed_files,
        "indexed_chunks": len(rows),
        "included_roots": [repo_name],
        "created_at": created_at,
    }
    vector_store.upsert_metadata(f"index_summary:repo:{repo_id}", summary)
    return summary


def get_index_summary() -> dict:
    vector_store.initialize()
    summary = vector_store.get_metadata("index_summary")
    if summary:
        return summary

    return {
        "indexed_files": 0,
        "indexed_chunks": 0,
        "included_roots": list(DEFAULT_INCLUDE_DIRS),
        "created_at": None,
    }
