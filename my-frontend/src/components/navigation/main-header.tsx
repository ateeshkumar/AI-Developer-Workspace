import { StatusPill } from '../ui/status-pill'
import { UserProfileDropdown } from './user-profile-dropdown'

type MainHeaderProps = {
  title: string
  description: string
  healthLabel: string
  socketConnected: boolean
}

export function MainHeader({
  title,
  description,
  healthLabel,
  socketConnected,
}: MainHeaderProps) {
  return (
    <header className="panel-dark flex flex-col gap-4 rounded-[2rem] p-5 md:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3">
          <span className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
            Main Layout
          </span>
          <div className="space-y-2">
            <h1 className="font-['Space_Grotesk',_'Segoe_UI',_sans-serif] text-3xl font-bold tracking-tight text-white md:text-5xl">
              {title}
            </h1>
            <p className="max-w-3xl text-sm text-slate-300 md:text-base">
              {description}
            </p>
          </div>
        </div>

        <div className="flex items-start justify-between gap-3 sm:justify-end">
          <div className="surface-dark grid gap-2 rounded-[1.5rem] p-4 text-slate-100">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs uppercase tracking-[0.24em] text-slate-400">
                Backend
              </span>
              <StatusPill label={healthLabel} tone="emerald" />
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs uppercase tracking-[0.24em] text-slate-400">
                Realtime
              </span>
              <StatusPill
                label={socketConnected ? 'Connected' : 'Idle'}
                tone="sky"
              />
            </div>
          </div>

          <UserProfileDropdown />
        </div>
      </div>
    </header>
  )
}
