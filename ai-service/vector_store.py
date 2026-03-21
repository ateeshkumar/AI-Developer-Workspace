import json
import math
import sqlite3
from contextlib import contextmanager
from typing import Dict, Iterable, List

from config import VECTOR_DB_PATH, ensure_directories


@contextmanager
def _connect():
    ensure_directories()
    connection = sqlite3.connect(VECTOR_DB_PATH)
    connection.row_factory = sqlite3.Row
    try:
        yield connection
        connection.commit()
    finally:
        connection.close()


def initialize() -> None:
    with _connect() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS chunks (
                id TEXT PRIMARY KEY,
                repo_name TEXT NOT NULL,
                file_path TEXT NOT NULL,
                rel_path TEXT NOT NULL,
                chunk_index INTEGER NOT NULL,
                start_line INTEGER NOT NULL,
                end_line INTEGER NOT NULL,
                content TEXT NOT NULL,
                embedding TEXT NOT NULL,
                file_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS metadata (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
            """
        )


def clear_index() -> None:
    with _connect() as connection:
        connection.execute("DELETE FROM chunks")


def upsert_metadata(key: str, value: Dict) -> None:
    with _connect() as connection:
        connection.execute(
            """
            INSERT INTO metadata(key, value)
            VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
            """,
            (key, json.dumps(value)),
        )


def get_metadata(key: str) -> Dict:
    with _connect() as connection:
        row = connection.execute(
            "SELECT value FROM metadata WHERE key = ?",
            (key,),
        ).fetchone()

    return json.loads(row["value"]) if row else {}


def insert_chunks(rows: Iterable[Dict]) -> None:
    with _connect() as connection:
        connection.executemany(
            """
            INSERT INTO chunks(
                id,
                repo_name,
                file_path,
                rel_path,
                chunk_index,
                start_line,
                end_line,
                content,
                embedding,
                file_hash,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                (
                    row["id"],
                    row["repo_name"],
                    row["file_path"],
                    row["rel_path"],
                    row["chunk_index"],
                    row["start_line"],
                    row["end_line"],
                    row["content"],
                    json.dumps(row["embedding"]),
                    row["file_hash"],
                    row["created_at"],
                )
                for row in rows
            ],
        )


def chunk_count() -> int:
    with _connect() as connection:
        row = connection.execute("SELECT COUNT(*) AS count FROM chunks").fetchone()
    return int(row["count"])


def _cosine_similarity(a: List[float], b: List[float]) -> float:
    dot_product = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))

    if norm_a == 0 or norm_b == 0:
        return 0.0

    return dot_product / (norm_a * norm_b)


def search(query_embedding: List[float], limit: int = 6) -> List[Dict]:
    with _connect() as connection:
        rows = connection.execute(
            """
            SELECT
                id,
                repo_name,
                file_path,
                rel_path,
                chunk_index,
                start_line,
                end_line,
                content,
                embedding
            FROM chunks
            """
        ).fetchall()

    scored_rows = []
    for row in rows:
        embedding = json.loads(row["embedding"])
        scored_rows.append(
            {
                "id": row["id"],
                "repo_name": row["repo_name"],
                "file_path": row["file_path"],
                "rel_path": row["rel_path"],
                "chunk_index": row["chunk_index"],
                "start_line": row["start_line"],
                "end_line": row["end_line"],
                "content": row["content"],
                "score": _cosine_similarity(query_embedding, embedding),
            }
        )

    scored_rows.sort(key=lambda item: item["score"], reverse=True)
    return scored_rows[:limit]
