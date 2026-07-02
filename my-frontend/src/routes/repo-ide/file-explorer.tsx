import { useRef, useState } from 'react'

import {
  useCreateFile,
  useIndexRepo,
  useRepoActivity,
  useRepoSearch,
  useRepoTree,
  useUploadFiles,
} from '../../api/repos'
import { usePullGithubRepo, usePushGithubRepo } from '../../api/github'
import { Tabs } from '../../ui/tabs'
import { pushToast } from '../../ui/toast'
import type { FileTreeNode, Repo } from '../../types/api'
import { CreateEntryModal } from './create-entry-modal'
import { useIde } from './ide-context'

const formatTimestamp = (value: string) =>
  new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })

// Empty folders have no file to derive a tree node from, so an empty folder is
// represented by a hidden `.gitkeep` placeholder file (same convention Git itself
// uses) — filtered out of the rendered tree so it doesn't show up as a fake file.
const isPlaceholderFile = (node: FileTreeNode) => node.type === 'file' && node.name === '.gitkeep'

function TreeNode({ node, activeFileId, onSelect, onCreateHere }: {
  node: FileTreeNode
  activeFileId: string | null
  onSelect: (fileId: string, filePath: string) => void
  onCreateHere?: (path: string) => void
}) {
  const [expanded, setExpanded] = useState(true)

  if (node.type === 'directory') {
    const visibleChildren = (node.children ?? []).filter((child) => !isPlaceholderFile(child))

    return (
      <div className="ml-2">
        <div className="group flex items-center justify-between">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="text-left text-sm text-slate-300 hover:text-white"
          >
            {expanded ? '▾' : '▸'} {node.name}
          </button>
          {onCreateHere ? (
            <button
              type="button"
              onClick={() => onCreateHere(node.path)}
              className="hidden text-xs text-slate-500 hover:text-cyan-300 group-hover:block"
              title="New file/folder here"
            >
              +
            </button>
          ) : null}
        </div>
        {expanded ? (
          <div className="ml-3 border-l border-white/10 pl-2">
            {visibleChildren.map((child) => (
              <TreeNode key={child.path} node={child} activeFileId={activeFileId} onSelect={onSelect} onCreateHere={onCreateHere} />
            ))}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => node.id && onSelect(node.id, node.path)}
      className={`ml-2 block truncate rounded-md px-2 py-1 text-left text-sm ${
        node.id === activeFileId ? 'bg-cyan-300/20 text-cyan-100' : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
      }`}
    >
      {node.name}
    </button>
  )
}

type SidePanelTab = 'search' | 'history' | 'activity' | 'github'

export function FileExplorer({ activeRepo }: { activeRepo: Repo | null }) {
  const { repoId, fileId, openFile, role } = useIde()
  const treeQuery = useRepoTree(repoId)
  const createFileMutation = useCreateFile(repoId)
  const uploadMutation = useUploadFiles(repoId)
  const indexMutation = useIndexRepo()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [sidePanelTab, setSidePanelTab] = useState<SidePanelTab>('activity')
  const [searchQuery, setSearchQuery] = useState('')
  const searchResultsQuery = useRepoSearch(repoId, searchQuery)
  const activityQuery = useRepoActivity(repoId)
  const pullGithubMutation = usePullGithubRepo()
  const pushGithubMutation = usePushGithubRepo()

  const canEdit = role === 'ADMIN' || role === 'EDITOR'
  const isGithubRepo = activeRepo?.provider === 'github'

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createDestination, setCreateDestination] = useState('')

  const openCreateModal = (destination = '') => {
    setCreateDestination(destination)
    setIsCreateModalOpen(true)
  }

  const handleCreateEntry = async (path: string, type: 'file' | 'folder') => {
    const targetPath = type === 'folder' ? `${path}/.gitkeep` : path

    try {
      const result = await createFileMutation.mutateAsync({ path: targetPath, content: '' })
      pushToast({ title: type === 'folder' ? 'Folder created' : 'File created', tone: 'success' })
      setIsCreateModalOpen(false)

      if (type === 'file') {
        const created = result as { file?: { id: string; path: string } }
        if (created.file) {
          openFile(created.file.id, created.file.path)
        }
      }
    } catch {
      pushToast({
        title: type === 'folder' ? 'Could not create folder' : 'Could not create file',
        description: 'That path may already exist.',
        tone: 'error',
      })
    }
  }

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return
    }

    try {
      const result = await uploadMutation.mutateAsync({ pathPrefix: '', files })
      pushToast({ title: `${result.count} file(s) uploaded`, tone: 'success' })
    } catch {
      pushToast({ title: 'Upload failed', tone: 'error' })
    }
  }

  const handleIndex = async () => {
    try {
      await indexMutation.mutateAsync(repoId)
      pushToast({ title: 'Repository indexed for AI', tone: 'success' })
    } catch {
      pushToast({ title: 'Indexing failed', tone: 'error' })
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-cyan-200/75">Files</div>
        <div className="flex gap-2">
          {canEdit ? (
            <button type="button" onClick={() => void handleNewFile()} className="text-xs text-slate-400 hover:text-white">
              + New
            </button>
          ) : null}
          {canEdit ? (
            <button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs text-slate-400 hover:text-white">
              Upload
            </button>
          ) : null}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(event) => void handleUpload(event.target.files)}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => void handleIndex()}
        disabled={indexMutation.isPending}
        className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-left text-xs text-slate-300 hover:bg-white/[0.08] disabled:opacity-50"
      >
        {indexMutation.isPending ? 'Indexing for AI...' : indexMutation.isSuccess ? 'Indexed for AI ✓' : 'Index for AI'}
      </button>

      <div className="min-h-[160px] flex-1 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.02] p-2">
        {treeQuery.isLoading ? (
          <div className="p-2 text-xs text-slate-500">Loading files...</div>
        ) : (treeQuery.data ?? []).length === 0 ? (
          <div className="p-2 text-xs text-slate-500">No files yet.</div>
        ) : (
          (treeQuery.data ?? []).map((node) => (
            <TreeNode key={node.path} node={node} activeFileId={fileId} onSelect={openFile} />
          ))
        )}
      </div>

      <div>
        <Tabs
          tabs={[
            { id: 'search', label: 'Search' },
            { id: 'history', label: 'History' },
            { id: 'activity', label: 'Activity' },
            { id: 'github', label: 'Sync' },
          ]}
          activeTab={sidePanelTab}
          onChange={setSidePanelTab}
        />

        <div className="mt-3 max-h-64 overflow-y-auto text-sm">
          {sidePanelTab === 'search' ? (
            <div className="grid gap-2">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search files"
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white outline-none placeholder:text-slate-500 focus:border-cyan-300"
              />
              {(searchResultsQuery.data ?? []).map((result) => (
                <button
                  key={result.fileId}
                  type="button"
                  onClick={() => openFile(result.fileId, result.path)}
                  className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-left text-xs text-slate-300 hover:border-cyan-300/40"
                >
                  {result.path}
                </button>
              ))}
            </div>
          ) : null}

          {sidePanelTab === 'history' ? (
            <div className="grid gap-2 text-xs text-slate-400">
              {!fileId ? 'Select a file to see its history.' : 'Open the file to view its version list.'}
            </div>
          ) : null}

          {sidePanelTab === 'activity' ? (
            <div className="grid gap-2">
              {(activityQuery.data ?? []).slice(0, 8).map((item) => (
                <div key={item.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-xs">
                  <div className="text-slate-200">
                    {item.type === 'commit' ? `Commit: ${item.message}` : `${item.changeType} · ${item.file?.path}`}
                  </div>
                  <div className="mt-1 text-slate-500">
                    {item.actor.name} · {formatTimestamp(item.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {sidePanelTab === 'github' ? (
            <div className="grid gap-2 text-xs">
              {isGithubRepo ? (
                <>
                  <div className="text-slate-400">
                    {activeRepo?.githubOwner}/{activeRepo?.githubRepo}
                    {activeRepo?.githubLastSyncedAt ? ` · synced ${formatTimestamp(activeRepo.githubLastSyncedAt)}` : ''}
                  </div>
                  <button
                    type="button"
                    disabled={!canEdit || pullGithubMutation.isPending}
                    onClick={() => void pullGithubMutation.mutateAsync(repoId)}
                    className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-left hover:bg-white/[0.08] disabled:opacity-50"
                  >
                    {pullGithubMutation.isPending ? 'Pulling...' : 'Pull from GitHub'}
                  </button>
                  <button
                    type="button"
                    disabled={!canEdit || pushGithubMutation.isPending}
                    onClick={() => void pushGithubMutation.mutateAsync({ repoId })}
                    className="rounded-lg bg-cyan-300 px-3 py-1.5 text-left text-slate-950 hover:bg-cyan-200 disabled:opacity-50"
                  >
                    {pushGithubMutation.isPending ? 'Pushing...' : 'Push to GitHub'}
                  </button>
                </>
              ) : (
                <div className="text-slate-500">This repository isn't linked to GitHub.</div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
