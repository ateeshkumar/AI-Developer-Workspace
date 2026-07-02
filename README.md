# Full Project Workspace

This workspace contains three main apps:

- [my-frontend](D:/project/my-frontend): React + Vite frontend
- [my-backend](D:/project/my-backend): Node.js + Express + Prisma backend
- [ai-service](D:/project/ai-service): FastAPI local AI assistant and Docker code runner

## Architecture

### Frontend

- React 19, TypeScript, Vite, Tailwind
- Route-owned data/state (React Router for navigation identity, React Query for server state, Context only for genuinely app-wide auth state — no global editor store)
- Monaco editor, `react-markdown` for AI answers, `@xterm/xterm` for the terminal panel
- Served through Nginx in Docker
- See [my-frontend/README.md](D:/project/my-frontend/README.md) for the full architecture

### Backend

- Express API
- Prisma 7
- PostgreSQL
- JWT auth
- workspace/repo/file/version/commit APIs
- WebSocket collaboration gateway
- GitHub two-way sync (PAT-based connect, import, pull, and squashed-commit push via the GitHub Git Data API)

### AI Service

- FastAPI
- local-first RAG service
- code indexing for backend + frontend, plus per-repo indexing of database-backed repos (fed directly by the backend, not filesystem-based)
- PR review and diff analysis
- Docker-backed one-shot code execution API (`/execute`)
- Interactive terminal sessions: a real sandboxed container per repo with an attached PTY over a JWT-gated WebSocket, and dynamic port publishing for live-previewing whatever the session runs (requires the host's Docker socket mounted in)

## Project Tree

```text
project/
├── ai-service/
├── my-backend/
├── my-frontend/
├── docker-compose.yml
└── README.md
```

## Ports

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000`
- AI Service: `http://localhost:8000`
- PostgreSQL: `localhost:5432`
- Ollama: `http://localhost:11434`

## Run Everything With Docker

From the project root:

```bash
docker compose up --build
```

This starts:

- `postgres`
- `backend`
- `frontend`
- `ollama`
- `ai-service`

Stop all services:

```bash
docker compose down
```

Stop and remove volumes:

```bash
docker compose down -v
```

## Docker Services

### `postgres`

- PostgreSQL 16
- database: `ai_hit`
- user: `postgres`
- password: `postgres`

### `backend`

- builds from `my-backend/Dockerfile`
- runs `npm start`
- connects to PostgreSQL using the Compose service hostname

### `frontend`

- builds the Vite app
- serves static files with Nginx
- exposed at port `5173`

### `ollama`

- image: `ollama/ollama`
- serves the local model API on port `11434`
- pulls `qwen2.5-coder:7b` and `nomic-embed-text` on first startup
- persists downloaded models in the `ollama_data` volume

### `ai-service`

- builds from `ai-service/Dockerfile`
- serves FastAPI on port `8000`
- indexes `my-backend` and `my-frontend` through the mounted project workspace, plus per-repo indexing fed directly by `my-backend` (database-backed repos have no filesystem presence)
- stores vector DB and index artifacts in Docker volumes
- talks to the `ollama` service over the Compose network for chat/embedding models
- has the **host's Docker socket mounted in** (`/var/run/docker.sock`) so it can spawn sandboxed terminal-session containers on the host daemon — see "Important Note About the Terminal Feature" below

## Important Note About AI Models

The AI service is API-key free and self-contained: it runs its own local model server.

`docker compose up` starts an `ollama` service alongside `postgres`, `backend`, `frontend`, and `ai-service`. On first startup, `ollama` automatically pulls:

```text
qwen2.5-coder:7b
nomic-embed-text
```

This first pull downloads several GB and can take a while depending on your connection. `ai-service` waits for `ollama` to report healthy before starting, but it still queues behind the model pull for:

- `POST /ai/index`
- `POST /ai/query`
- `POST /ai/explain`
- `POST /ai/review`
- `POST /ai/refactor`
- `POST /ai/pr-review`

Until the models finish downloading, the AI service still boots, but AI routes return `503`. Model data persists in the `ollama_data` Docker volume, so subsequent `docker compose up` runs skip the download.

If you run the stack without Docker (see "Run Individually Without Docker" below), you still need Ollama installed and running on the host yourself.

## Important Note About the Terminal Feature

The frontend's terminal panel and live-preview links are backed by `ai-service` spawning real, sandboxed containers on the **host's** Docker daemon (Docker-outside-of-Docker) — `docker-compose.yml` mounts `/var/run/docker.sock` into the `ai-service` container for this. This grants `ai-service` control over your host's Docker daemon; standard for local dev tools that run arbitrary containers, but worth knowing before deploying this beyond a local/personal environment.

The terminal WebSocket is JWT-gated (unlike the rest of `ai-service`, which has no auth by design) — `JWT_SECRET` must be set identically on both `backend` and `ai-service` (already wired up in `docker-compose.yml`).

Preview links default to `http://localhost:<port>`, which is correct when your browser runs on the same machine as Docker Desktop. If your browser is elsewhere (LAN, remote VM, devcontainer), set `HOST_PUBLIC_IP` on `ai-service` to an address that machine can actually reach.

Anything created, edited, or deleted inside a terminal session (`npm install`, `touch foo.js`, editing a file with `vim`, etc.) is periodically synced back into the repo's real, versioned file system — not just a one-way snapshot at session start. `ai-service` polls the container's filesystem every `TERMINAL_SYNC_INTERVAL_SECONDS` (default `4`), diffs it, and pushes changes through `backend`'s normal file endpoints (which already broadcast over the collaboration WebSocket) — so the file tree updates live with no frontend changes needed, and common noise (`node_modules`, `.git`, `.venv`, build output) is filtered out. See [ai-service/README.md](D:/project/ai-service/README.md) for the full mechanics.

## Important Note About Safe Code Execution

`POST /execute` in `ai-service` uses Docker to run one-shot code snippets safely inside short-lived containers. Unlike the terminal feature above (which uses the `docker` Python SDK talking to the socket directly), `docker_runner.py` shells out to the `docker` **CLI binary** via `subprocess` — and that binary is not installed in the `ai-service` image. This means **`/execute` does not work out of the box even with the Docker socket now mounted for the terminal feature** (`docker inspect`/`docker run` calls fail with "Docker is not installed or not available in PATH", surfaced as a clean `400`, not a crash).

To make `/execute` work too, either:

1. Install the `docker` CLI binary in `ai-service/Dockerfile` (e.g. `apt-get install docker.io` or copy the static `docker` binary), or
2. Run `ai-service` on the host instead of inside Docker when you need `/execute`

This is a known gap, not a silent failure — `/execute` reports the missing binary explicitly rather than pretending the run succeeded.

## Recommended First-Time Setup

### 1. Start Docker Desktop

Make sure Docker Desktop is running.

### 2. Start the Stack

```bash
docker compose up --build
```

The `ollama` service pulls its models automatically on first run — check `docker compose logs -f ollama` if you want to watch progress. The first time you open a terminal session in the app, `ai-service` similarly self-builds its `workspace-terminal` image before starting the container — no manual step needed, just a one-time delay.

`ai-service` mounts your host's Docker socket (for the terminal feature). On Linux this may require your user to be in the `docker` group, or running Docker Compose with elevated permissions — Docker Desktop on Windows/Mac handles this transparently.

### 3. Initialize the AI Index

```bash
curl -X POST http://localhost:8000/ai/index ^
  -H "Content-Type: application/json" ^
  -d "{\"include_dirs\":[\"my-backend\",\"my-frontend\"]}"
```

## Useful URLs

### Frontend

```text
http://localhost:5173
```

### Backend

```text
http://localhost:3000/api/health
http://localhost:3000/ws?token=<access_token>
```

### AI Service

```text
http://localhost:8000/
http://localhost:8000/ai/status
ws://localhost:8000/terminal/<session_id>?token=<access_token>
```

## Run Individually Without Docker

### Frontend

```bash
cd my-frontend
npm install
npm run dev -- --host 0.0.0.0
```

### Backend

```bash
cd my-backend
npm install
npm run prisma:generate
npm run migrate:deploy
npm start
```

Required backend env:

```env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/ai_hit"
JWT_SECRET="your_secret"
JWT_REFRESH_SECRET="your_refresh_secret"
GITHUB_TOKEN_ENC_KEY="base64-encoded-32-byte-key"
```

### AI Service

```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Running this way, `/execute` and the terminal feature reach the Docker daemon via your local Docker Desktop installation directly — no socket-mount step needed, since there's no ai-service container in between. Set `JWT_SECRET` to the same value as the backend's if you want the terminal feature to work.

## Service READMEs

Detailed service docs are here:

- [Frontend README](D:/project/my-frontend/README.md)
- [Backend README](D:/project/my-backend/README.md)
- [AI Service README](D:/project/ai-service/README.md)

## What This Setup Gives You

- one command to run frontend, backend, database, AI service, and local model server
- production-style frontend container
- backend connected to PostgreSQL, with GitHub two-way sync and real-time collaboration
- local-model AI service with global and per-repo indexing, PR review, and one-shot code execution
- a full in-browser IDE experience: file tree, Monaco editor, AI assistant, and a real interactive terminal with live preview of whatever you run

## Next Recommended Improvements

- add frontend environment-based API base URL for non-localhost deployments
- add healthchecks for `postgres`, `backend`, and `frontend` in Docker Compose
- install the `docker` CLI binary in `ai-service`'s image so `/execute` works the same way the terminal feature already does
- add automated tests across all three services
