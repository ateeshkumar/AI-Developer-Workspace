import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiRequest, apiUpload } from './http'
import type {
  FileLock,
  FileTreeNode,
  IndexRepoResult,
  Repo,
  RepoActivityItem,
  RepoFileHistory,
  RepoSearchResult,
  RepoSummary,
} from '../types/api'

export const listRepos = (workspaceId: string) => apiRequest<Repo[]>(`/workspaces/${workspaceId}/repos`)

export const createRepo = (workspaceId: string, payload: { name: string; description?: string }) =>
  apiRequest<Repo>(`/workspaces/${workspaceId}/repos`, { method: 'POST', body: payload })

export const getRepoTree = (repoId: string) => apiRequest<FileTreeNode[]>(`/repos/${repoId}/files/tree`)

export const getRepoSummary = (repoId: string) => apiRequest<RepoSummary>(`/repos/${repoId}/summary`)

export const getRepoActivity = (repoId: string) => apiRequest<RepoActivityItem[]>(`/repos/${repoId}/activity`)

export const searchRepo = (repoId: string, query: string) =>
  apiRequest<RepoSearchResult[]>(`/repos/${repoId}/search?q=${encodeURIComponent(query)}`)

export const getFileHistory = (repoId: string, fileId: string) =>
  apiRequest<RepoFileHistory>(`/repos/${repoId}/files/${fileId}/history`)

export const createFile = (repoId: string, payload: { path: string; content?: string; summary?: string }) =>
  apiRequest(`/repos/${repoId}/files`, { method: 'POST', body: payload })

export const updateFile = (
  repoId: string,
  fileId: string,
  payload: { content: string; summary?: string }
) => apiRequest(`/repos/${repoId}/files/${fileId}`, { method: 'PATCH', body: payload })

export const deleteFile = (repoId: string, fileId: string) =>
  apiRequest(`/repos/${repoId}/files/${fileId}`, { method: 'DELETE' })

export const getFileLock = (repoId: string, fileId: string) =>
  apiRequest<{ lock: FileLock | null }>(`/repos/${repoId}/files/${fileId}/lock`)

export const acquireFileLock = (repoId: string, fileId: string) =>
  apiRequest<{ lock: FileLock }>(`/repos/${repoId}/files/${fileId}/lock`, { method: 'PUT' })

export const releaseFileLock = (repoId: string, fileId: string) =>
  apiRequest<{ lock: null }>(`/repos/${repoId}/files/${fileId}/lock`, { method: 'DELETE' })

export const uploadFiles = (repoId: string, pathPrefix: string, files: FileList) => {
  const formData = new FormData()
  formData.append('repoId', repoId)
  if (pathPrefix) {
    formData.append('pathPrefix', pathPrefix)
  }
  Array.from(files).forEach((file) => formData.append('files', file))
  return apiUpload<{ count: number }>('/file/upload', formData)
}

export const indexRepo = (repoId: string) => apiRequest<IndexRepoResult>(`/repos/${repoId}/index`, { method: 'POST' })

export const useRepos = (workspaceId: string) =>
  useQuery({
    queryKey: ['repos', workspaceId],
    queryFn: () => listRepos(workspaceId),
    enabled: Boolean(workspaceId),
  })

export const useCreateRepo = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ workspaceId, payload }: { workspaceId: string; payload: { name: string; description?: string } }) =>
      createRepo(workspaceId, payload),
    onSuccess: (repo) => {
      queryClient.invalidateQueries({ queryKey: ['repos', repo.workspaceId] })
    },
  })
}

export const useRepoTree = (repoId: string) =>
  useQuery({
    queryKey: ['repo-tree', repoId],
    queryFn: () => getRepoTree(repoId),
    enabled: Boolean(repoId),
  })

export const useRepoSummary = (repoId: string) =>
  useQuery({
    queryKey: ['repo-summary', repoId],
    queryFn: () => getRepoSummary(repoId),
    enabled: Boolean(repoId),
  })

export const useRepoActivity = (repoId: string) =>
  useQuery({
    queryKey: ['repo-activity', repoId],
    queryFn: () => getRepoActivity(repoId),
    enabled: Boolean(repoId),
  })

export const useRepoSearch = (repoId: string, query: string) =>
  useQuery({
    queryKey: ['repo-search', repoId, query],
    queryFn: () => searchRepo(repoId, query),
    enabled: Boolean(repoId && query.trim()),
  })

export const useFileHistory = (repoId: string, fileId: string) =>
  useQuery({
    queryKey: ['file-history', repoId, fileId],
    queryFn: () => getFileHistory(repoId, fileId),
    enabled: Boolean(repoId && fileId),
  })

export const useCreateFile = (repoId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { path: string; content?: string; summary?: string }) => createFile(repoId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repo-tree', repoId] })
      queryClient.invalidateQueries({ queryKey: ['repo-activity', repoId] })
    },
  })
}

export const useUpdateFile = (repoId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ fileId, content, summary }: { fileId: string; content: string; summary?: string }) =>
      updateFile(repoId, fileId, { content, summary }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['file-history', repoId, variables.fileId] })
      queryClient.invalidateQueries({ queryKey: ['repo-activity', repoId] })
    },
  })
}

export const useIndexRepo = () =>
  useMutation({
    mutationFn: (repoId: string) => indexRepo(repoId),
  })

export const useDeleteFile = (repoId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (fileId: string) => deleteFile(repoId, fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repo-tree', repoId] })
      queryClient.invalidateQueries({ queryKey: ['repo-activity', repoId] })
    },
  })
}

export const useFileLock = (repoId: string, fileId: string) =>
  useQuery({
    queryKey: ['file-lock', repoId, fileId],
    queryFn: () => getFileLock(repoId, fileId).then((result) => result.lock),
    enabled: Boolean(repoId && fileId),
    refetchInterval: 30000,
  })

export const useAcquireFileLock = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ repoId, fileId }: { repoId: string; fileId: string }) => acquireFileLock(repoId, fileId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['file-lock', variables.repoId, variables.fileId] })
    },
  })
}

export const useReleaseFileLock = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ repoId, fileId }: { repoId: string; fileId: string }) => releaseFileLock(repoId, fileId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['file-lock', variables.repoId, variables.fileId] })
    },
  })
}

export const useUploadFiles = (repoId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ pathPrefix, files }: { pathPrefix: string; files: FileList }) =>
      uploadFiles(repoId, pathPrefix, files),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repo-tree', repoId] })
      queryClient.invalidateQueries({ queryKey: ['repo-activity', repoId] })
    },
  })
}
