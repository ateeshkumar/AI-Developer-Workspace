import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  connectGithub,
  disconnectGithub,
  getGithubConnectionStatus,
  importGithubRepo,
  listGithubRepos,
  previewGithubImport,
  pullGithubRepo,
  pushGithubRepo,
} from '../services/github'

export const useGithubConnectionStatus = () =>
  useQuery({
    queryKey: ['github-connection'],
    queryFn: getGithubConnectionStatus,
  })

export const useConnectGithub = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: connectGithub,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['github-connection'] })
    },
  })
}

export const useDisconnectGithub = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: disconnectGithub,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['github-connection'] })
      queryClient.invalidateQueries({ queryKey: ['github-repos'] })
    },
  })
}

export const useGithubRepos = (enabled: boolean) =>
  useQuery({
    queryKey: ['github-repos'],
    queryFn: listGithubRepos,
    enabled,
  })

export const useGithubImportPreview = (owner: string, repo: string) =>
  useQuery({
    queryKey: ['github-import-preview', owner, repo],
    queryFn: () => previewGithubImport(owner, repo),
    enabled: Boolean(owner && repo),
  })

export const useImportGithubRepo = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: importGithubRepo,
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: ['repositories', result.repo.workspaceId],
      })
    },
  })
}

export const usePullGithubRepo = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (repoId: string) => pullGithubRepo(repoId),
    onSuccess: (_result, repoId) => {
      queryClient.invalidateQueries({ queryKey: ['repository-tree', repoId] })
      queryClient.invalidateQueries({ queryKey: ['repository-activity', repoId] })
      queryClient.invalidateQueries({ queryKey: ['repository-summary', repoId] })
    },
  })
}

export const usePushGithubRepo = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ repoId, commitMessage }: { repoId: string; commitMessage?: string }) =>
      pushGithubRepo(repoId, commitMessage),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['repository-activity', variables.repoId] })
      queryClient.invalidateQueries({ queryKey: ['repository-summary', variables.repoId] })
    },
  })
}
