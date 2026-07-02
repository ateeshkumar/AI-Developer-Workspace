from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class IndexRequest(BaseModel):
    include_dirs: List[str] = Field(default_factory=list)


class IndexRepoFile(BaseModel):
    path: str
    content: str


class IndexRepoRequest(BaseModel):
    repo_id: str
    repo_name: str
    files: List[IndexRepoFile] = Field(default_factory=list)


class SourceChunk(BaseModel):
    repo_name: str
    rel_path: str
    chunk_index: int
    start_line: int
    end_line: int
    score: float
    content: str


class AIRequest(BaseModel):
    question: str = ""
    repo_paths: List[str] = Field(default_factory=list)
    top_k: int = 6
    target: Optional[str] = None
    code: Optional[str] = None
    diff: Optional[str] = None
    instructions: Optional[str] = None
    repo_id: Optional[str] = None


class AIResponse(BaseModel):
    answer: str
    model: str
    embedding_model: str
    indexed_files: int
    indexed_chunks: int
    sources: List[SourceChunk]
    prompt_preview: str
    extra: Optional[Any] = None


class PRReviewRequest(BaseModel):
    title: str = "Untitled PR"
    question: str = "Review this code change like a senior engineer."
    file_path: str = "unknown"
    old_code: str
    new_code: str
    repo_paths: List[str] = Field(default_factory=list)
    top_k: int = 6
    instructions: Optional[str] = None


class PRFinding(BaseModel):
    severity: str
    category: str
    title: str
    details: str


class DiffStats(BaseModel):
    file_path: str
    additions: int
    deletions: int
    changed_lines: int
    changed_hunks: int
    unified_diff: str


class PRReviewResponse(BaseModel):
    summary: str
    bugs: List[PRFinding]
    suggestions: List[PRFinding]
    diff: DiffStats
    model: str
    embedding_model: str
    indexed_files: int
    indexed_chunks: int
    sources: List[SourceChunk]
    prompt_preview: str
    extra: Optional[Any] = None


class TerminalFile(BaseModel):
    path: str
    content: str


class CreateTerminalSessionRequest(BaseModel):
    repo_id: str
    repo_name: str
    user_id: str
    files: List[TerminalFile] = Field(default_factory=list)


class TerminalSessionResponse(BaseModel):
    session_id: str
    host: str
    ports: Dict[str, Optional[int]]


class ExecuteRequest(BaseModel):
    language: str
    code: str
    stdin: str = ""
    timeout_seconds: int = 10


class ExecuteResponse(BaseModel):
    language: str
    exit_code: int
    stdout: str
    stderr: str
    timed_out: bool
    command: str
    image: str
