import { api } from './api'
import type {
  CreateRepositoryPayload,
  FileLock,
  FileHistory,
  FileTreeNode,
  RepositoryActivityItem,
  Repository,
  RepositorySearchResult,
  RepositorySummary,
} from '../types/repository'

export const listRepositories = async (workspaceId: string) => {
  const { data } = await api.get<Repository[]>(`/workspaces/${workspaceId}/repos`)
  return data
}

export const createRepository = async ({
  workspaceId,
  payload,
}: {
  workspaceId: string
  payload: CreateRepositoryPayload
}) => {
  const { data } = await api.post<Repository>(`/workspaces/${workspaceId}/repos`, payload)
  return data
}

export const getFileTree = async (repoId: string) => {
  const { data } = await api.get<FileTreeNode[]>(`/repos/${repoId}/files/tree`)
  return data
}

export const getFileHistory = async (repoId: string, fileId: string) => {
  const { data } = await api.get<FileHistory>(`/repos/${repoId}/files/${fileId}/history`)
  return data
}

export const getRepositorySummary = async (repoId: string) => {
  const { data } = await api.get<RepositorySummary>(`/repos/${repoId}/summary`)
  return data
}

export const searchRepositoryFiles = async (repoId: string, query: string) => {
  const { data } = await api.get<RepositorySearchResult[]>(`/repos/${repoId}/search`, {
    params: { q: query },
  })
  return data
}

export const getRepositoryActivity = async (repoId: string) => {
  const { data } = await api.get<RepositoryActivityItem[]>(`/repos/${repoId}/activity`)
  return data
}

export const getRepositoryFileLock = async (repoId: string, fileId: string) => {
  const { data } = await api.get<{ lock: FileLock | null }>(`/repos/${repoId}/files/${fileId}/lock`)
  return data.lock
}

export const acquireRepositoryFileLock = async (repoId: string, fileId: string) => {
  const { data } = await api.put<{ lock: FileLock }>(`/repos/${repoId}/files/${fileId}/lock`)
  return data.lock
}

export const releaseRepositoryFileLock = async (repoId: string, fileId: string) => {
  const { data } = await api.delete<{ lock: null }>(`/repos/${repoId}/files/${fileId}/lock`)
  return data.lock
}

export const updateRepositoryFile = async ({
  repoId,
  fileId,
  content,
}: {
  repoId: string
  fileId: string
  content: string
}) => {
  const { data } = await api.patch(`/repos/${repoId}/files/${fileId}`, {
    content,
    summary: 'Auto-saved from editor',
  })
  return data
}
