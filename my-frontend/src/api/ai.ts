import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiRequest } from './http'
import type { AiAssistantProvider, AIQueryResponse, AiProviderStatus } from '../types/api'

export const queryAI = (payload: { question: string; repoId?: string; provider?: AiAssistantProvider }) =>
  apiRequest<AIQueryResponse>('/ai/query', { method: 'POST', body: payload })

export const useQueryAI = () =>
  useMutation({
    mutationFn: queryAI,
  })

export const getAiProviderStatus = () => apiRequest<AiProviderStatus>('/ai/providers')

export const useAiProviderStatus = () =>
  useQuery({
    queryKey: ['ai-provider-status'],
    queryFn: getAiProviderStatus,
  })

export const connectAiProvider = (provider: 'claude' | 'openai', apiKey: string) =>
  apiRequest(`/ai/providers/${provider}/connect`, { method: 'POST', body: { apiKey } })

export const useConnectAiProvider = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ provider, apiKey }: { provider: 'claude' | 'openai'; apiKey: string }) =>
      connectAiProvider(provider, apiKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-provider-status'] })
    },
  })
}

export const disconnectAiProvider = (provider: 'claude' | 'openai') =>
  apiRequest(`/ai/providers/${provider}`, { method: 'DELETE' })

export const useDisconnectAiProvider = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (provider: 'claude' | 'openai') => disconnectAiProvider(provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-provider-status'] })
    },
  })
}
