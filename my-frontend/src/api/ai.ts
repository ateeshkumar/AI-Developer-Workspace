import { useMutation } from '@tanstack/react-query'

import { apiRequest } from './http'
import type { AIQueryResponse } from '../types/api'

export const queryAI = (payload: { question: string; repoId?: string }) =>
  apiRequest<AIQueryResponse>('/ai/query', { method: 'POST', body: payload })

export const useQueryAI = () =>
  useMutation({
    mutationFn: queryAI,
  })
