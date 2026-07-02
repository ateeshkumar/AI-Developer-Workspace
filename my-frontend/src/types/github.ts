import type { Repository } from './repository'

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
  repo: Repository
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
