import { useRepositories } from '../../../hooks/use-repositories'
import type { EditorTab, Repository } from '../../../types/repository'
import { RepoIdeView } from './repo-ide-view'
import { RepoPickerView } from './repo-picker-view'

type IndexRepoMutationLike = {
  isPending: boolean
  isSuccess: boolean
  isError: boolean
  variables?: string
}

type RepositoryContentProps = {
  workspaceId: string
  repoId: string
  fileId: string
  filePath: string
  content: string
  openTabs: EditorTab[]
  accessToken: string
  socketConnected: boolean
  indexRepoMutation: IndexRepoMutationLike
  onSelectRepo: (repo: Repository) => void
  onBackToRepoList: () => void
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
  indexRepoMutation,
  onSelectRepo,
  onBackToRepoList,
  onSelectFile,
  onSelectTab,
  onCloseTab,
  onEditorChange,
}: RepositoryContentProps) {
  const repositoriesQuery = useRepositories(workspaceId)

  if (!repoId) {
    return (
      <RepoPickerView
        workspaceId={workspaceId}
        repositories={repositoriesQuery.data ?? []}
        isLoading={repositoriesQuery.isLoading}
        onSelectRepo={onSelectRepo}
      />
    )
  }

  return (
    <RepoIdeView
      workspaceId={workspaceId}
      repoId={repoId}
      fileId={fileId}
      filePath={filePath}
      content={content}
      openTabs={openTabs}
      accessToken={accessToken}
      socketConnected={socketConnected}
      indexRepoMutation={indexRepoMutation}
      onBackToRepoList={onBackToRepoList}
      onSelectFile={onSelectFile}
      onSelectTab={onSelectTab}
      onCloseTab={onCloseTab}
      onEditorChange={onEditorChange}
    />
  )
}
