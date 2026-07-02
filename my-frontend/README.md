# My Frontend

React + TypeScript + Vite frontend for the workspace/repo/editor app. Talks to `my-backend` over REST + WebSocket, and to `ai-service` directly for the terminal WebSocket.

## Tech Stack

- React 19, TypeScript, Vite
- Tailwind CSS
- `react-router-dom` — routing owns navigation state (workspace/repo/file identity lives in the URL, not a global store)
- `@tanstack/react-query` — server state, caching, mutations
- `@monaco-editor/react` — code editor
- `@xterm/xterm` + `@xterm/addon-fit` — interactive terminal panel
- `react-markdown` + `remark-gfm` — AI assistant answer rendering
- Native `fetch` for REST (no axios) and native `WebSocket` for realtime (no socket.io-client — the backend's `/ws` gateway is a raw `ws` server, and `ai-service`'s terminal endpoint is a raw FastAPI WebSocket)

## Architecture

This is a deliberate rewrite away from a "global store + one hook per endpoint" structure. The organizing principle: **routes own their data**, and only truly cross-cutting state (auth) lives outside a route.

```text
src/
├── app/
│   ├── router.tsx        # route tree + protected-route guard
│   ├── root-layout.tsx    # shell: top bar + outlet
│   └── providers.tsx      # QueryClientProvider + AuthProvider composition root
├── routes/
│   ├── login/
│   ├── register/
│   ├── workspaces/                # dashboard: list + create workspace
│   ├── workspace-repos/           # repo picker: list + create + import from GitHub
│   └── repo-ide/                  # the IDE itself
│       ├── repo-ide-route.tsx      # orchestrates the panes below, triggers auto-indexing
│       ├── ide-context.tsx         # Context scoped to THIS route (open file, tabs, panel state) — not global
│       ├── file-explorer.tsx       # left: file tree + Search/History/Activity/GitHub-sync tabs
│       ├── editor-pane.tsx         # middle-top: Monaco, locking, autosave
│       ├── terminal-pane.tsx       # middle-bottom: xterm.js terminal + live-preview links
│       └── assistant-pane.tsx      # right: slidable AI chat panel
├── api/
│   ├── http.ts             # fetch wrapper: auth header injection, 401 → refresh → retry
│   ├── auth.ts, workspaces.ts, repos.ts, github.ts, ai.ts, terminal.ts
│   │   # each file owns both its fetch functions AND its React Query hooks — no hooks/ vs services/ split
├── realtime/
│   ├── socket-client.ts     # raw WebSocket wrapper for the backend's /ws protocol
│   └── use-repo-presence.ts  # subscribe/presence/lock-invalidation lifecycle for one repo
├── auth/
│   ├── auth-context.tsx     # token + current user — the one genuinely app-wide piece of client state
│   ├── session-storage.ts    # localStorage persistence (also read directly by api/http.ts and realtime/)
│   └── protected-route.tsx
├── ui/                      # generic, resource-agnostic primitives (Button, Modal, Panel, Tabs, Toast, Skeleton)
└── types/api.ts             # hand-written types matching the backend's actual API contract
```

### State ownership

| State | Owner | Why |
|---|---|---|
| Access/refresh token, current user | `auth/auth-context.tsx` (Context) | Needed everywhere, rarely changes |
| workspaceId / repoId / open file path | URL (route params, `/w/:workspaceId/r/:repoId/f/*`) | Deep-linkable, survives refresh, back/forward works |
| Open editor tabs, AI/terminal panel open state | `ide-context.tsx`, scoped to the IDE route | Doesn't need to exist outside the IDE; unmounts cleanly on navigation |
| Server data (workspaces, repos, files, activity, GitHub status, AI answers) | React Query cache | Caching/invalidation is the actual hard part — no reason to hand-roll it |
| Toasts | A tiny event-emitter + a single `<ToastHost/>` | Three pieces of transient UI state don't need a store |
| Terminal session (container id, ports) | Local state inside `terminal-pane.tsx` | Only the terminal pane cares |

## Features

- Auth: register/login, JWT stored in `localStorage`, automatic refresh-and-retry on `401`
- Workspaces: create, list, open
- Repositories: create, list, **import an existing GitHub repo** (PAT-based connect flow)
- Editor: Monaco-based file editing with soft locking, autosave, version history, live collaboration (presence + remote edits via the backend's WebSocket gateway)
- File explorer: tree view, search, activity feed, file upload, GitHub pull/push controls for GitHub-linked repos
- AI assistant: slidable chat panel scoped to the currently open repo, with quick actions (Explain / Find bugs / Refactor). Opening a repo automatically triggers repo-scoped indexing in the background (session-deduped — won't re-trigger on every file open)
- **Terminal**: a real interactive shell attached to a sandboxed container for the open repo (via `ai-service`), plus live-preview links for whatever port the container's dev server binds

## Environment Variables

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_AI_SERVICE_URL=http://localhost:8000
```

Both have sensible localhost defaults for local dev; set them explicitly when the frontend is served from somewhere that can't reach `localhost` for the backend/ai-service (e.g. a different machine on the LAN — see the terminal/live-preview note in the root README).

## Run

```bash
npm install
npm run dev
```

```bash
npm run build     # tsc -b && vite build
npm run lint
npm run preview
```

## Docker

`Dockerfile` is a two-stage build: `node:20-alpine` to build, `nginx:alpine` to serve the static output with SPA fallback routing (`nginx.conf` routes all paths to `index.html`).
