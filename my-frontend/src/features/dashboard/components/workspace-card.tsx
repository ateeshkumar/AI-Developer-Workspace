import type { WorkspaceMembership } from '../../../types/workspace'

type WorkspaceCardProps = {
  membership: WorkspaceMembership
  onOpen: (membership: WorkspaceMembership) => void
}

export function WorkspaceCard({
  membership,
  onOpen,
}: WorkspaceCardProps) {
  const { workspace } = membership

  return (
    <article className="panel-dark-soft rounded-[1.75rem] p-5 transition hover:-translate-y-1 hover:border-cyan-300/20 hover:shadow-[0_28px_70px_rgba(8,47,73,0.24)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/75">
            {membership.role}
          </div>
          <h3 className="mt-3 font-['Space_Grotesk',_'Segoe_UI',_sans-serif] text-2xl font-semibold text-white">
            {workspace.name}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            {workspace.description || 'No workspace description yet.'}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-medium text-slate-200">
          {workspace.repos.length} repo{workspace.repos.length === 1 ? '' : 's'}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 text-sm text-slate-300 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Workspace ID
          </div>
          <div className="mt-2 break-all">{workspace.id}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Created
          </div>
          <div className="mt-2">
            {new Date(workspace.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onOpen(membership)}
        className="mt-5 rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 hover:-translate-y-0.5 hover:bg-cyan-200"
      >
        Open workspace
      </button>
    </article>
  )
}
