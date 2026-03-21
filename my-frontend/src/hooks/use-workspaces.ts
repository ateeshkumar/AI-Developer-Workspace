import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { createWorkspace, listWorkspaces } from '../services/workspace'

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
