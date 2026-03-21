import { api } from './api'
import type { AuthResponse, LoginPayload, RegisterPayload } from '../types/auth'

export const login = async (payload: LoginPayload) => {
  const { data } = await api.post<AuthResponse>('/auth/login', payload)
  return data
}

export const register = async (payload: RegisterPayload) => {
  const { data } = await api.post<AuthResponse>('/auth/register', payload)
  return data
}

export const refreshAccessToken = async (refreshToken: string) => {
  const { data } = await api.post<AuthResponse>('/auth/refresh', { refreshToken })
  return data
}
