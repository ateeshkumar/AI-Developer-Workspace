import { useToast } from '../hooks/use-toast'
import { useCreateRepository } from '../hooks/use-repositories'
import type { Repository } from '../types/repository'
import { CreateRepoModal } from '../components/CreateRepoModal'
import { RepoCard } from '../components/RepoCard'
import { Skeleton } from '../components/ui/skeleton'

type RepoListProps = {
  workspaceId: string
  repositories: Repository[]
  activeRepoId: string
  isLoading: boolean
  onOpenRepo: (repo: Repository) => void
}

export function RepoList({
  workspaceId,
  repositories,
  activeRepoId,
  isLoading,
  onOpenRepo,
}: RepoListProps) {
  const { toast } = useToast()
  const createRepositoryMutation = useCreateRepository()

  const createRepo = async (payload: { name: string; description: string }) => {
    if (!workspaceId) {
      return
    }

    try {
      const repository = await createRepositoryMutation.mutateAsync({
        workspaceId,
        payload: {
          name: payload.name,
          description: payload.description || undefined,
        },
      })

      toast({
        title: 'Repository created',
        description: `${repository.name} is ready.`,
        tone: 'success',
      })
      onOpenRepo(repository)
    } catch {
      toast({
        title: 'Repository creation failed',
        description: 'Make sure this workspace is selected and your access is sufficient.',
        tone: 'error',
      })
    }
  }

  return (
    <section className="panel-dark-soft rounded-[1.75rem] p-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-md">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/75">
            Repositories
          </div>
          <h2 className="mt-2 font-['Space_Grotesk',_'Segoe_UI',_sans-serif] text-2xl font-semibold text-white">
            Repository listing
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-7 text-slate-400">
            View every repository in this workspace, create a new one, or open one to explore files.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[auto_1fr] lg:flex lg:items-center">
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-center text-sm font-medium text-slate-200">
            {repositories.length} repo{repositories.length === 1 ? '' : 's'}
          </div>
          <div className="sm:justify-self-start lg:justify-self-auto">
            <CreateRepoModal
              isPending={createRepositoryMutation.isPending}
              onCreate={createRepo}
              disabled={!workspaceId}
            />
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="mt-3 h-4 w-full" />
              <Skeleton className="mt-4 h-10 w-28" />
            </div>
          ))
        ) : repositories.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-400 md:col-span-2">
            No repositories found yet. Create a new repository to get started.
          </div>
        ) : (
          repositories.map((repository) => (
            <RepoCard
              key={repository.id}
              repository={repository}
              isActive={repository.id === activeRepoId}
              onOpen={onOpenRepo}
            />
          ))
        )}
      </div>
    </section>
  )
}
