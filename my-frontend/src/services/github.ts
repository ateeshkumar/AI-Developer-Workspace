import { api } from './api'
import type {
  GithubConnectionStatus,
  GithubImportPreview,
  GithubImportResult,
  GithubPushResult,
  GithubRemoteRepo,
  GithubSyncResult,
} from '../types/github'

export const connectGithub = async (token: string) => {
  const { data } = await api.post<GithubConnectionStatus>('/github/connection', { token })
  return data
}

export const getGithubConnectionStatus = async () => {
  const { data } = await api.get<GithubConnectionStatus>('/github/connection')
  return data
}

export const disconnectGithub = async () => {
  const { data } = await api.delete<GithubConnectionStatus>('/github/connection')
  return data
}

export const listGithubRepos = async () => {
  const { data } = await api.get<GithubRemoteRepo[]>('/github/repos')
  return data
}

export const previewGithubImport = async (owner: string, repo: string) => {
  const { data } = await api.get<GithubImportPreview>(
    `/github/repos/${owner}/${repo}/preview`
  )
  return data
}

export const importGithubRepo = async ({
  workspaceId,
  owner,
  repo,
  name,
  description,
}: {
  workspaceId: string
  owner: string
  repo: string
  name?: string
  description?: string
}) => {
  const { data } = await api.post<GithubImportResult>(
    `/workspaces/${workspaceId}/repos/import`,
    { owner, repo, name, description }
  )
  return data
}

export const pullGithubRepo = async (repoId: string) => {
  const { data } = await api.post<GithubSyncResult>(`/repos/${repoId}/github/pull`)
  return data
}

export const pushGithubRepo = async (repoId: string, commitMessage?: string) => {
  const { data } = await api.post<GithubPushResult>(`/repos/${repoId}/github/push`, {
    commitMessage,
  })
  return data
}
