import { useMutation } from '@tanstack/react-query'

import { indexRepo } from '../services/ai'

export const useIndexRepo = () =>
  useMutation({
    mutationFn: (repoId: string) => indexRepo(repoId),
  })
