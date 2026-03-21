import { useState } from 'react'

import { useAuthStore } from '../../store/auth-store'

export function UserProfileDropdown() {
  const [open, setOpen] = useState(false)
  const { user, logout } = useAuthStore()

  const initials = (user?.name || user?.email || 'U')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-3 rounded-2xl border border-stone-300 bg-white px-3 py-2 text-left shadow-sm transition hover:border-stone-950"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-950 text-sm font-semibold text-stone-50">
          {initials}
        </span>
        <span className="hidden min-w-0 sm:block">
          <span className="block truncate text-sm font-semibold text-stone-900">
            {user?.name || 'Authenticated User'}
          </span>
          <span className="block truncate text-xs text-stone-500">
            {user?.email || 'No email'}
          </span>
        </span>
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.75rem)] z-20 min-w-[220px] rounded-2xl border border-stone-200 bg-white p-2 shadow-[0_20px_45px_rgba(40,30,15,0.12)]">
          <div className="rounded-xl px-3 py-2">
            <div className="text-xs uppercase tracking-[0.2em] text-stone-400">
              Signed in as
            </div>
            <div className="mt-2 text-sm font-semibold text-stone-900">
              {user?.name || 'User'}
            </div>
            <div className="mt-1 break-all text-xs text-stone-500">
              {user?.email || 'No email'}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              logout()
              setOpen(false)
            }}
            className="mt-2 w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            Logout
          </button>
        </div>
      ) : null}
    </div>
  )
}
