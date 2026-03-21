import { CreateWorkspaceCard } from './create-workspace-card'
import { WorkspaceCard } from './workspace-card'
import { Skeleton } from '../../../components/ui/skeleton'
import type { WorkspaceMembership } from '../../../types/workspace'

type DashboardContentProps = {
  workspaces: WorkspaceMembership[]
  isLoading: boolean
  onCreateWorkspace: (payload: { name: string; description: string }) => void
  isCreatingWorkspace: boolean
  onOpenWorkspace: (membership: WorkspaceMembership) => void
}

export function DashboardContent({
  workspaces,
  isLoading,
  onCreateWorkspace,
  isCreatingWorkspace,
  onOpenWorkspace,
}: DashboardContentProps) {
  return (
    <div className="grid gap-6">
      <section className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <CreateWorkspaceCard
          isPending={isCreatingWorkspace}
          onCreate={onCreateWorkspace}
        />

        <div className="panel-dark-soft rounded-[1.75rem] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/75">
                Dashboard
              </div>
              <h2 className="mt-2 font-['Space_Grotesk',_'Segoe_UI',_sans-serif] text-3xl font-semibold text-white">
                Workspaces & projects
              </h2>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-medium text-slate-200">
              {workspaces.length} workspace{workspaces.length === 1 ? '' : 's'}
            </div>
          </div>

          <div className="mt-5 text-sm text-slate-400">
            Use the dashboard to see all your workspaces and jump straight into
            their repositories.
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
      ) : workspaces.length === 0 ? (
        <div className="rounded-[1.75rem] border border-dashed border-slate-700 bg-slate-950/45 p-8 text-center text-slate-400">
          No workspaces yet. Create your first workspace to start organizing
          repositories and collaborators.
        </div>
      ) : (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {workspaces.map((membership) => (
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
