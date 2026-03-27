export type Repository = {
  id: string
  name: string
  description: string | null
  provider: string | null
  remoteUrl: string | null
  createdAt: string
  updatedAt: string
  workspaceId: string
  createdById: string
}

export type CreateRepositoryPayload = {
  name: string
  description?: string
  provider?: string
  remoteUrl?: string
}

export type FileTreeNode = {
  type: 'directory' | 'file'
  name: string
  path: string
  children?: FileTreeNode[]
  id?: string
  updatedAt?: string
}

export type FileVersion = {
  id: string
  versionNumber: number
  changeType: 'CREATE' | 'UPDATE' | 'DELETE'
  content: string | null
  summary: string | null
  createdAt: string
  createdBy?: {
    id: string
    name: string
    email: string
  }
}

export type FileHistory = {
  id: string
  path: string
  name: string
  isDeleted: boolean
  createdAt: string
  updatedAt: string
  repoId: string
  versions: FileVersion[]
}

export type EditorTab = {
  fileId: string
  filePath: string
}

export type RepositorySearchResult = {
  fileId: string
  name: string
  path: string
  updatedAt: string
  versionNumber: number
  matchType: 'path' | 'content' | 'path+content'
  snippet: string | null
}

export type RepositoryActivityItem = {
  id: string
  type: 'file-version' | 'commit'
  createdAt: string
  actor: {
    id: string
    name: string
    email: string
  }
  file?: {
    id: string
    path: string
    name: string
  }
  files?: Array<{
    id: string
    path: string
    name: string
  }>
  changeType?: 'CREATE' | 'UPDATE' | 'DELETE'
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
  user: {
    id: string
    name: string
    email: string
  }
}

export type RepositorySummary = {
  repoId: string
  workspaceId: string
  role: 'ADMIN' | 'EDITOR' | 'VIEWER' | null
  activeLocks: FileLock[]
}
