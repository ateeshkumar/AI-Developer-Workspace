import { create } from 'zustand'

import type { AuthUser } from '../types/auth'

type AuthState = {
  user: AuthUser | null
  token: string | null
  refreshToken: string | null
  setAuth: (
    user: AuthUser | null,
    token: string,
    refreshToken?: string | null,
  ) => void
  logout: () => void
}

const getStoredToken = () => localStorage.getItem('token')
const getStoredRefreshToken = () => localStorage.getItem('refreshToken')
const getStoredUser = (): AuthUser | null => {
  const raw = localStorage.getItem('user')

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    localStorage.removeItem('user')
    return null
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: getStoredUser(),
  token: getStoredToken(),
  refreshToken: getStoredRefreshToken(),

  setAuth: (user, token, refreshToken = null) => {
    localStorage.setItem('token', token)
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken)
    } else {
      localStorage.removeItem('refreshToken')
    }

    if (user) {
      localStorage.setItem('user', JSON.stringify(user))
    } else {
      localStorage.removeItem('user')
    }

    set({ user, token, refreshToken })
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    set({ user: null, token: null, refreshToken: null })
  },
}))
