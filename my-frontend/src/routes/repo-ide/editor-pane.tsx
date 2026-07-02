import Editor from '@monaco-editor/react'
import { useEffect, useRef, useState } from 'react'

import { useAcquireFileLock, useFileLock, useReleaseFileLock, useUpdateFile } from '../../api/repos'
import { pushToast } from '../../ui/toast'
import { useIde } from './ide-context'

const AUTOSAVE_DELAY_MS = 1200
const LOCK_RENEW_INTERVAL_MS = 60000

export function EditorPane() {
  const {
    repoId,
    fileId,
    filePath,
    content,
    setContent,
    openTabs,
    closeTab,
    openFile,
    role,
    presenceUsers,
    currentUserId,
    sendFileUpdate,
    connected,
  } = useIde()

  const fileLockQuery = useFileLock(repoId, fileId ?? '')
  const acquireLockMutation = useAcquireFileLock()
  const releaseLockMutation = useReleaseFileLock()
  const updateFileMutation = useUpdateFile(repoId)
  const saveTimerRef = useRef<number | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')

  const activeLock = fileLockQuery.data ?? null
  const currentUserOwnsLock = activeLock?.user.id === currentUserId
  const canEdit = Boolean(fileId && role && role !== 'VIEWER' && currentUserOwnsLock)

  useEffect(() => {
    if (!fileId || !currentUserOwnsLock) {
      return
    }

    const interval = window.setInterval(() => {
      acquireLockMutation.mutate({ repoId, fileId })
    }, LOCK_RENEW_INTERVAL_MS)

    return () => window.clearInterval(interval)
  }, [acquireLockMutation, currentUserOwnsLock, fileId, repoId])

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current)
      }
    }
  }, [])

  const handleChange = (value: string | undefined) => {
    const nextValue = value ?? ''
    setContent(nextValue)

    if (!canEdit || !fileId) {
      return
    }

    sendFileUpdate(nextValue)

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current)
    }

    setSaveState('saving')
    saveTimerRef.current = window.setTimeout(async () => {
      try {
        await updateFileMutation.mutateAsync({ fileId, content: nextValue })
        setSaveState('saved')
      } catch {
        setSaveState('idle')
        pushToast({ title: 'Save failed', tone: 'error' })
      }
    }, AUTOSAVE_DELAY_MS)
  }

  const handleAcquireLock = async () => {
    if (!fileId) return
    try {
      await acquireLockMutation.mutateAsync({ repoId, fileId })
      pushToast({ title: 'Lock acquired', tone: 'success' })
    } catch {
      pushToast({ title: 'Lock unavailable', description: 'Another collaborator holds it.', tone: 'error' })
    }
  }

  const handleReleaseLock = async () => {
    if (!fileId) return
    try {
      await releaseLockMutation.mutateAsync({ repoId, fileId })
      pushToast({ title: 'Lock released', tone: 'info' })
    } catch {
      pushToast({ title: 'Could not release lock', tone: 'error' })
    }
  }

  if (!fileId) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        Choose a file from the explorer to open it here.
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40">
      <div className="flex items-center gap-1 overflow-x-auto border-b border-white/10 bg-white/[0.02] px-2 py-1">
        {openTabs.map((tab) => (
          <div
            key={tab.fileId}
            className={`flex items-center gap-2 rounded-t-lg px-3 py-1.5 text-xs ${
              tab.fileId === fileId ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <button type="button" onClick={() => openFile(tab.fileId, tab.filePath)}>
              {tab.filePath.split('/').pop()}
            </button>
            <button type="button" onClick={() => closeTab(tab.fileId)} className="text-slate-500 hover:text-white">
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2 text-xs text-slate-400">
        <span className="truncate">{filePath}</span>
        <div className="flex items-center gap-3">
          <span>{connected ? 'Live' : 'Offline'}</span>
          {presenceUsers.length > 0 ? <span>{presenceUsers.length} viewing</span> : null}
          <span>{saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Saved' : ''}</span>
          {role === 'VIEWER' ? (
            <span>Read-only</span>
          ) : currentUserOwnsLock ? (
            <button type="button" onClick={() => void handleReleaseLock()} className="text-cyan-300 hover:text-cyan-200">
              Release lock
            </button>
          ) : activeLock ? (
            <span>Locked by {activeLock.user.name}</span>
          ) : (
            <button type="button" onClick={() => void handleAcquireLock()} className="text-cyan-300 hover:text-cyan-200">
              Lock to edit
            </button>
          )}
        </div>
      </div>

      <div className="flex-1">
        <Editor
          height="100%"
          theme="vs-dark"
          value={content}
          onChange={handleChange}
          options={{ readOnly: !canEdit, minimap: { enabled: false }, fontSize: 13 }}
        />
      </div>
    </div>
  )
}
