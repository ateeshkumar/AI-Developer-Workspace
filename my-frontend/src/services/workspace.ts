import { api } from './api'
import type {
  CreateWorkspacePayload,
  WorkspaceMembership,
  WorkspaceSummary,
} from '../types/workspace'

export const listWorkspaces = async () => {
  const { data } = await api.get<WorkspaceMembership[]>('/workspaces')
  return data
}

export const createWorkspace = async (payload: CreateWorkspacePayload) => {
  const { data } = await api.post<WorkspaceSummary>('/workspaces', payload)
  return data
}
