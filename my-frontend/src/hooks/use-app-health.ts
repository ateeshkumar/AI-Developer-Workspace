import { useQuery } from '@tanstack/react-query'

import { api } from '../services/api'
import type { HealthResponse } from '../types/health'

export const useAppHealth = () =>
  useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const { data } = await api.get<HealthResponse>('/health')
      return data
    },
  })
