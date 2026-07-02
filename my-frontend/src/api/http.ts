import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  setSession,
} from '../auth/session-storage'
import type { AuthSession } from '../types/api'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api'
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '')

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

let refreshInFlight: Promise<boolean> | null = null

const refreshSession = async (): Promise<boolean> => {
  const refreshToken = getRefreshToken()

  if (!refreshToken) {
    return false
  }

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        })

        if (!response.ok) {
          clearSession()
          return false
        }

        const data = (await response.json()) as AuthSession
        setSession(data.accessToken, data.refreshToken, data.user)
        return true
      } finally {
        refreshInFlight = null
      }
    })()
  }

  return refreshInFlight
}

type RequestOptions = {
  method?: string
  body?: unknown
  isRetry?: boolean
}

export const apiRequest = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const token = getAccessToken()

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  if (
    response.status === 401 &&
    !options.isRetry &&
    getRefreshToken() &&
    !path.startsWith('/auth/')
  ) {
    const refreshed = await refreshSession()

    if (refreshed) {
      return apiRequest<T>(path, { ...options, isRetry: true })
    }
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}) as Record<string, unknown>)
    throw new ApiError(
      response.status,
      (errorBody.error as string) || (errorBody.message as string) || 'Request failed'
    )
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export const apiUpload = async <T>(path: string, formData: FormData): Promise<T> => {
  const token = getAccessToken()

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}) as Record<string, unknown>)
    throw new ApiError(
      response.status,
      (errorBody.error as string) || (errorBody.message as string) || 'Upload failed'
    )
  }

  return (await response.json()) as T
}
