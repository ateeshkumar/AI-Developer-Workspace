import axios from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api',
})

const authApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api',
})

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')

  if (token) {
    config.headers.Authorization = token.startsWith('Bearer ')
      ? token
      : `Bearer ${token}`
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined
    const status = error.response?.status
    const refreshToken = localStorage.getItem('refreshToken')

    if (
      status !== 401 ||
      !refreshToken ||
      !originalRequest ||
      originalRequest._retry ||
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/register') ||
      originalRequest.url?.includes('/auth/refresh')
    ) {
      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      const response = await authApi.post('/auth/refresh', { refreshToken })
      const { accessToken, refreshToken: nextRefreshToken, user } = response.data as {
        accessToken: string
        refreshToken: string
        user?: unknown
      }

      localStorage.setItem('token', accessToken)
      localStorage.setItem('refreshToken', nextRefreshToken)
      if (user) {
        localStorage.setItem('user', JSON.stringify(user))
      }

      originalRequest.headers = originalRequest.headers ?? {}
      originalRequest.headers.Authorization = `Bearer ${accessToken}`

      return api(originalRequest)
    } catch (refreshError) {
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      return Promise.reject(refreshError)
    }
  }
)

export const setAuthToken = (token?: string) => {
  if (token) {
    localStorage.setItem('token', token)
    return
  }

  localStorage.removeItem('token')
}
