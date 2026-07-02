# My Backend API

Backend API for auth, users, workspaces, repos, files, versions, and commits.

## Tech Stack

- Node.js
- Express
- Prisma 7
- PostgreSQL
- JWT auth
- bcrypt password hashing

## Features

### Auth Module

- Register user
- Login user
- Refresh access token
- Logout by revoking refresh token
- Password hashing with `bcrypt`
- JWT access + refresh tokens

### User Module

- Get current user profile
- See basic user info
- See workspace memberships

### Workspace Module

- Create workspace
- Invite users by email
- Role system:
  - `ADMIN`
  - `EDITOR`
  - `VIEWER`

### Repo Module

- Create repo
- List repos in a workspace
- Link repo to workspace

### GitHub Sync Module

- Connect a GitHub account via a Personal Access Token (encrypted at rest, AES-256-GCM)
- List the connected account's GitHub repositories
- Preview and import a GitHub repository into a workspace (file tree + contents, batched insert)
- Pull (re-sync) upstream changes into the imported repo's file/version history
- Push local edits back to GitHub as a single squashed commit (blob → tree → commit → ref update via the Git Data API), with conflict detection on non-fast-forward pushes

### AI Module

- Proxies chat/query requests to `ai-service`, optionally scoped to a `repoId`
- `POST /api/repos/:repoId/index` fetches a repo's current file content straight from Postgres (reusing the same query as `getRepoFilesForIndexing`) and hands it to `ai-service` for repo-scoped RAG indexing — this backend never talks to the vector store itself, it's a pure content bridge

### Terminal Module

- `POST /api/repos/:repoId/terminal/session` fetches a repo's files from Postgres (same bridge pattern as AI indexing) and asks `ai-service` to spawn a sandboxed, interactive Docker container for it
- The frontend connects its terminal WebSocket **directly** to `ai-service` (not proxied through this backend) — this backend's role is just session creation/teardown and supplying repo content
- `GET .../terminal/session/:sessionId/ports` / `DELETE .../terminal/session/:sessionId` proxy straight through to `ai-service`

### File Module

- Create file
- Update file
- Delete file
- Build file tree
- Track file history

### Version System

- Every file save creates a new immutable version
- Commits link one or more saved versions
- Full commit history per repo
- Full version history per file

### Real-Time Collaboration

- WebSocket gateway on the same backend server
- Authenticated socket connections with JWT access token
- Repo subscription for collaboration events
- File room join/leave support
- User presence tracking per file
- Live file update broadcasting between connected users
- REST save/delete actions also broadcast to collaborators

## Project Structure

```text
my-backend/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   └── utils/
├── server.js
├── package.json
└── README.md
```

## Environment Variables

Create a `.env` file in the backend root.

```env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/ai_hit"
JWT_SECRET="your_access_secret"
JWT_REFRESH_SECRET="your_refresh_secret_optional"
ACCESS_TOKEN_TTL="15m"
REFRESH_TOKEN_TTL="7d"
GITHUB_TOKEN_ENC_KEY="base64-encoded-32-byte-key"
AI_SERVICE_URL="http://localhost:8000"
PORT=3000
```

Notes:

- `JWT_REFRESH_SECRET` is optional. If omitted, `JWT_SECRET` is used for refresh tokens too.
- `PORT` defaults to `3000`.
- `JWT_SECRET` must match the `JWT_SECRET` set on `ai-service` — the terminal feature's WebSocket verifies the same access tokens this backend issues, independently of this backend (no session state is shared beyond the token itself)

## Installation

```bash
npm install
```

## Database Setup

Generate Prisma client:

```bash
npm run prisma:generate
```

Apply migrations:

```bash
npm run migrate:deploy
```

During active development, when you change `schema.prisma` and want to generate a new migration file, use `npm run migrate:dev` instead. Avoid `npm run db:push` for anything beyond quick local experiments — it syncs the schema directly and does not record a migration, which causes drift between `prisma/migrations` and the database.

## Run the Server

Development:

```bash
npm run dev
```

Production-style local run:

```bash
npm start
```

