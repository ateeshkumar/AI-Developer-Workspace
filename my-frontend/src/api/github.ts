import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiRequest } from './http'
import type {
  GithubConnectionStatus,
  GithubImportPreview,
  GithubImportResult,
  GithubPushResult,
  GithubRemoteRepo,
  GithubSyncResult,
} from '../types/api'

export const connectGithub = (token: string) =>
  apiRequest<GithubConnectionStatus>('/github/connection', { method: 'POST', body: { token } })

export const getGithubConnectionStatus = () => apiRequest<GithubConnectionStatus>('/github/connection')

export const disconnectGithub = () => apiRequest<GithubConnectionStatus>('/github/connection', { method: 'DELETE' })

export const listGithubRepos = () => apiRequest<GithubRemoteRepo[]>('/github/repos')

export const previewGithubImport = (owner: string, repo: string) =>
  apiRequest<GithubImportPreview>(`/github/repos/${owner}/${repo}/preview`)

export const importGithubRepo = (payload: {
  workspaceId: string
  owner: string
  repo: string
  name?: string
  description?: string
}) =>
  apiRequest<GithubImportResult>(`/workspaces/${payload.workspaceId}/repos/import`, {
    method: 'POST',
    body: { owner: payload.owner, repo: payload.repo, name: payload.name, description: payload.description },
  })

export const pullGithubRepo = (repoId: string) =>
  apiRequest<GithubSyncResult>(`/repos/${repoId}/github/pull`, { method: 'POST' })

export const pushGithubRepo = (repoId: string, commitMessage?: string) =>
  apiRequest<GithubPushResult>(`/repos/${repoId}/github/push`, { method: 'POST', body: { commitMessage } })

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
      queryClient.invalidateQueries({ queryKey: ['repos', result.repo.workspaceId] })
    },
  })
}

export const usePullGithubRepo = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (repoId: string) => pullGithubRepo(repoId),
    onSuccess: (_result, repoId) => {
      queryClient.invalidateQueries({ queryKey: ['repo-tree', repoId] })
      queryClient.invalidateQueries({ queryKey: ['repo-activity', repoId] })
    },
  })
}

export const usePushGithubRepo = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ repoId, commitMessage }: { repoId: string; commitMessage?: string }) =>
      pushGithubRepo(repoId, commitMessage),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['repo-activity', variables.repoId] })
    },
  })
}
