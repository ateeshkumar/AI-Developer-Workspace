import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useLogin } from '../../api/auth'
import { useAuth } from '../../auth/auth-context'
import { Button } from '../../ui/button'
import { Panel } from '../../ui/panel'
import { pushToast } from '../../ui/toast'

export function LoginRoute() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const loginMutation = useLogin()
  const { applySession } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    try {
      const session = await loginMutation.mutateAsync({ email, password })
      applySession(session)
      navigate('/w')
    } catch {
      pushToast({ title: 'Login failed', description: 'Check your email and password.', tone: 'error' })
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-sm">
      <Panel>
        <h1 className="text-2xl font-semibold text-white">Sign in</h1>
        <form className="mt-6 grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300"
          />
          <Button type="submit" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
        <p className="mt-4 text-sm text-slate-400">
          No account? <Link to="/register" className="text-cyan-300">Register</Link>
        </p>
      </Panel>
    </div>
  )
}
