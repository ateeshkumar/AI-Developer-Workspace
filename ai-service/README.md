# AI Service

Local-first AI senior engineer assistant built with FastAPI.

It does not use API keys. Instead, it expects your own local model server, such as Ollama.

## Features

- Code indexing across `my-backend` and `my-frontend`
- Chunking source files into retrieval units
- Generating embeddings with a local embedding model
- Storing vectors in a local SQLite database
- RAG query pipeline:
  - query to embedding
  - vector search
  - context assembly
  - local LLM response
- APIs:
  - `POST /ai/index`
  - `POST /ai/query`
  - `POST /ai/explain`
  - `POST /ai/review`
  - `POST /ai/refactor`
  - `POST /ai/diff-analyze`
  - `POST /ai/pr-review`
  - `POST /execute`

## Folder Layout

```text
ai-service/
├── main.py
├── config.py
├── llm_client.py
├── rag_engine.py
├── repo_indexer.py
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
```

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

## Notes

- The vector database is stored at `ai-service/vector-db/index.sqlite3`
- The latest index summary is stored at `ai-service/embeddings/latest-index.json`
- If the local model server is unavailable, the FastAPI app still boots, but AI routes return `503`
- The Docker runner requires Docker daemon access and the runtime images to be pullable the first time
