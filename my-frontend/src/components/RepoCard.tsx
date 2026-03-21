import type { Repository } from '../types/repository'

type RepoCardProps = {
  repository: Repository
  isActive: boolean
  onOpen: (repository: Repository) => void
}

export function RepoCard({
  repository,
  isActive,
  onOpen,
}: RepoCardProps) {
  return (
    <article
      className={`rounded-2xl border px-4 py-4 text-left transition ${
        isActive
          ? 'border-cyan-300/30 bg-cyan-300/12 text-white shadow-[0_14px_40px_rgba(34,211,238,0.14)]'
          : 'border-white/10 bg-white/[0.04] text-slate-100 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.08]'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="font-semibold">{repository.name}</div>
        <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
          {isActive ? 'opened' : repository.provider || 'local'}
        </div>
      </div>

      <div className={`mt-2 text-sm ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>
        {repository.description || 'No repository description'}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="text-xs text-slate-500">
          {new Date(repository.createdAt).toLocaleDateString()}
        </div>
        <button
          type="button"
          onClick={() => onOpen(repository)}
          className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
            isActive
              ? 'bg-cyan-300 text-slate-950'
              : 'border border-white/10 bg-white/[0.06] text-white hover:bg-white/[0.12]'
          }`}
        >
          {isActive ? 'Opened' : 'Open repo'}
        </button>
      </div>
    </article>
  )
}
