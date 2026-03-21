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
