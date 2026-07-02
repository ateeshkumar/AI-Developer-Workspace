import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

import { logout as logoutRequest } from '../api/auth'
import { clearSession, getAccessToken, getRefreshToken, getStoredUser, setSession } from './session-storage'
import type { AuthSession, User } from '../types/api'

type AuthContextValue = {
  user: User | null
  isAuthenticated: boolean
  applySession: (session: AuthSession) => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getStoredUser())

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user && getAccessToken()),
      applySession: (session: AuthSession) => {
        setSession(session.accessToken, session.refreshToken, session.user)
        setUser(session.user)
      },
      signOut: async () => {
        const refreshToken = getRefreshToken()

        if (refreshToken) {
          await logoutRequest(refreshToken).catch(() => {})
        }

        clearSession()
        setUser(null)
      },
    }),
    [user]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
