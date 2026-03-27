import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'

import { FileUpload } from '../../../components/FileUpload'
import {
  useAcquireFileLock,
  useFileHistory,
  useFileLock,
  useReleaseFileLock,
  useRepositories,
  useRepositoryActivity,
  useRepositorySearch,
  useRepositorySummary,
  useRepositoryTree,
} from '../../../hooks/use-repositories'
import { useToast } from '../../../hooks/use-toast'
import { FileTree } from '../../../components/FileTree'
import { useRepositoryEditorSync } from '../../../hooks/use-repository-editor-sync'
import {
  getFileHistory,
  releaseRepositoryFileLock,
} from '../../../services/repository'
import { getSocketClient } from '../../../services/socket'
import { useAuthStore } from '../../../store/auth-store'
import type { EditorTab, Repository } from '../../../types/repository'
import { EditorWorkspace } from '../../editor/components/editor-workspace'
import { RepoList } from '../../../pages/RepoList'

type RepositoryContentProps = {
  workspaceId: string
  repoId: string
  fileId: string
  filePath: string
  content: string
  openTabs: EditorTab[]
  accessToken: string
  socketConnected: boolean
  onSelectRepo: (repo: Repository) => void
  onSelectFile: (fileId: string, filePath: string) => void
  onSelectTab: (tab: EditorTab) => void
  onCloseTab: (fileId: string) => void
  onEditorChange: (value: string) => void
}