Health check:

```http
GET /api/health
```

## Authentication

Protected routes use:

```http
Authorization: Bearer <access_token>
```

WebSocket authentication uses the same access token:

```text
ws://localhost:3000/ws?token=<access_token>
```

## Role Rules

- `ADMIN`: full workspace control, can invite users, create repos, manage files, create commits
- `EDITOR`: can create repos/files, update files, delete files, create commits
- `VIEWER`: read-only access to repos, files, tree, history, commits

## Data Model Summary

Main Prisma models:

- `User`
- `RefreshToken`
- `Workspace`
- `WorkspaceMember`
- `WorkspaceInvitation`
- `Repo`
- `RepoFile`
- `FileVersion`
- `Commit`
- `CommitFileVersion`

Flow:

- A `Workspace` has many members and repos
- A `Repo` belongs to one workspace
- A `RepoFile` belongs to one repo
- A `FileVersion` belongs to one file
- A `Commit` belongs to one repo
- `CommitFileVersion` links file versions to commits

## API Reference

Base URL:

```text
http://localhost:3000/api
```

### Auth Routes

#### Register

```http
POST /api/auth/register
Content-Type: application/json
```

```json
{
  "name": "Ateesh",
  "email": "ateesh@example.com",
  "password": "secret123"
}
```

Response:

```json
{
  "accessToken": "jwt",
  "refreshToken": "jwt",
  "user": {
    "id": "uuid",
    "name": "Ateesh",
    "email": "ateesh@example.com",
    "createdAt": "date",
    "updatedAt": "date"
  }
}
```

#### Login

```http
POST /api/auth/login
```

```json
{
  "email": "ateesh@example.com",
  "password": "secret123"
}
```

#### Refresh Token

```http
POST /api/auth/refresh
```

```json
{
  "refreshToken": "jwt"
}
```

#### Logout

```http
POST /api/auth/logout
```

```json
{
  "refreshToken": "jwt"
}
```

### User Routes

#### Get Current User Profile

```http
GET /api/users/me
Authorization: Bearer <access_token>
```

### Workspace Routes

#### List My Workspaces

```http
GET /api/workspaces
Authorization: Bearer <access_token>
```

#### Create Workspace

```http
POST /api/workspaces
Authorization: Bearer <access_token>
Content-Type: application/json
```

```json
{
  "name": "My Workspace",
  "description": "Main product workspace"
}
```

#### Invite User

```http
POST /api/workspaces/:workspaceId/invite
Authorization: Bearer <access_token>
Content-Type: application/json
```

```json
{
  "email": "editor@example.com",
  "role": "EDITOR"
}
```

Behavior:

- If the invited email already belongs to a user, the user is added or updated in workspace membership.
- If the email is not registered yet, an invitation record is created.

### Repo Routes

#### Create Repo

```http
POST /api/workspaces/:workspaceId/repos
Authorization: Bearer <access_token>
Content-Type: application/json
```

```json
{
  "name": "backend-api",
  "description": "Core backend repo",
  "provider": "github",
  "remoteUrl": "https://github.com/org/backend-api"
}
```

#### List Repos

```http
GET /api/workspaces/:workspaceId/repos
Authorization: Bearer <access_token>
```

#### Search, Activity, Summary, AI Indexing

```http
GET  /api/repos/:repoId/search?q=<query>       (VIEWER)
GET  /api/repos/:repoId/activity?limit=30      (VIEWER)
GET  /api/repos/:repoId/summary                (VIEWER)
POST /api/repos/:repoId/index                  (VIEWER) -> triggers repo-scoped AI indexing
```

#### GitHub Sync

```http
POST   /api/github/connection                              (auth only)  { "token": "<personal access token>" }
GET    /api/github/connection                               (auth only)  -> connection status
DELETE /api/github/connection                                (auth only)  -> disconnect
GET    /api/github/repos                                     (auth only)  -> list the connected account's GitHub repos
GET    /api/github/repos/:owner/:repo/preview                (auth only)  -> file counts before importing
POST   /api/workspaces/:workspaceId/repos/import              (EDITOR)     { "owner", "repo", "name?", "description?" }
POST   /api/repos/:repoId/github/pull                          (EDITOR)     -> re-sync from GitHub
POST   /api/repos/:repoId/github/push                          (EDITOR)     { "commitMessage?" } -> squashed push
```

