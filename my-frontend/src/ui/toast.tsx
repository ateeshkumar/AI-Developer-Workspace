import { useEffect, useState } from 'react'

export type ToastTone = 'success' | 'error' | 'info'

export type ToastMessage = {
  id: string
  title: string
  description?: string
  tone: ToastTone
}

type Listener = (toast: ToastMessage) => void

const listeners = new Set<Listener>()

export const pushToast = (toast: Omit<ToastMessage, 'id'>) => {
  const message: ToastMessage = { ...toast, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` }
  listeners.forEach((listener) => listener(message))
}

const toneClasses: Record<ToastTone, string> = {
  success: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100',
  error: 'border-rose-400/30 bg-rose-400/10 text-rose-100',
  info: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-100',
}

export function ToastHost() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    const listener: Listener = (toast) => {
      setToasts((current) => [...current, toast])
      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== toast.id))
      }, 4000)
    }

    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 grid gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto w-72 rounded-xl border px-4 py-3 text-sm shadow-lg ${toneClasses[toast.tone]}`}
        >
          <div className="font-semibold">{toast.title}</div>
          {toast.description ? <div className="mt-1 text-xs opacity-90">{toast.description}</div> : null}
        </div>
      ))}
    </div>
  )
}