export function RepositoryContent({
  workspaceId,
  repoId,
  fileId,
  filePath,
  content,
  openTabs,
  accessToken,
  socketConnected,
  onSelectRepo,
  onSelectFile,
  onSelectTab,
  onCloseTab,
  onEditorChange,
}: RepositoryContentProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuthStore()
  const socket = useMemo(() => getSocketClient(), [])
  const ownedLockRef = useRef<{ repoId: string; fileId: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const repositoriesQuery = useRepositories(workspaceId)
  const treeQuery = useRepositoryTree(repoId)
  const historyQuery = useFileHistory(repoId, fileId)
  const summaryQuery = useRepositorySummary(repoId)
  const activityQuery = useRepositoryActivity(repoId)
  const searchResultsQuery = useRepositorySearch(repoId, searchQuery)
  const fileLockQuery = useFileLock(repoId, fileId)
  const acquireLockMutation = useAcquireFileLock()
  const releaseLockMutation = useReleaseFileLock()
  const currentUserId = user?.id ?? null
  const role = summaryQuery.data?.role ?? null
  const activeLock = fileLockQuery.data ?? null
  const currentUserOwnsLock = activeLock?.user.id === currentUserId
  const canEdit = Boolean(fileId && role && role !== 'VIEWER' && currentUserOwnsLock)

  const selectedRepoName = useMemo(() => {
    return repositoriesQuery.data?.find((repo) => repo.id === repoId)?.name ?? 'No repo selected'
  }, [repositoriesQuery.data, repoId])

  const latestPersistedContent = useMemo(() => {
    const versions = historyQuery.data?.versions ?? []
    return versions.find((version) => version.content !== null)?.content ?? content
  }, [content, historyQuery.data?.versions])

  const syncState = useRepositoryEditorSync({
    repoId,
    fileId,
    content,
    latestPersistedContent,
    socketConnected,
    canEdit,
    onEditorChange,
  })

  useEffect(() => {
    const previousOwnedLock = ownedLockRef.current

    if (
      previousOwnedLock &&
      (previousOwnedLock.repoId !== repoId || previousOwnedLock.fileId !== fileId)
    ) {
      ownedLockRef.current = null
      void releaseRepositoryFileLock(previousOwnedLock.repoId, previousOwnedLock.fileId).catch(() => {})
    }

    if (currentUserOwnsLock && repoId && fileId) {
      ownedLockRef.current = { repoId, fileId }
    }
  }, [currentUserOwnsLock, fileId, repoId])

  useEffect(() => {
    return () => {
      const ownedLock = ownedLockRef.current

      if (ownedLock) {
        void releaseRepositoryFileLock(ownedLock.repoId, ownedLock.fileId).catch(() => {})
      }
    }
  }, [])

  useEffect(() => {
    if (!repoId || !fileId || !currentUserOwnsLock) {
      return
    }

    const interval = window.setInterval(() => {
      acquireLockMutation.mutate({ repoId, fileId })
    }, 60000)

    return () => {
      window.clearInterval(interval)
    }
  }, [acquireLockMutation, currentUserOwnsLock, fileId, repoId])

  useEffect(() => {
    if (!repoId) {
      return
    }

    const invalidateRepository = () => {
      queryClient.invalidateQueries({ queryKey: ['repository-tree', repoId] })
      queryClient.invalidateQueries({ queryKey: ['repository-activity', repoId] })
      queryClient.invalidateQueries({ queryKey: ['repository-summary', repoId] })
    }

    const handleRepoEvent = (message: {
      type: string
      repoId?: string
      fileId?: string
      actor?: { id?: string; name?: string }
      lock?: { user?: { id?: string; name?: string } }
    }) => {
      if (message.repoId !== repoId) {
        return
      }

      invalidateRepository()

      if (message.fileId) {
        queryClient.invalidateQueries({
          queryKey: ['file-history', repoId, message.fileId],
        })
        queryClient.invalidateQueries({
          queryKey: ['file-lock', repoId, message.fileId],
        })
      }

      if (message.fileId === fileId && message.actor?.id && message.actor.id !== currentUserId) {
        if (message.type === 'file:lock') {
          toast({
            title: 'File locked',
            description: `${message.lock?.user?.name ?? message.actor.name ?? 'Another user'} locked this file.`,
            tone: 'info',
          })
        }

        if (message.type === 'file:unlock') {
          toast({
            title: 'File unlocked',
            description: `${message.actor.name ?? 'Another user'} released the lock.`,
            tone: 'info',
          })
        }
      }
    }

    socket.on('file:created', handleRepoEvent)
    socket.on('file:saved', handleRepoEvent)
    socket.on('file:deleted', handleRepoEvent)
    socket.on('file:lock', handleRepoEvent)
    socket.on('file:unlock', handleRepoEvent)
    socket.on('commit:created', handleRepoEvent)

    return () => {
      socket.off('file:created', handleRepoEvent)
      socket.off('file:saved', handleRepoEvent)
      socket.off('file:deleted', handleRepoEvent)
      socket.off('file:lock', handleRepoEvent)
      socket.off('file:unlock', handleRepoEvent)
      socket.off('commit:created', handleRepoEvent)
    }
  }, [currentUserId, fileId, queryClient, repoId, socket, toast])

  const handleFileSelect = async (nextFileId: string, nextFilePath: string) => {
    onSelectFile(nextFileId, nextFilePath)

    if (!repoId) {
      return
    }

    try {
      const history = await queryClient.fetchQuery({
        queryKey: ['file-history', repoId, nextFileId],
        queryFn: () => getFileHistory(repoId, nextFileId),
      })

      const latestContent =
        history.versions.find((version) => version.content !== null)?.content ?? ''

      onEditorChange(latestContent)
    } catch {
      onEditorChange('')
    }
  }

  const handleAcquireLock = async () => {
    if (!repoId || !fileId) {
      return
    }

    try {
      await acquireLockMutation.mutateAsync({ repoId, fileId })
      toast({
        title: 'Lock acquired',
        description: 'You can now edit this file in the workspace.',
        tone: 'success',
      })
    } catch {
      toast({
        title: 'Lock unavailable',
        description: 'Another collaborator currently holds the lock for this file.',
        tone: 'error',
      })
    }
  }

  const handleReleaseLock = async () => {
    if (!repoId || !fileId) {
      return
    }

    try {
      await releaseLockMutation.mutateAsync({ repoId, fileId })
      toast({
        title: 'Lock released',
        description: 'This file is now open for another editor.',
        tone: 'info',
      })
    } catch {
      toast({
        title: 'Unable to release lock',
        description: 'The file lock could not be released right now.',
        tone: 'error',
      })
    }
  }

  const formatTimestamp = (value: string) =>
    new Date(value).toLocaleString([], {
      dateStyle: 'medium',
      timeStyle: 'short',
    })

  const visibleSearchResults = searchQuery.trim() ? searchResultsQuery.data ?? [] : []
  const lockOwnerName = activeLock
    ? activeLock.user.id === currentUserId
      ? 'You'
      : activeLock.user.name
    : null

  return (
    <div className="grid gap-6 xl:grid-cols-[340px_340px_minmax(0,1fr)]">
      <RepoList
        workspaceId={workspaceId}
        repositories={repositoriesQuery.data ?? []}
        activeRepoId={repoId}
        isLoading={repositoriesQuery.isLoading}
        onOpenRepo={onSelectRepo}
      />

      <div className="space-y-6">
        <FileUpload repoId={repoId} />

        <section className="panel-dark-soft rounded-[1.75rem] p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/75">
            Search
          </div>
          <h2 className="mt-2 font-['Space_Grotesk',_'Segoe_UI',_sans-serif] text-2xl font-semibold text-white">
            Search across files
          </h2>
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by path or file content"
            disabled={!repoId}
            className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          />

          {searchQuery.trim() ? (
            <div className="mt-4 grid gap-3">
              {searchResultsQuery.isLoading ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-400">
                  Searching repository…
                </div>
              ) : visibleSearchResults.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-400">
                  No files matched this search.
                </div>
              ) : (
                visibleSearchResults.slice(0, 6).map((result) => (
                  <button
                    key={result.fileId}
                    type="button"
                    onClick={() => void handleFileSelect(result.fileId, result.path)}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-cyan-300/40 hover:bg-cyan-300/8"
                  >
                    <div className="text-sm font-semibold text-white">{result.path}</div>
                    <div className="mt-2 text-xs uppercase tracking-[0.2em] text-cyan-200/75">
                      {result.matchType}
                    </div>
                    {result.snippet ? (
                      <div className="mt-2 text-sm text-slate-400">{result.snippet}</div>
                    ) : null}
                  </button>
                ))
              )}
            </div>
          ) : null}
        </section>

        <FileTree
          nodes={treeQuery.data ?? []}
          activeFileId={fileId}
          onFileSelect={handleFileSelect}
        />

        <section className="panel-dark-soft rounded-[1.75rem] p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/75">
            Repository Status
          </div>
          <div className="mt-4 grid gap-3 text-sm text-slate-300">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <span className="font-medium text-white">Repository:</span>{' '}
              {selectedRepoName}
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <span className="font-medium text-white">File:</span>{' '}
              {filePath || 'Choose a file from the explorer'}
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <span className="font-medium text-white">Versions:</span>{' '}
              {historyQuery.data?.versions.length ?? 0}
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <span className="font-medium text-white">Role:</span> {role ?? 'Unknown'}
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <span className="font-medium text-white">Active locks:</span>{' '}
              {summaryQuery.data?.activeLocks.length ?? 0}
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <span className="font-medium text-white">Collaboration:</span>{' '}
              {socketConnected ? 'Connected' : 'Offline'}
            </div>
          </div>
          {repoId && !fileId ? (
            <div className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm text-cyan-100">
              Repository opened. Choose a file from the explorer to load it in the editor.
            </div>
          ) : null}
          {fileId ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
              {activeLock ? (
                <>
                  <div className="font-medium text-white">File lock</div>
                  <div className="mt-2">
                    Held by {lockOwnerName} until {formatTimestamp(activeLock.expiresAt)}
                  </div>
                </>
              ) : role === 'VIEWER' ? (
                'Your role is viewer, so this file opens in read-only mode.'
              ) : (
                'No lock is active. Use “Lock to edit” in the workspace header before making changes.'
              )}
            </div>
          ) : null}
        </section>

        <section className="panel-dark-soft rounded-[1.75rem] p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/75">
            Version History
          </div>
          <div className="mt-4 grid gap-3">
            {!fileId ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-400">
                Choose a file to inspect version history.
              </div>
            ) : historyQuery.isLoading ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-400">
                Loading history…
              </div>
            ) : (
              (historyQuery.data?.versions ?? []).slice(0, 6).map((version) => (
                <article
                  key={version.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-white">
                      v{version.versionNumber} · {version.changeType}
                    </div>
                    <div className="text-xs text-slate-500">{formatTimestamp(version.createdAt)}</div>
                  </div>
                  <div className="mt-2 text-sm text-slate-400">
                    {version.summary || 'No summary provided'}
                  </div>
                  {version.createdBy ? (
                    <div className="mt-2 text-xs text-slate-500">by {version.createdBy.name}</div>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </section>

        <section className="panel-dark-soft rounded-[1.75rem] p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/75">
            Activity
          </div>
          <div className="mt-4 grid gap-3">
            {activityQuery.isLoading ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-400">
                Loading repository activity…
              </div>
            ) : (
              (activityQuery.data ?? []).slice(0, 6).map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-white">
                      {item.type === 'commit'
                        ? `Commit · ${item.message ?? 'Untitled commit'}`
                        : `${item.changeType} · ${item.file?.path ?? 'File change'}`}
                    </div>
                    <div className="text-xs text-slate-500">{formatTimestamp(item.createdAt)}</div>
                  </div>
                  <div className="mt-2 text-sm text-slate-400">
                    {item.type === 'commit'
                      ? `${item.changedFiles ?? 0} file version(s) grouped in this commit.`
                      : item.summary || `Version ${item.versionNumber} saved.`}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">by {item.actor.name}</div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>

      <EditorWorkspace
        accessToken={accessToken}
        fileId={fileId}
        filePath={filePath || 'No file selected'}
        content={content}
        tabs={openTabs}
        saveState={syncState.saveState}
        role={role}
        isEditable={canEdit}
        lockOwnerName={lockOwnerName}
        currentUserOwnsLock={currentUserOwnsLock}
        lockActionPending={acquireLockMutation.isPending || releaseLockMutation.isPending}
        presenceUsers={syncState.presenceUsers}
        onAcquireLock={() => void handleAcquireLock()}
        onReleaseLock={() => void handleReleaseLock()}
        onSelectTab={onSelectTab}
        onCloseTab={onCloseTab}
        onChange={onEditorChange}
      />
    </div>
  )
}