#### Terminal Sessions

```http
POST   /api/repos/:repoId/terminal/session                            (EDITOR) -> { session_id, host, ports }
GET    /api/repos/:repoId/terminal/session/:sessionId/ports            (EDITOR)
DELETE /api/repos/:repoId/terminal/session/:sessionId                   (EDITOR)
```

The frontend uses the returned `session_id` to open a WebSocket directly against `ai-service` (`ws://<ai-service-host>:8000/terminal/:sessionId?token=<access_token>`) — this backend does not proxy that connection.

### File Routes

#### Create File

```http
POST /api/repos/:repoId/files
Authorization: Bearer <access_token>
Content-Type: application/json
```

```json
{
  "path": "src/index.js",
  "content": "console.log('hello');",
  "summary": "create entry file"
}
```

Behavior:

- Creates a `RepoFile`
- Creates version `1`
- Marks change type as `CREATE`

#### Update File

```http
PATCH /api/repos/:repoId/files/:fileId
Authorization: Bearer <access_token>
Content-Type: application/json
```

```json
{
  "content": "console.log('updated');",
  "summary": "update entry file"
}
```

Behavior:

- Does not overwrite previous version
- Creates a new `FileVersion`
- Marks change type as `UPDATE`

#### Delete File

```http
DELETE /api/repos/:repoId/files/:fileId
Authorization: Bearer <access_token>
Content-Type: application/json
```

```json
{
  "summary": "remove old file"
}
```

Behavior:

- Soft-deletes the file
- Creates a new `FileVersion`
- Marks change type as `DELETE`

#### File Tree

```http
GET /api/repos/:repoId/files/tree
Authorization: Bearer <access_token>
```

Returns nested directory/file structure for non-deleted files.

#### File History

```http
GET /api/repos/:repoId/files/:fileId/history
Authorization: Bearer <access_token>
```

Returns:

- file metadata
- all versions
- version author
- linked commit information

### Commit Routes

#### Create Commit

```http
POST /api/repos/:repoId/commits
Authorization: Bearer <access_token>
Content-Type: application/json
```

```json
{
  "message": "initial app commit"
}
```

Optional version selection:

```json
{
  "message": "commit selected versions",
  "fileVersionIds": ["version-id-1", "version-id-2"]
}
```

Behavior:

- If `fileVersionIds` is omitted, all uncommitted versions in the repo are committed
- Creates a `Commit`
- Links file versions through `CommitFileVersion`

#### Commit History

```http
GET /api/repos/:repoId/commits
Authorization: Bearer <access_token>
```

Returns commit list with linked file versions and file metadata.

## WebSocket Gateway

Endpoint:

```text
ws://localhost:3000/ws?token=<access_token>
```

The gateway is JWT-protected. A valid access token is required to connect.

### Server Events

- `connection:ready`
- `repo:subscribed`
- `file:joined`
- `presence:update`
- `presence:pong`
- `file:update`
- `file:created`
- `file:saved`
- `file:deleted`
- `commit:created`
- `error`

### Client Messages

#### Subscribe to Repo

```json
{
  "type": "repo:subscribe",
  "repoId": "repo-id"
}
```

#### Unsubscribe from Repo

```json
{
  "type": "repo:unsubscribe",
  "repoId": "repo-id"
}
```

#### Join File Room

```json
{
  "type": "file:join",
  "repoId": "repo-id",
  "fileId": "file-id"
}
```

#### Leave File Room

```json
{
  "type": "file:leave",
  "fileId": "file-id"
}
```

#### Broadcast Live Edit

```json
{
  "type": "file:update",
  "repoId": "repo-id",
  "fileId": "file-id",
  "content": "draft content from editor",
  "cursor": {
    "line": 3,
    "column": 14
  }
}
```

This event is broadcast to the other users currently joined to the same file.

