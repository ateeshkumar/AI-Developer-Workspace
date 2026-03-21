from fastapi import FastAPI, HTTPException

from config import AUTO_INDEX_ON_STARTUP, OLLAMA_BASE_URL, ensure_directories
from docker_runner import CodeExecutionError, RunnerUnavailableError, execute_code
from llm_client import LocalModelError
from rag_engine import ensure_index, run_pr_review, run_task
from repo_indexer import get_index_summary, index_repositories
from schemas import (
    AIRequest,
    AIResponse,
    DiffStats,
    ExecuteRequest,
    ExecuteResponse,
    IndexRequest,
    PRReviewRequest,
    PRReviewResponse,
)
from diff_analyzer import analyze_diff


app = FastAPI(
    title="AI Senior Engineer Assistant",
    version="1.0.0",
    description="Local-first RAG service for understanding and assisting across the full codebase.",
)


@app.on_event("startup")
def startup_event() -> None:
    ensure_directories()
    if AUTO_INDEX_ON_STARTUP:
        try:
            ensure_index()
        except LocalModelError:
            # The service can still boot even if local models are not ready yet.
            pass


@app.get("/")
def root():
    return {
        "service": "ai-service",
        "status": "ok",
        "local_model_base_url": OLLAMA_BASE_URL,
        "index_summary": get_index_summary(),
    }


@app.get("/ai/status")
def status():
    return {
        "status": "ok",
        "index_summary": get_index_summary(),
        "local_model_base_url": OLLAMA_BASE_URL,
    }


@app.post("/ai/index")
def ai_index(payload: IndexRequest):
    try:
        return index_repositories(payload.include_dirs)
    except LocalModelError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


@app.post("/ai/query", response_model=AIResponse)
def ai_query(payload: AIRequest):
    try:
        return run_task("query", payload.model_dump())
    except LocalModelError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


@app.post("/ai/explain", response_model=AIResponse)
def ai_explain(payload: AIRequest):
    try:
        return run_task("explain", payload.model_dump())
    except LocalModelError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


@app.post("/ai/review", response_model=AIResponse)
def ai_review(payload: AIRequest):
    try:
        return run_task("review", payload.model_dump())
    except LocalModelError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


@app.post("/ai/refactor", response_model=AIResponse)
def ai_refactor(payload: AIRequest):
    try:
        return run_task("refactor", payload.model_dump())
    except LocalModelError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


@app.post("/ai/diff-analyze", response_model=DiffStats)
def ai_diff_analyze(payload: PRReviewRequest):
    return analyze_diff(payload.old_code, payload.new_code, payload.file_path)


@app.post("/ai/pr-review", response_model=PRReviewResponse)
def ai_pr_review(payload: PRReviewRequest):
    try:
        return run_pr_review(payload.model_dump())
    except LocalModelError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


@app.post("/execute", response_model=ExecuteResponse)
def execute(payload: ExecuteRequest):
    try:
        return execute_code(
            language=payload.language,
            code=payload.code,
            stdin=payload.stdin,
            timeout_seconds=payload.timeout_seconds,
        )
    except RunnerUnavailableError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except CodeExecutionError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
