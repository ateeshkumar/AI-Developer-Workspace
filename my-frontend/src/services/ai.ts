import { api } from './api'
import type { AIQueryPayload, AIQueryResponse } from '../types/ai'

export const queryAI = async (payload: AIQueryPayload) => {
  const { data } = await api.post<AIQueryResponse>('/ai/query', payload)
  return data
}
