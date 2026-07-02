import '@xterm/xterm/css/xterm.css'
import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import { useEffect, useRef, useState } from 'react'

import {
  AI_SERVICE_ORIGIN,
  destroyTerminalSession,
  useCreateTerminalSession,
  useDestroyTerminalSession,
  useTerminalSessionPorts,
} from '../../api/terminal'
import { getAccessToken } from '../../auth/session-storage'
import { pushToast } from '../../ui/toast'
import { useIde } from './ide-context'

export function TerminalPane() {
  const { repoId, isTerminalOpen, toggleTerminal } = useIde()
  const containerRef = useRef<HTMLDivElement>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const requestedRef = useRef(false)

  const createSessionMutation = useCreateTerminalSession()
  const destroySessionMutation = useDestroyTerminalSession()
  const portsQuery = useTerminalSessionPorts(repoId, sessionId)

  useEffect(() => {
    if (!isTerminalOpen || sessionId || requestedRef.current) {
      return
    }

    requestedRef.current = true
    createSessionMutation.mutate(repoId, {
      onSuccess: (session) => setSessionId(session.session_id),
      onError: () => {
        pushToast({
          title: 'Could not start terminal',
          description: 'Check that the AI service has Docker access.',
          tone: 'error',
        })
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTerminalOpen])

  useEffect(() => {
    if (!sessionId || !containerRef.current) {
      return
    }

    const term = new Terminal({ convertEol: true, fontSize: 13, theme: { background: '#0b1120' } })
    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(containerRef.current)
    fitAddon.fit()

    const token = getAccessToken()
    const wsOrigin = AI_SERVICE_ORIGIN.replace(/^http/, 'ws')
    const socket = new WebSocket(`${wsOrigin}/terminal/${sessionId}?token=${encodeURIComponent(token ?? '')}`)
    socket.binaryType = 'arraybuffer'

    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({ type: 'resize', rows: term.rows, cols: term.cols }))
    })

    socket.addEventListener('message', (event) => {
      term.write(typeof event.data === 'string' ? event.data : new Uint8Array(event.data as ArrayBuffer))
    })

    const dataListener = term.onData((data) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'input', data }))
      }
    })

    const resizeListener = term.onResize(({ rows, cols }) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'resize', rows, cols }))
      }
    })

    const handleWindowResize = () => fitAddon.fit()
    window.addEventListener('resize', handleWindowResize)

    return () => {
      window.removeEventListener('resize', handleWindowResize)
      dataListener.dispose()
      resizeListener.dispose()
      socket.close()
      term.dispose()
    }
  }, [sessionId])

  const handleStop = async () => {
    if (!sessionId) {
      return
    }

    try {
      await destroySessionMutation.mutateAsync({ repoId, sessionId })
      setSessionId(null)
      requestedRef.current = false
    } catch {
      pushToast({ title: 'Could not stop session', tone: 'error' })
    }
  }

  useEffect(() => {
    return () => {
      if (sessionId) {
        void destroyTerminalSession(repoId, sessionId).catch(() => {})
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!isTerminalOpen) {
    return (
      <button
        type="button"
        onClick={toggleTerminal}
        className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300 hover:bg-white/[0.08]"
      >
        Open terminal
      </button>
    )
  }

  const livePorts = Object.entries(portsQuery.data?.ports ?? {}).filter(([, hostPort]) => hostPort !== null)

  return (
    <div className="flex h-64 flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-xs text-slate-300">
        <span>Terminal {sessionId ? '· connected' : '· starting...'}</span>
        <div className="flex items-center gap-3">
          {livePorts.map(([port, hostPort]) => (
            <a
              key={port}
              href={`http://${portsQuery.data?.host}:${hostPort}`}
              target="_blank"
              rel="noreferrer"
              className="text-cyan-300 hover:text-cyan-200"
            >
              Preview :{port} ↗
            </a>
          ))}
          <button type="button" onClick={toggleTerminal} className="text-slate-400 hover:text-white">
            Hide
          </button>
          <button type="button" onClick={() => void handleStop()} className="text-rose-300 hover:text-rose-200">
            Stop
          </button>
        </div>
      </div>
      <div ref={containerRef} className="flex-1 overflow-hidden p-2" />
    </div>
  )
}
