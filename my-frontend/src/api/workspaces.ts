import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiRequest } from './http'
import type { Workspace, WorkspaceMembership } from '../types/api'

export const listWorkspaces = () => apiRequest<WorkspaceMembership[]>('/workspaces')

export const createWorkspace = (payload: { name: string; description?: string }) =>
  apiRequest<Workspace>('/workspaces', { method: 'POST', body: payload })

export const useWorkspaces = () =>
  useQuery({
    queryKey: ['workspaces'],
    queryFn: listWorkspaces,
  })

export const useCreateWorkspace = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createWorkspace,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
    },
  })
}
