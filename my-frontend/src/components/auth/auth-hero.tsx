type AuthHeroProps = {
  badge: string
  title: string
  description: string
}

export function AuthHero({
  badge,
  title,
  description,
}: AuthHeroProps) {
  return (
    <div className="rounded-[1.75rem] bg-stone-950 p-6 text-stone-100">
      <span className="inline-flex rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">
        {badge}
      </span>
      <h1 className="mt-5 font-['Space_Grotesk',_'Segoe_UI',_sans-serif] text-4xl font-bold tracking-tight md:text-5xl">
        {title}
      </h1>
      <p className="mt-4 max-w-xl text-sm leading-7 text-stone-300 md:text-base">
        {description}
      </p>

      <div className="mt-8 grid gap-3 text-sm text-stone-300">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          React Query handles async auth mutations and error states.
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          Zustand stores the session in memory and persists it in localStorage.
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          Protected routes redirect unauthenticated users to the login page.
        </div>
      </div>
    </div>
  )
}
