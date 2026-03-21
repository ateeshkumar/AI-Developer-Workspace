import { create } from 'zustand'

export type ToastTone = 'info' | 'success' | 'error'

export type ToastItem = {
  id: string
  title: string
  description?: string
  tone: ToastTone
}

type ToastState = {
  toasts: ToastItem[]
  pushToast: (toast: Omit<ToastItem, 'id'>) => void
  dismissToast: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  pushToast: (toast) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`

    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }))

    window.setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((item) => item.id !== id),
      }))
    }, 3600)
  },
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
}))
