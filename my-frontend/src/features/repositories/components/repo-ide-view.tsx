import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'

import { FileUpload } from '../../../components/FileUpload'
import { FileTree } from '../../../components/FileTree'
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
import { usePullGithubRepo, usePushGithubRepo } from '../../../hooks/use-github'
import { useRepositoryEditorSync } from '../../../hooks/use-repository-editor-sync'
import { useToast } from '../../../hooks/use-toast'
import { getFileHistory, releaseRepositoryFileLock } from '../../../services/repository'
import { getSocketClient } from '../../../services/socket'
import { useAuthStore } from '../../../store/auth-store'
import type { EditorTab } from '../../../types/repository'
import { EditorWorkspace } from '../../editor/components/editor-workspace'
import { AIPanel } from './ai-panel'
import { RepoSidePanelTabs } from './repo-side-panel-tabs'

type IndexRepoMutationLike = {
  isPending: boolean
  isSuccess: boolean
  isError: boolean
  variables?: string
}

type RepoIdeViewProps = {
  workspaceId: string
  repoId: string
  fileId: string
  filePath: string
  content: string
  openTabs: EditorTab[]
  accessToken: string
  socketConnected: boolean
  indexRepoMutation: IndexRepoMutationLike
  onBackToRepoList: () => void
  onSelectFile: (fileId: string, filePath: string) => void
  onSelectTab: (tab: EditorTab) => void
  onCloseTab: (fileId: string) => void
  onEditorChange: (value: string) => void
}

export function RepoIdeView({
  workspaceId,
  repoId,
  fileId,
  filePath,
  content,
  openTabs,
  accessToken,
  socketConnected,
  indexRepoMutation,
  onBackToRepoList,
  onSelectFile,
  onSelectTab,
  onCloseTab,
  onEditorChange,
}: RepoIdeViewProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuthStore()
  const socket = useMemo(() => getSocketClient(), [])
  const ownedLockRef = useRef<{ repoId: string; fileId: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [aiPanelOpen, setAiPanelOpen] = useState(true)
  const repositoriesQuery = useRepositories(workspaceId)
  const treeQuery = useRepositoryTree(repoId)
  const historyQuery = useFileHistory(repoId, fileId)
  const summaryQuery = useRepositorySummary(repoId)
  const activityQuery = useRepositoryActivity(repoId)
  const searchResultsQuery = useRepositorySearch(repoId, searchQuery)
  const fileLockQuery = useFileLock(repoId, fileId)
  const acquireLockMutation = useAcquireFileLock()
  const releaseLockMutation = useReleaseFileLock()
  const pullGithubMutation = usePullGithubRepo()
  const pushGithubMutation = usePushGithubRepo()
  const currentUserId = user?.id ?? null
  const role = summaryQuery.data?.role ?? null
  const activeLock = fileLockQuery.data ?? null
  const currentUserOwnsLock = activeLock?.user.id === currentUserId
  const canEdit = Boolean(fileId && role && role !== 'VIEWER' && currentUserOwnsLock)

  const activeRepo = useMemo(() => {
    return repositoriesQuery.data?.find((repo) => repo.id === repoId) ?? null
  }, [repositoriesQuery.data, repoId])

  const selectedRepoName = activeRepo?.name ?? 'No repo selected'
  const isGithubRepo = activeRepo?.provider === 'github'
  const canSyncGithub = Boolean(repoId && isGithubRepo && role && role !== 'VIEWER')

  const indexingStatusLabel = useMemo(() => {
    if (indexRepoMutation.variables !== repoId) {
      return null
    }

    if (indexRepoMutation.isPending) {
      return 'Indexing...'
    }

    if (indexRepoMutation.isSuccess) {
      return 'Indexed'
    }

    if (indexRepoMutation.isError) {
      return 'Indexing failed'
    }

    return null
  }, [indexRepoMutation, repoId])

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

  const handlePullFromGithub = async () => {
    if (!repoId) {
      return
    }

    try {
      const result = await pullGithubMutation.mutateAsync(repoId)
      toast({
        title: 'Pulled from GitHub',
        description: `${result.created} created, ${result.updated} updated, ${result.deleted} deleted.`,
        tone: 'success',
      })
    } catch {
      toast({
        title: 'Pull failed',
        description: 'Could not sync the latest changes from GitHub.',
        tone: 'error',
      })
    }
  }

  const handlePushToGithub = async () => {
    if (!repoId) {
      return
    }

    try {
      const result = await pushGithubMutation.mutateAsync({ repoId })

      if (result.conflict) {
        toast({
          title: 'Push conflict',
          description: result.conflict.message,
          tone: 'error',
        })
        return
      }

      toast({
        title: 'Pushed to GitHub',
        description:
          result.pushed.length === 0
            ? 'No changes to push.'
            : `${result.pushed.length} file(s) pushed in one commit.`,
        tone: 'success',
      })
    } catch {
      toast({
        title: 'Push failed',
        description: 'Could not push changes to GitHub.',
        tone: 'error',
      })
    }
  }

  const lockOwnerName = activeLock
    ? activeLock.user.id === currentUserId
      ? 'You'
      : activeLock.user.name
    : null

  return (
    <div
      className={
        aiPanelOpen
          ? 'grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)_360px]'
          : 'grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)_56px]'
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBackToRepoList}
            className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/[0.1]"
          >
            ‹ All repositories
          </button>
          {indexingStatusLabel ? (
            <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
              {indexingStatusLabel}
            </span>
          ) : null}
        </div>

        <FileTree
          nodes={treeQuery.data ?? []}
          activeFileId={fileId}
          onFileSelect={handleFileSelect}
        />

        <FileUpload repoId={repoId} />

        <RepoSidePanelTabs
          repoId={repoId}
          fileId={fileId}
          filePath={filePath}
          role={role}
          socketConnected={socketConnected}
          selectedRepoName={selectedRepoName}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          searchResults={searchResultsQuery.data ?? []}
          isSearching={searchResultsQuery.isLoading}
          onSelectSearchResult={(nextFileId, path) => void handleFileSelect(nextFileId, path)}
          historyVersions={historyQuery.data?.versions ?? []}
          isHistoryLoading={historyQuery.isLoading}
          activityItems={activityQuery.data ?? []}
          isActivityLoading={activityQuery.isLoading}
          activeLocksCount={summaryQuery.data?.activeLocks.length ?? 0}
          activeLock={activeLock}
          lockOwnerName={lockOwnerName}
          isGithubRepo={isGithubRepo}
          activeRepo={activeRepo}
          canSyncGithub={canSyncGithub}
          isPulling={pullGithubMutation.isPending}
          isPushing={pushGithubMutation.isPending}
          onPullFromGithub={() => void handlePullFromGithub()}
          onPushToGithub={() => void handlePushToGithub()}
        />
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

      <AIPanel isOpen={aiPanelOpen} onToggle={() => setAiPanelOpen((value) => !value)} />
    </div>
  )
}
