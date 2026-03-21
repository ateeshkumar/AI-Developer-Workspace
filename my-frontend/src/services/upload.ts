import type { AxiosProgressEvent } from 'axios'

import { api } from './api'

export type UploadFileParams = {
  repoId: string
  file: File
  onProgress?: (progress: number) => void
}

export type UploadFileResponse = {
  id?: string
  name?: string
  path?: string
  url?: string
  [key: string]: unknown
}

export const uploadRepositoryFile = async ({
  repoId,
  file,
  onProgress,
}: UploadFileParams) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('repoId', repoId)

  const { data } = await api.post<UploadFileResponse>('/file/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (event: AxiosProgressEvent) => {
      if (!onProgress || !event.total) {
        return
      }

      const progress = Math.round((event.loaded / event.total) * 100)
      onProgress(progress)
    },
  })

  return data
}
