# AI Service

Local-first AI senior engineer assistant built with FastAPI.

It does not use API keys. Instead, it expects your own local model server, such as Ollama.

## Features

- Code indexing across `my-backend` and `my-frontend` (global, filesystem-based) **and** per-repo indexing of database-backed repo content (`my-backend` fetches a repo's files from Postgres and hands them directly to this service — see "Repo-Scoped Indexing" below)
- Chunking source files into retrieval units
- Generating embeddings with a local embedding model
- Storing vectors in a local SQLite database
- RAG query pipeline:
  - query to embedding
  - vector search (optionally scoped to one `repo_id`)
  - context assembly
  - local LLM response
- Interactive terminal sessions: spawns a real, sandboxed Docker container per repo with materialized file content, an attached PTY over a JWT-gated WebSocket, and dynamic port publishing for live-previewing whatever the session runs — see "Terminal Sessions" below
- APIs:
  - `POST /ai/index`
  - `POST /ai/index-repo`
  - `POST /ai/query`
  - `POST /ai/explain`
  - `POST /ai/review`
  - `POST /ai/refactor`
  - `POST /ai/diff-analyze`
  - `POST /ai/pr-review`
  - `POST /execute`
  - `POST /terminal/sessions`
  - `GET /terminal/sessions/{session_id}/ports`
  - `DELETE /terminal/sessions/{session_id}`
  - `WS /terminal/{session_id}`

## Folder Layout

```text
ai-service/
├── main.py
├── auth.py               # JWT verification for the terminal WebSocket
├── config.py
├── llm_client.py
├── rag_engine.py
├── repo_indexer.py
├── terminal_service.py   # container lifecycle, file materialization, PTY bridging
├── terminal-image/       # Dockerfile for the terminal session image (auto-built on first use)
├── docker_runner.py       # one-shot sandboxed /execute (unrelated to terminal_service.py)
├── schemas.py
├── vector_store.py
├── embeddings/
├── vector-db/
├── requirements.txt
└── README.md
```

## Local Model Requirement

This service is designed for local AI usage. The default target is Ollama at:

```text
http://127.0.0.1:11434
```

Recommended local models:

```bash
ollama pull qwen2.5-coder:7b
ollama pull nomic-embed-text
```

You can change models with environment variables.

When this service is run through the root `docker-compose.yml`, Ollama is bundled as its own `ollama` service and `OLLAMA_BASE_URL` is set to `http://ollama:11434` automatically — no host setup required. The `127.0.0.1` default above only applies when running `ai-service` directly on the host (see "Run" below), where you still need Ollama installed and running yourself.

## Repo-Scoped Indexing

Repos created/imported in this app live entirely in `my-backend`'s Postgres database — there is nothing on disk for this service's filesystem-based indexer to see. `POST /ai/index-repo` accepts a repo's files directly (`{repo_id, repo_name, files: [{path, content}]}`), chunks and embeds them, and stores them tagged with `repo_id` in the same SQLite `chunks` table used by the global filesystem index. `my-backend` triggers this via `POST /api/repos/:repoId/index`, which fetches the repo's current file content from Postgres and proxies it here — this service never talks to Postgres or calls back into the backend's REST API itself.

Passing an optional `repo_id` on `/ai/query` (and `/ai/explain`, `/ai/review`, `/ai/refactor`) scopes retrieval to that repo's indexed chunks instead of the global index. Omitting it preserves the original whole-project behavior unchanged.

## Terminal Sessions

`ai-service` can spawn a real, persistent, sandboxed container per repo with an attached interactive shell — this is what backs the frontend's terminal panel and live-preview links.

**How it works:**
1. `POST /terminal/sessions` (called by `my-backend`, which supplies the repo's files from Postgres the same way indexing does) creates a container from a custom `workspace-terminal` image (Debian-based, with `bash`/`git`/`node`/`python3`/`pip` — built automatically on first use from `terminal-image/Dockerfile`, no manual step required).
2. Repo files are written into the container via Docker's `put_archive` API (an in-memory tar), **not** a bind mount. This service mounts the *host's* Docker socket to talk to the host daemon (Docker-outside-of-Docker) — any bind-mount path it specified would resolve on the host filesystem, not its own, so files are streamed in directly instead.
3. A small fixed set of common dev-server ports (`3000, 5173, 4200, 8080, 5000, 8000`) are published to dynamically-assigned host ports up front, since there's no way to know in advance which port a given project's dev server will bind.
4. The frontend attaches to `WS /terminal/{session_id}?token=<access_token>` for a real, bidirectional PTY stream (JSON control messages for input/resize from the client, raw bytes for output from the server).
5. Idle sessions (no WebSocket traffic for `TERMINAL_IDLE_TIMEOUT_SECONDS`) are reaped automatically by a background loop.

**Security note:** unlike the rest of this service (which has no authentication, by design, as an internal service normally reached only through `my-backend`'s proxy), the terminal WebSocket **is** JWT-gated — it verifies the same access token the rest of the app issues, using a `JWT_SECRET` shared with `my-backend`. A persistent interactive shell is a meaningfully bigger exposure than the one-shot `/execute` sandbox below, so this endpoint gets an explicit auth check even though nothing else here does.

**Requirements:** the host's Docker socket must be mounted into this container (`docker-compose.yml` already does this: `/var/run/docker.sock:/var/run/docker.sock`). This grants the service control over the host's Docker daemon — standard for local dev tools that need to run arbitrary containers, but worth knowing if you ever deploy this beyond a local/personal environment.

**Preview URLs and `HOST_PUBLIC_IP`:** the reported preview host defaults to `localhost`, since a container-internal "detect my outbound IP" trick would return this service's own Docker-bridge address (unreachable from a browser), not the real Docker host's address. `localhost` is correct when the browser runs on the same machine as Docker Desktop. If your browser is on a different machine (LAN access, a remote VM, a devcontainer), set `HOST_PUBLIC_IP` explicitly to an address that machine can actually reach.

## Safe Code Runner

The service also includes a Docker-based execution API for running untrusted snippets more safely.

Supported languages:

- JavaScript
- Python

Safety defaults:

- Docker container per execution
- no container network access
- read-only filesystem
- temporary `/tmp`
- CPU limit
- memory limit
- process count limit
- execution timeout
- output truncation

## Environment Variables

```env
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_CHAT_MODEL=qwen2.5-coder:7b
OLLAMA_EMBED_MODEL=nomic-embed-text
OLLAMA_TIMEOUT_SECONDS=300
AI_INCLUDE_DIRS=my-backend,my-frontend
AI_CHUNK_SIZE=1400
AI_CHUNK_OVERLAP=200
AI_TOP_K=6
AI_AUTO_INDEX_ON_STARTUP=false
RUNNER_TIMEOUT_SECONDS=10
RUNNER_MEMORY_LIMIT=256m
RUNNER_CPU_LIMIT=0.5
RUNNER_PIDS_LIMIT=64
RUNNER_OUTPUT_LIMIT=20000
JWT_SECRET=supersecret
HOST_PUBLIC_IP=
TERMINAL_IMAGE_TAG=workspace-terminal:latest
TERMINAL_MEMORY_LIMIT=256m
TERMINAL_CPU_LIMIT=0.5
TERMINAL_PIDS_LIMIT=128
TERMINAL_IDLE_TIMEOUT_SECONDS=1800
```

`JWT_SECRET` must match `my-backend`'s `JWT_SECRET` exactly — it's what lets this service verify the same access tokens the rest of the app issues, for the terminal WebSocket only.

## Run

From `d:\project\ai-service`:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## API Examples

### Index Codebase

```bash
curl -X POST http://127.0.0.1:8000/ai/index ^
  -H "Content-Type: application/json" ^
  -d "{\"include_dirs\":[\"my-backend\",\"my-frontend\"]}"
```

### Ask a General Question

```bash
curl -X POST http://127.0.0.1:8000/ai/query ^
  -H "Content-Type: application/json" ^
  -d "{\"question\":\"How does authentication work in this codebase?\"}"
```

### Explain Code

```bash
curl -X POST http://127.0.0.1:8000/ai/explain ^
  -H "Content-Type: application/json" ^
  -d "{\"question\":\"Explain the file versioning flow\",\"target\":\"my-backend/src/services/file.service.js\"}"
```

### Review Code

```bash
curl -X POST http://127.0.0.1:8000/ai/review ^
  -H "Content-Type: application/json" ^
  -d "{\"question\":\"Review the collaboration gateway for backend risks\"}"
```

### Refactor Guidance

```bash
curl -X POST http://127.0.0.1:8000/ai/refactor ^
  -H "Content-Type: application/json" ^
  -d "{\"question\":\"Refactor auth and workspace role checks to reduce duplication\"}"
```

### Analyze a Diff

```bash
curl -X POST http://127.0.0.1:8000/ai/diff-analyze ^
  -H "Content-Type: application/json" ^
  -d "{\"title\":\"auth cleanup\",\"file_path\":\"my-backend/src/services/auth.service.js\",\"old_code\":\"const a = 1;\",\"new_code\":\"const a = 2;\"}"
```

### AI PR Review

```bash
curl -X POST http://127.0.0.1:8000/ai/pr-review ^
  -H "Content-Type: application/json" ^
  -d "{\"title\":\"Improve auth flow\",\"question\":\"Review this change like a senior engineer\",\"file_path\":\"my-backend/src/services/auth.service.js\",\"old_code\":\"function login() { return true; }\",\"new_code\":\"function login(user) { if (!user) return true; return true; }\"}"
```

Response shape:

```json
{
  "summary": "High-level review summary",
  "bugs": [
    {
      "severity": "high",
      "category": "logic",
      "title": "Missing null handling",
      "details": "..."
    }
  ],
  "suggestions": [
    {
      "severity": "medium",
      "category": "maintainability",
      "title": "Add test coverage",
      "details": "..."
    }
  ],
  "diff": {
    "file_path": "my-backend/src/services/auth.service.js",
    "additions": 3,
    "deletions": 1,
    "changed_lines": 4,
    "changed_hunks": 1,
    "unified_diff": "--- ..."
  }
}
```

### Execute JavaScript

```bash
curl -X POST http://127.0.0.1:8000/execute ^
  -H "Content-Type: application/json" ^
  -d "{\"language\":\"javascript\",\"code\":\"console.log('hello from js')\"}"
```

### Execute Python

```bash
curl -X POST http://127.0.0.1:8000/execute ^
  -H "Content-Type: application/json" ^
  -d "{\"language\":\"python\",\"code\":\"print('hello from python')\"}"
```

Example response:

```json
{
  "language": "python",
  "exit_code": 0,
  "stdout": "hello from python\n",
  "stderr": "",
  "timed_out": false,
  "command": "python /workspace/main.py",
  "image": "python:3.11-alpine"
}
```

### Create a Terminal Session

```bash
curl -X POST http://127.0.0.1:8000/terminal/sessions ^
  -H "Content-Type: application/json" ^
  -d "{\"repo_id\":\"repo-123\",\"repo_name\":\"my-repo\",\"user_id\":\"user-456\",\"files\":[{\"path\":\"index.html\",\"content\":\"<h1>hi</h1>\"}]}"
```

Example response:

```json
{
  "session_id": "34a2d3a3-e319-488e-bddd-5d58e2fa16e2",
  "host": "localhost",
  "ports": {
    "3000": 53000,
    "5173": 52998,
    "4200": 53002,
    "8080": 52999,
    "5000": 53003,
    "8000": 53001
  }
}
```

Connect a terminal client to `ws://127.0.0.1:8000/terminal/{session_id}?token=<access_token>`. Client messages are JSON text frames (`{"type":"input","data":"ls\n"}` or `{"type":"resize","rows":24,"cols":80}`); server output arrives as raw binary frames.

## Notes

- The vector database is stored at `ai-service/vector-db/index.sqlite3`
- The latest index summary is stored at `ai-service/embeddings/latest-index.json`
- If the local model server is unavailable, the FastAPI app still boots, but AI routes return `503`
- The Docker runner (`/execute`) and terminal sessions (`/terminal/*`) both require Docker daemon access and the runtime images to be pullable/buildable the first time
- `requirements.txt` includes `websockets` explicitly — plain `uvicorn` does not bundle WebSocket support, and without it every `/terminal/{session_id}` connection fails with a silent `404` during the upgrade handshake
- On CPU-only hosts, generation with a full RAG context (retrieved source chunks + question) can take well over a minute for `qwen2.5-coder:7b`. `OLLAMA_TIMEOUT_SECONDS` (default `300`) controls how long `ai-service` waits before giving up on a model response
