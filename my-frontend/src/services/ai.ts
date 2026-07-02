import { api } from './api'
import type { AIQueryPayload, AIQueryResponse, IndexRepoResponse } from '../types/ai'

export const queryAI = async (payload: AIQueryPayload) => {
  const { data } = await api.post<AIQueryResponse>('/ai/query', payload)
  return data
}

export const indexRepo = async (repoId: string) => {
  const { data } = await api.post<IndexRepoResponse>(`/repos/${repoId}/index`)
  return data
}
