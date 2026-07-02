export type WorkspaceRole = 'ADMIN' | 'EDITOR' | 'VIEWER'
export type FileChangeType = 'CREATE' | 'UPDATE' | 'DELETE'
export type GithubSyncStatus = 'PULLED' | 'PUSHED' | 'CONFLICT'

export type User = {
  id: string
  name: string
  email: string
  createdAt: string
  updatedAt: string
}

export type AuthSession = {
  accessToken: string
  refreshToken: string
  user: User
}

export type Workspace = {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export type WorkspaceMembership = {
  id: string
  role: WorkspaceRole
  createdAt: string
  updatedAt: string
  workspaceId: string
  userId: string
  workspace: Workspace & { repos?: Repo[] }
}

export type Repo = {
  id: string
  name: string
  description: string | null
  provider: string | null
  remoteUrl: string | null
  githubOwner: string | null
  githubRepo: string | null
  githubDefaultBranch: string | null
  githubImportedAt: string | null
  githubLastSyncedAt: string | null
  createdAt: string
  updatedAt: string
  workspaceId: string
  createdById: string
}

export type FileTreeNode = {
  type: 'file' | 'directory'
  name: string
  path: string
  id?: string
  updatedAt?: string
  children?: FileTreeNode[]
}

export type FileVersion = {
  id: string
  versionNumber: number
  changeType: FileChangeType
  content: string | null
  summary: string | null
  createdAt: string
  createdBy?: { id: string; name: string; email: string }
}

export type RepoFileHistory = {
  id: string
  path: string
  name: string
  isDeleted: boolean
  createdAt: string
  updatedAt: string
  repoId: string
  versions: FileVersion[]
}

export type RepoFileRef = {
  id: string
  path: string
  name: string
  isDeleted: boolean
  repoId: string
}

export type FileMutationResult = {
  file: RepoFileRef
  version: FileVersion
}

export type RepoSearchResult = {
  fileId: string
  name: string
  path: string
  updatedAt: string
  versionNumber: number
  matchType: 'path' | 'content' | 'path+content'
  snippet: string | null
}

export type RepoActivityItem = {
  id: string
  type: 'file-version' | 'commit'
  createdAt: string
  actor: { id: string; name: string; email: string }
  file?: { id: string; path: string; name: string }
  files?: Array<{ id: string; path: string; name: string }>
  changeType?: FileChangeType
  versionNumber?: number
  summary?: string | null
  commitId?: string
  message?: string
  changedFiles?: number
}

export type FileLock = {
  repoId: string
  fileId: string
  acquiredAt: string
  expiresAt: string
  user: { id: string; name: string; email: string }
}

export type RepoSummary = {
  repoId: string
  workspaceId: string
  role: WorkspaceRole | null
  activeLocks: FileLock[]
}

export type IndexRepoResult = {
  indexed_files: number
  indexed_chunks: number
  included_roots: string[]
  created_at: string | null
}

export type GithubConnectionStatus = {
  connected: boolean
  githubLogin?: string
  scopes?: string
  connectedAt?: string
}

export type GithubRemoteRepo = {
  owner: string
  name: string
  fullName: string
  defaultBranch: string
  private: boolean
  updatedAt: string
}

export type GithubImportPreview = {
  totalFiles: number
  includedFiles: number
  skipped: Array<{ path: string; reason: string }>
  defaultBranch: string
}

export type GithubImportResult = {
  repo: Repo
  importedCount: number
  skipped: Array<{ path: string; reason: string }>
}

export type GithubSyncResult = {
  created: number
  updated: number
  deleted: number
  unchanged: number
}

export type GithubPushResult = {
  pushed: string[]
  deleted: string[]
  skipped: string[]
  conflict: { message: string } | null
}

export type AISource = {
  repo_name: string
  rel_path: string
  chunk_index: number
  start_line: number
  end_line: number
  score: number
  content: string
}

export type TerminalSession = {
  session_id: string
  host: string
  ports: Record<string, number | null>
}

export type AIQueryResponse = {
  answer: string
  model: string
  embedding_model: string
  indexed_files: number
  indexed_chunks: number
  sources: AISource[]
  prompt_preview: string
}
