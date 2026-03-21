import { api } from './api'
import type {
  CreateRepositoryPayload,
  FileHistory,
  FileTreeNode,
  Repository,
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
