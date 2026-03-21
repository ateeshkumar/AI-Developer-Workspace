import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'

import { AuthShell } from '../components/auth/auth-shell'
import { useToast } from '../hooks/use-toast'
import { register } from '../services/auth'
import { useAuthStore } from '../store/auth-store'

export function RegisterPage() {
  const navigate = useNavigate()
  const { token, setAuth } = useAuthStore()
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const registerMutation = useMutation({
    mutationFn: register,
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken)
      toast({
        title: 'Account created',
        description: 'You are now signed in.',
        tone: 'success',
      })
      navigate('/', { replace: true })
    },
    onError: () => {
      toast({
        title: 'Registration failed',
        description: 'Please verify your details and try again.',
        tone: 'error',
      })
    },
  })

  if (token) {
    return <Navigate to="/" replace />
  }

  const errorMessage = (() => {
    if (!registerMutation.error) {
      return null
    }

    if (axios.isAxiosError(registerMutation.error)) {
      return (
        (registerMutation.error.response?.data as { error?: string } | undefined)
          ?.error ?? 'Registration failed'
      )
    }

    return 'Registration failed'
  })()

  return (
    <AuthShell
      badge="Create Access"
      title="Create your engineering account"
      description="Register against the backend auth module and enter the protected application immediately after account creation."
      formTitle="Create account"
      formDescription="Your credentials are stored server-side and the frontend persists the resulting session."
      footerText="Already have an account?"
      footerLinkLabel="Sign in"
      footerLinkTo="/login"
    >
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          registerMutation.mutate({ name, email, password })
        }}
      >
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-300">Name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ateesh"
            className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-slate-100 outline-none focus:border-cyan-300"
          />
        </label>

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
            placeholder="At least 6 characters"
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
          disabled={registerMutation.isPending}
          className="rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 hover:-translate-y-0.5 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {registerMutation.isPending ? 'Creating account...' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  )
}
