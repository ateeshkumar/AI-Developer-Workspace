import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { useToast } from '../hooks/use-toast'
import { uploadRepositoryFile } from '../services/upload'

type UploadItem = {
  id: string
  name: string
  sizeLabel: string
  progress: number
  status: 'queued' | 'uploading' | 'uploaded' | 'error'
}

type FileUploadProps = {
  repoId: string
}

const formatFileSize = (size: number) => {
  if (size < 1024) {
    return `${size} B`
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export function FileUpload({
  repoId,
}: FileUploadProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [isDragging, setIsDragging] = useState(false)
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const inputRef = useRef<HTMLInputElement | null>(null)

  const updateUpload = (id: string, patch: Partial<UploadItem>) => {
    setUploads((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    )
  }

  const handleFiles = async (files: FileList | File[]) => {
    if (!repoId || files.length === 0) {
      return
    }

    const nextItems = Array.from(files).map((file) => ({
      id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
      name: file.name,
      sizeLabel: formatFileSize(file.size),
      progress: 0,
      status: 'queued' as const,
      file,
    }))

    setUploads((current) => [
      ...nextItems.map(({ file: _file, ...item }) => item),
      ...current,
    ])

    for (const item of nextItems) {
      updateUpload(item.id, { status: 'uploading', progress: 0 })

      try {
        await uploadRepositoryFile({
          repoId,
          file: item.file,
          onProgress: (progress) => {
            updateUpload(item.id, { progress })
          },
        })

        updateUpload(item.id, {
          progress: 100,
          status: 'uploaded',
        })
      } catch {
        updateUpload(item.id, {
          status: 'error',
        })
      }
    }

    queryClient.invalidateQueries({
      queryKey: ['repository-tree', repoId],
    })

    toast({
      title: 'Upload finished',
      description:
        'Uploaded files were processed. If the backend upload endpoint is active, the file tree will refresh.',
      tone: 'success',
    })
  }

  return (
    <section className="panel-dark-soft rounded-[1.75rem] p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/75">
            File Upload
          </div>
          <h2 className="mt-2 font-['Space_Grotesk',_'Segoe_UI',_sans-serif] text-2xl font-semibold text-white">
            Upload files
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Drag and drop files here or choose multiple files to upload into this repository.
          </p>
        </div>

        <button
          type="button"
          disabled={!repoId}
          onClick={() => inputRef.current?.click()}
          className="rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 hover:-translate-y-0.5 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Upload files
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.target.files) {
            void handleFiles(event.target.files)
          }
          event.target.value = ''
        }}
      />

      <div
        className={`mt-5 rounded-[1.5rem] border-2 border-dashed p-6 text-center transition ${
          isDragging
            ? 'border-cyan-300 bg-cyan-300/10'
            : 'border-white/10 bg-white/[0.04]'
        }`}
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={(event) => {
          event.preventDefault()
          setIsDragging(false)
        }}
        onDrop={(event) => {
          event.preventDefault()
          setIsDragging(false)
          void handleFiles(event.dataTransfer.files)
        }}
      >
        <div className="text-sm font-medium text-slate-200">
          Drag and drop files here
        </div>
        <div className="mt-2 text-sm text-slate-500">
          Supports multiple files. Files upload using multipart form data.
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {uploads.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-400">
            No uploaded files yet.
          </div>
        ) : (
          uploads.map((upload) => (
            <article
              key={upload.id}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white">{upload.name}</div>
                  <div className="mt-1 text-xs text-slate-500">{upload.sizeLabel}</div>
                </div>
                <div
                  className={`text-xs font-semibold uppercase tracking-[0.2em] ${
                    upload.status === 'uploaded'
                      ? 'text-emerald-300'
                      : upload.status === 'error'
                        ? 'text-rose-200'
                        : 'text-cyan-200'
                  }`}
                >
                  {upload.status}
                </div>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-900/80">
                <div
                  className={`h-full rounded-full transition-all ${
                    upload.status === 'error' ? 'bg-rose-400' : 'bg-cyan-300'
                  }`}
                  style={{ width: `${upload.progress}%` }}
                />
              </div>

              <div className="mt-2 text-right text-xs text-slate-500">
                {upload.progress}%
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
