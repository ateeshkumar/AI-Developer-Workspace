import asyncio
import json
import threading

from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect

import terminal_service
from auth import AuthError, verify_access_token
from config import AUTO_INDEX_ON_STARTUP, OLLAMA_BASE_URL, TERMINAL_SYNC_INTERVAL_SECONDS, ensure_directories
from docker_runner import CodeExecutionError, RunnerUnavailableError, execute_code
from llm_client import LocalModelError
from rag_engine import ensure_index, run_pr_review, run_task
from repo_indexer import get_index_summary, index_repo_files, index_repositories
from schemas import (
    AIRequest,
    AIResponse,
    CreateTerminalSessionRequest,
    DiffStats,
    ExecuteRequest,
    ExecuteResponse,
    IndexRepoRequest,
    IndexRequest,
    PRReviewRequest,
    PRReviewResponse,
    TerminalSessionResponse,
)
from diff_analyzer import analyze_diff
from terminal_service import TerminalError


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

    async def reap_loop() -> None:
        while True:
            await asyncio.sleep(60)
            terminal_service.reap_idle_sessions()

    asyncio.create_task(reap_loop())


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


@app.post("/ai/index-repo")
def ai_index_repo(payload: IndexRepoRequest):
    try:
        return index_repo_files(
            payload.repo_id,
            payload.repo_name,
            [f.model_dump() for f in payload.files],
        )
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


@app.post("/terminal/sessions", response_model=TerminalSessionResponse)
def create_terminal_session(payload: CreateTerminalSessionRequest):
    try:
        return terminal_service.create_session(
            payload.repo_id,
            payload.repo_name,
            [f.model_dump() for f in payload.files],
            payload.user_id,
        )
    except RunnerUnavailableError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except TerminalError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@app.get("/terminal/sessions/{session_id}/ports", response_model=TerminalSessionResponse)
def get_terminal_session_ports(session_id: str):
    try:
        return terminal_service.get_ports(session_id)
    except TerminalError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@app.delete("/terminal/sessions/{session_id}")
def delete_terminal_session(session_id: str):
    terminal_service.destroy_session(session_id)
    return {"destroyed": True}


@app.websocket("/terminal/{session_id}")
async def terminal_socket(websocket: WebSocket, session_id: str, token: str = Query(...)):
    try:
        verify_access_token(token)
    except AuthError:
        await websocket.close(code=4401)
        return

    try:
        terminal_service.get_session(session_id)
    except TerminalError:
        await websocket.close(code=4404)
        return

    await websocket.accept()

    docker_socket = terminal_service.attach_pty_socket(session_id)
    raw_sock = docker_socket._sock  # noqa: SLF001 - documented docker-py pattern for raw attach streams

    loop = asyncio.get_event_loop()
    stop_event = threading.Event()

    def read_from_container() -> None:
        try:
            while not stop_event.is_set():
                chunk = raw_sock.recv(4096)
                if not chunk:
                    break
                asyncio.run_coroutine_threadsafe(websocket.send_bytes(chunk), loop)
        except OSError:
            pass

    reader_thread = threading.Thread(target=read_from_container, daemon=True)
    reader_thread.start()

    async def sync_loop() -> None:
        while True:
            await asyncio.sleep(TERMINAL_SYNC_INTERVAL_SECONDS)
            await asyncio.to_thread(terminal_service.sync_workspace, session_id)

    sync_task = asyncio.create_task(sync_loop())

    try:
        while True:
            message = await websocket.receive_text()

            try:
                payload = json.loads(message)
            except json.JSONDecodeError:
                continue

            if payload.get("type") == "input":
                raw_sock.send(str(payload.get("data", "")).encode())
            elif payload.get("type") == "resize":
                terminal_service.resize_session(
                    session_id, int(payload.get("rows", 24)), int(payload.get("cols", 80))
                )

            terminal_service.touch_session(session_id)
    except WebSocketDisconnect:
        pass
    finally:
        sync_task.cancel()
        stop_event.set()
        try:
            raw_sock.close()
        except OSError:
            pass
