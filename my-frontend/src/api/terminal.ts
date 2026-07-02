import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiRequest } from './http'
import type { TerminalSession } from '../types/api'

export const AI_SERVICE_ORIGIN: string = import.meta.env.VITE_AI_SERVICE_URL ?? 'http://localhost:8000'

export const createTerminalSession = (repoId: string) =>
  apiRequest<TerminalSession>(`/repos/${repoId}/terminal/session`, { method: 'POST' })

export const getTerminalSessionPorts = (repoId: string, sessionId: string) =>
  apiRequest<TerminalSession>(`/repos/${repoId}/terminal/session/${sessionId}/ports`)

export const destroyTerminalSession = (repoId: string, sessionId: string) =>
  apiRequest<{ destroyed: boolean }>(`/repos/${repoId}/terminal/session/${sessionId}`, { method: 'DELETE' })

export const useCreateTerminalSession = () =>
  useMutation({
    mutationFn: (repoId: string) => createTerminalSession(repoId),
  })

export const useTerminalSessionPorts = (repoId: string, sessionId: string | null) =>
  useQuery({
    queryKey: ['terminal-ports', repoId, sessionId],
    queryFn: () => getTerminalSessionPorts(repoId, sessionId as string),
    enabled: Boolean(repoId && sessionId),
    refetchInterval: 4000,
  })

export const useDestroyTerminalSession = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ repoId, sessionId }: { repoId: string; sessionId: string }) =>
      destroyTerminalSession(repoId, sessionId),
    onSuccess: (_data, variables) => {
      queryClient.removeQueries({ queryKey: ['terminal-ports', variables.repoId, variables.sessionId] })
    },
  })
}