#### Ping Presence

```json
{
  "type": "presence:ping"
}
```

### Real-Time Behavior

- When a user joins a file, they receive `file:joined` with the current presence list
- Other connected users in that file receive `presence:update`
- When a collaborator sends `file:update`, the other users in the same file receive the live draft payload
- When the file is saved through REST `PATCH /api/repos/:repoId/files/:fileId`, subscribers receive `file:saved`
- When a file is created or deleted through REST, subscribers receive `file:created` or `file:deleted`
- When a commit is created through REST, repo subscribers receive `commit:created`

### Real-Time Editing Note

Current implementation provides:

- presence
- live update broadcasting
- server-backed file save/versioning

This gives you practical real-time editing support for collaborative clients.

Optional future upgrade:

- add Yjs for CRDT-based conflict-free editing
- add shared cursors and awareness metadata
- persist ephemeral drafts separately from saved file versions

## File Versioning Flow

Example lifecycle:

1. Create repo
2. Create file `src/index.js`
3. Version `1` is saved with change type `CREATE`
4. Update file content
5. Version `2` is saved with change type `UPDATE`
6. Create commit
7. Versions are linked to the commit
8. Delete file
9. Version `3` is saved with change type `DELETE`
10. Create another commit
11. Delete version is linked to the new commit

This gives you:

- current file state
- full file history
- full commit history
- link between saved versions and commits

## Example End-to-End Setup

### 1. Register User

```bash
curl -X POST http://localhost:3000/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Ateesh\",\"email\":\"ateesh@example.com\",\"password\":\"secret123\"}"
```

### 2. Create Workspace

```bash
curl -X POST http://localhost:3000/api/workspaces ^
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"My Workspace\",\"description\":\"Main workspace\"}"
```

### 3. Create Repo

```bash
curl -X POST http://localhost:3000/api/workspaces/WORKSPACE_ID/repos ^
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"backend-api\"}"
```

### 4. Create File

```bash
curl -X POST http://localhost:3000/api/repos/REPO_ID/files ^
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"path\":\"src/index.js\",\"content\":\"console.log('hello');\"}"
```

### 5. Update File

```bash
curl -X PATCH http://localhost:3000/api/repos/REPO_ID/files/FILE_ID ^
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"content\":\"console.log('updated');\"}"
```

### 6. Commit Changes

```bash
curl -X POST http://localhost:3000/api/repos/REPO_ID/commits ^
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"message\":\"initial commit\"}"
```

## Validation Notes

- Password must be at least 6 characters
- Email is normalized to lowercase
- File path cannot be empty
- File path cannot contain `..`
- Duplicate file paths inside the same repo are blocked
- Deleted files cannot be updated
- A committed file version cannot be linked to another commit

## Important Notes

- Schema changes are tracked as Prisma migrations in `prisma/migrations`; apply them with `npm run migrate:deploy` (or `prisma migrate dev` while developing)
- `docker-compose.yml` runs `prisma migrate deploy` on container start, so the migration history is the source of truth for the schema
- `GITHUB_TOKEN_ENC_KEY` must be a base64-encoded 32-byte key (generate with `openssl rand -base64 32`). GitHub Personal Access Tokens are encrypted with AES-256-GCM using this key before being stored — rotating the key invalidates every stored connection, and the affected user must reconnect via `POST /api/github/connection`
- `AI_SERVICE_URL` defaults to `http://localhost:8000`, which is only correct when both services run natively on the host. Inside Docker Compose it must be the service hostname (`http://ai-service:8000`, already set in `docker-compose.yml`) — without it, `/api/ai/*` and `/api/repos/:repoId/index` fail with a generic "fetch failed" 500
- A GitHub PAT needs the `repo` scope to import/sync private repositories, or `public_repo` if you only need public ones

## Suggested Next Improvements

- Accept workspace invitations
- Remove/reassign workspace members
- Repo branch support
- Restore deleted files
- Diff between file versions
- Pagination for commit/file history
- Input validation library like `zod`
- Automated tests with Jest or Vitest
- Request logging and rate limiting
