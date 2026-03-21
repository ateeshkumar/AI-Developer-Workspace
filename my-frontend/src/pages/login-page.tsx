import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'

import { AuthShell } from '../components/auth/auth-shell'
import { useToast } from '../hooks/use-toast'
import { login } from '../services/auth'
import { useAuthStore } from '../store/auth-store'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { token, setAuth } = useAuthStore()
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const from = (location.state as { from?: string } | null)?.from || '/'

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken)
      toast({
        title: 'Welcome back',
        description: 'Your workspace session is ready.',
        tone: 'success',
      })
      navigate(from, { replace: true })
    },
    onError: () => {
      toast({
        title: 'Sign in failed',
        description: 'Check your credentials and backend connection.',
        tone: 'error',
      })
    },
  })

  if (token) {
    return <Navigate to="/" replace />
  }

  const errorMessage = (() => {
    if (!loginMutation.error) {
      return null
    }

    if (axios.isAxiosError(loginMutation.error)) {
      return (
        (loginMutation.error.response?.data as { error?: string } | undefined)
          ?.error ?? 'Login failed'
      )
    }

    return 'Login failed'
  })()

  return (
    <AuthShell
      badge="Auth Ready"
      title="Sign in to the engineering workspace"
      description="Use your backend account to access the protected workspace, repository tools, and AI assistant surface."
      formTitle="Welcome back"
      formDescription="Use a backend account from your auth module to enter the app."
      footerText="Need an account?"
      footerLinkLabel="Create one"
      footerLinkTo="/register"
    >
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          loginMutation.mutate({ email, password })
        }}
      >
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-300">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-slate-100 outline-none focus:border-cyan-300"
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-300">Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="********"
            className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-slate-100 outline-none focus:border-cyan-300"
          />
        </label>

        {errorMessage ? (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {errorMessage}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loginMutation.isPending}
          className="rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 hover:-translate-y-0.5 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </AuthShell>
  )
}
