import type { AxiosProgressEvent } from 'axios'

import { api } from './api'

export type UploadFileParams = {
  repoId: string
  files: File[]
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
  files,
  onProgress,
}: UploadFileParams) => {
  const formData = new FormData()
  formData.append('repoId', repoId)

  files.forEach((file) => {
    const relativePath =
      (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name

    formData.append('file', file, relativePath)
  })

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
