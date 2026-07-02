import { useMutation } from '@tanstack/react-query'

import { apiRequest } from './http'
import type { AuthSession } from '../types/api'

export const registerAccount = (payload: { name: string; email: string; password: string }) =>
  apiRequest<AuthSession>('/auth/register', { method: 'POST', body: payload })

export const login = (payload: { email: string; password: string }) =>
  apiRequest<AuthSession>('/auth/login', { method: 'POST', body: payload })

export const logout = (refreshToken: string) =>
  apiRequest<{ success: boolean }>('/auth/logout', { method: 'POST', body: { refreshToken } })

export const useRegister = () =>
  useMutation({
    mutationFn: registerAccount,
  })

export const useLogin = () =>
  useMutation({
    mutationFn: login,
  })

export const useLogout = () =>
  useMutation({
    mutationFn: logout,
  })
