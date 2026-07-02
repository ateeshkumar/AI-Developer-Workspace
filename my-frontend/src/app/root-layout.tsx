import { Outlet, useNavigate } from 'react-router-dom'

import { useAuth } from '../auth/auth-context'
import { Button } from '../ui/button'
import { ToastHost } from '../ui/toast'

export function RootLayout() {
  const { user, isAuthenticated, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <ToastHost />
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div className="text-lg font-semibold text-white">Engineering Workspace</div>
        {isAuthenticated ? (
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <span>{user?.name}</span>
            <Button variant="secondary" onClick={() => void handleSignOut()}>
              Sign out
            </Button>
          </div>
        ) : null}
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  )
}
