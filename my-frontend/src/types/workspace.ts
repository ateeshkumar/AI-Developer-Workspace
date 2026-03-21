export type RepoSummary = {
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

export type WorkspaceSummary = {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
  repos: RepoSummary[]
}

export type WorkspaceMembership = {
  id: string
  role: 'ADMIN' | 'EDITOR' | 'VIEWER'
  createdAt: string
  updatedAt: string
  workspaceId: string
  userId: string
  workspace: WorkspaceSummary
}

export type CreateWorkspacePayload = {
  name: string
  description?: string
}
