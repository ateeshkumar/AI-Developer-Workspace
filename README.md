# Full Project Workspace

This workspace contains three main apps:

- [my-frontend](D:/project/my-frontend): React + Vite frontend
- [my-backend](D:/project/my-backend): Node.js + Express + Prisma backend
- [ai-service](D:/project/ai-service): FastAPI local AI assistant and Docker code runner

## Architecture

### Frontend

- React 19
- Vite
- Tailwind tooling
- Served through Nginx in Docker

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
- code indexing for backend + frontend
- PR review and diff analysis
- Docker-backed code execution API

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
- indexes `my-backend` and `my-frontend` through the mounted project workspace
- stores vector DB and index artifacts in Docker volumes
- talks to the `ollama` service over the Compose network for chat/embedding models

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

## Important Note About Safe Code Execution

`POST /execute` in `ai-service` uses Docker to run code safely inside short-lived containers.

Because `ai-service` itself is running in Docker in this setup, the execution endpoint needs Docker daemon access from inside that container if you want it to actually run code there.

Current Compose setup includes the API and all wiring, but for real container execution you should use one of these options:

1. Run `ai-service` on the host instead of inside Docker when you need `/execute`
2. Mount Docker daemon access into the `ai-service` container for your platform

If Docker daemon access is unavailable, `/execute` returns a clean `503` error instead of pretending the run succeeded.

## Recommended First-Time Setup

### 1. Start Docker Desktop

Make sure Docker Desktop is running.

### 2. Start the Stack

```bash
docker compose up --build
```

The `ollama` service pulls its models automatically on first run — check `docker compose logs -f ollama` if you want to watch progress.

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

## Service READMEs

Detailed service docs are here:

- [Backend README](D:/project/my-backend/README.md)
- [AI Service README](D:/project/ai-service/README.md)

## What This Setup Gives You

- one command to run frontend, backend, database, and AI service
- production-style frontend container
- backend connected to PostgreSQL
- local-model AI service with indexing and PR review
- a base for safe code execution through Docker

## Next Recommended Improvements

- add frontend environment-based API base URL
- add healthchecks for `postgres`, `backend`, and `frontend` in Docker Compose
- add Docker daemon mount configuration for `/execute` when you want fully in-container code execution
