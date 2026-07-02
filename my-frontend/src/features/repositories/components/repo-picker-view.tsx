import { RepoList } from '../../../pages/RepoList'
import type { Repository } from '../../../types/repository'

type RepoPickerViewProps = {
  workspaceId: string
  repositories: Repository[]
  isLoading: boolean
  onSelectRepo: (repo: Repository) => void
}

export function RepoPickerView({
  workspaceId,
  repositories,
  isLoading,
  onSelectRepo,
}: RepoPickerViewProps) {
  return (
    <RepoList
      workspaceId={workspaceId}
      repositories={repositories}
      activeRepoId=""
      isLoading={isLoading}
      onOpenRepo={onSelectRepo}
    />
  )
}
