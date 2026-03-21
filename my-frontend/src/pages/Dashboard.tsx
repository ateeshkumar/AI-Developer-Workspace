import { useMemo, useState } from 'react'

import { CreateWorkspaceModal } from '../components/CreateWorkspaceModal'
import { WorkspaceCard } from '../components/WorkspaceCard'
import { Skeleton } from '../components/ui/skeleton'
import type { WorkspaceMembership } from '../types/workspace'

type DashboardProps = {
  workspaces: WorkspaceMembership[]
  isLoading: boolean
  isCreatingWorkspace: boolean
  onCreateWorkspace: (payload: { name: string; description: string }) => void
  onOpenWorkspace: (membership: WorkspaceMembership) => void
}

export function Dashboard({
  workspaces,
  isLoading,
  isCreatingWorkspace,
  onCreateWorkspace,
  onOpenWorkspace,
}: DashboardProps) {
  const [search, setSearch] = useState('')

  const filteredWorkspaces = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) {
      return workspaces
    }

    return workspaces.filter((membership) => {
      const { workspace, role } = membership
      const haystack = [
        workspace.name,
        workspace.description ?? '',
        role,
      ].join(' ').toLowerCase()

      return haystack.includes(query)
    })
  }, [search, workspaces])

  return (
    <div className="grid gap-6">
      <section className="panel-dark rounded-[1.75rem] p-5 md:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/75">
              Dashboard
            </div>
            <h2 className="mt-2 font-['Space_Grotesk',_'Segoe_UI',_sans-serif] text-3xl font-semibold text-white md:text-4xl">
              Workspaces
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Browse all workspaces, search quickly, and jump into the one you want to open.
            </p>
          </div>

          <CreateWorkspaceModal
            isPending={isCreatingWorkspace}
            onCreate={onCreateWorkspace}
          />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search workspaces"
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-300"
          />
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-medium text-slate-200">
            {filteredWorkspaces.length} result{filteredWorkspaces.length === 1 ? '' : 's'}
          </div>
        </div>
      </section>

      {isLoading ? (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="panel-dark-soft rounded-[1.75rem] p-5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="mt-4 h-8 w-2/3" />
              <Skeleton className="mt-3 h-16 w-full" />
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
              <Skeleton className="mt-5 h-12 w-40" />
            </div>
          ))}
        </section>
      ) : filteredWorkspaces.length === 0 ? (
        <div className="rounded-[1.75rem] border border-dashed border-slate-700 bg-slate-950/45 p-8 text-center text-slate-400">
          {workspaces.length === 0
            ? 'No workspaces yet. Create your first workspace to get started.'
            : 'No workspaces matched your search.'}
        </div>
      ) : (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredWorkspaces.map((membership) => (
            <WorkspaceCard
              key={membership.id}
              membership={membership}
              onOpen={onOpenWorkspace}
            />
          ))}
        </section>
      )}
    </div>
  )
}
