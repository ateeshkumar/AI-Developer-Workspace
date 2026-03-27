import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  acquireRepositoryFileLock,
  createRepository,
  getFileHistory,
  getRepositoryActivity,
  getRepositoryFileLock,
  getRepositorySummary,
  getFileTree,
  listRepositories,
  releaseRepositoryFileLock,
  searchRepositoryFiles,
  updateRepositoryFile,
} from '../services/repository'

export const useRepositories = (workspaceId: string) =>
  useQuery({
    queryKey: ['repositories', workspaceId],
    queryFn: () => listRepositories(workspaceId),
    enabled: Boolean(workspaceId),
  })

export const useCreateRepository = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createRepository,
    onSuccess: (repository) => {
      queryClient.invalidateQueries({
        queryKey: ['repositories', repository.workspaceId],
      })
    },
  })
}

export const useRepositoryTree = (repoId: string) =>
  useQuery({
    queryKey: ['repository-tree', repoId],
    queryFn: () => getFileTree(repoId),
    enabled: Boolean(repoId),
  })

export const useFileHistory = (repoId: string, fileId: string) =>
  useQuery({
    queryKey: ['file-history', repoId, fileId],
    queryFn: () => getFileHistory(repoId, fileId),
    enabled: Boolean(repoId && fileId),
  })

export const useRepositorySummary = (repoId: string) =>
  useQuery({
    queryKey: ['repository-summary', repoId],
    queryFn: () => getRepositorySummary(repoId),
    enabled: Boolean(repoId),
  })

export const useRepositorySearch = (repoId: string, query: string) =>
  useQuery({
    queryKey: ['repository-search', repoId, query],
    queryFn: () => searchRepositoryFiles(repoId, query),
    enabled: Boolean(repoId && query.trim()),
  })

export const useRepositoryActivity = (repoId: string) =>
  useQuery({
    queryKey: ['repository-activity', repoId],
    queryFn: () => getRepositoryActivity(repoId),
    enabled: Boolean(repoId),
  })

export const useFileLock = (repoId: string, fileId: string) =>
  useQuery({
    queryKey: ['file-lock', repoId, fileId],
    queryFn: () => getRepositoryFileLock(repoId, fileId),
    enabled: Boolean(repoId && fileId),
    refetchInterval: 30000,
  })

export const useAcquireFileLock = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      repoId,
      fileId,
    }: {
      repoId: string
      fileId: string
    }) => acquireRepositoryFileLock(repoId, fileId),
    onSuccess: (_lock, variables) => {
      queryClient.invalidateQueries({ queryKey: ['file-lock', variables.repoId, variables.fileId] })
      queryClient.invalidateQueries({ queryKey: ['repository-summary', variables.repoId] })
      queryClient.invalidateQueries({ queryKey: ['repository-activity', variables.repoId] })
    },
  })
}

export const useReleaseFileLock = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      repoId,
      fileId,
    }: {
      repoId: string
      fileId: string
    }) => releaseRepositoryFileLock(repoId, fileId),
    onSuccess: (_lock, variables) => {
      queryClient.invalidateQueries({ queryKey: ['file-lock', variables.repoId, variables.fileId] })
      queryClient.invalidateQueries({ queryKey: ['repository-summary', variables.repoId] })
      queryClient.invalidateQueries({ queryKey: ['repository-activity', variables.repoId] })
    },
  })
}

export const useAutoSaveFile = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateRepositoryFile,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['file-history', variables.repoId, variables.fileId],
      })
      queryClient.invalidateQueries({
        queryKey: ['repository-tree', variables.repoId],
      })
      queryClient.invalidateQueries({
        queryKey: ['repository-activity', variables.repoId],
      })
    },
  })
}
