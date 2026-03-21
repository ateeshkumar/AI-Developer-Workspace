import { useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'

import { FileUpload } from '../../../components/FileUpload'
import {
  useFileHistory,
  useRepositories,
  useRepositoryTree,
} from '../../../hooks/use-repositories'
import { FileTree } from '../../../components/FileTree'
import { useRepositoryEditorSync } from '../../../hooks/use-repository-editor-sync'
import { getFileHistory } from '../../../services/repository'
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
  const repositoriesQuery = useRepositories(workspaceId)
  const treeQuery = useRepositoryTree(repoId)
  const historyQuery = useFileHistory(repoId, fileId)

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
    onEditorChange,
  })

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

        <FileTree
          nodes={treeQuery.data ?? []}
          activeFileId={fileId}
          onFileSelect={handleFileSelect}
        />

        <section className="panel-dark-soft rounded-[1.75rem] p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/75">
            Selection
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
          </div>
          {repoId && !fileId ? (
            <div className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm text-cyan-100">
              Repository opened. Choose a file from the explorer to load it in the editor.
            </div>
          ) : null}
        </section>
      </div>

      <EditorWorkspace
        accessToken={accessToken}
        fileId={fileId}
        filePath={filePath || 'No file selected'}
        content={content}
        tabs={openTabs}
        saveState={syncState.saveState}
        onSelectTab={onSelectTab}
        onCloseTab={onCloseTab}
        onChange={onEditorChange}
      />
    </div>
  )
}
