import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createRepository,
  getFileHistory,
  getFileTree,
  listRepositories,
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
    },
  })
}
