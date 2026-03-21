import type { NavigationItem } from '../../types/navigation'

type SidebarNavProps = {
  items: NavigationItem[]
  activeItem: NavigationItem['id']
  onSelect: (id: NavigationItem['id']) => void
}

export function SidebarNav({
  items,
  activeItem,
  onSelect,
}: SidebarNavProps) {
  return (
    <aside className="panel-dark flex h-full flex-col justify-between rounded-[2rem] p-5 text-slate-100">
      <div>
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
            Workspace OS
          </div>
          <div className="mt-3 font-['Space_Grotesk',_'Segoe_UI',_sans-serif] text-2xl font-semibold">
            Engineering Panel
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Central navigation for product, repositories, and AI workflows.
          </p>
        </div>

        <nav className="mt-6 grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
          {items.map((item) => {
            const isActive = item.id === activeItem

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                className={`flex items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                  isActive
                    ? 'bg-cyan-300 text-slate-950 shadow-[0_12px_35px_rgba(34,211,238,0.28)]'
                    : 'bg-white/[0.04] text-slate-200 hover:-translate-y-0.5 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                <span>{item.label}</span>
                <span className="text-xs uppercase tracking-[0.2em]">
                  Open
                </span>
              </button>
            )
          })}
        </nav>
      </div>

      <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-400">
        Use the sidebar to switch the primary content area between dashboard,
        repositories, and AI assistant views.
      </div>
    </aside>
  )
}
