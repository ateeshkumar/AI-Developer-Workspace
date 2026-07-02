import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useRegister } from '../../api/auth'
import { useAuth } from '../../auth/auth-context'
import { Button } from '../../ui/button'
import { Panel } from '../../ui/panel'
import { pushToast } from '../../ui/toast'

export function RegisterRoute() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const registerMutation = useRegister()
  const { applySession } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    try {
      const session = await registerMutation.mutateAsync({ name, email, password })
      applySession(session)
      navigate('/w')
    } catch {
      pushToast({
        title: 'Registration failed',
        description: 'That email may already be in use.',
        tone: 'error',
      })
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-sm">
      <Panel>
        <h1 className="text-2xl font-semibold text-white">Create an account</h1>
        <form className="mt-6 grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Name"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300"
          />
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
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password (min 6 characters)"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300"
          />
          <Button type="submit" disabled={registerMutation.isPending}>
            {registerMutation.isPending ? 'Creating account...' : 'Create account'}
          </Button>
        </form>
        <p className="mt-4 text-sm text-slate-400">
          Already have an account? <Link to="/login" className="text-cyan-300">Sign in</Link>
        </p>
      </Panel>
    </div>
  )
}
