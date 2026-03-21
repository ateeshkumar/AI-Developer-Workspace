import { useToastStore } from '../../store/toast-store'

const toneClasses = {
  info: 'border-sky-400/25 bg-slate-900/92 text-slate-100',
  success: 'border-emerald-400/25 bg-slate-900/92 text-slate-100',
  error: 'border-rose-400/25 bg-slate-900/92 text-slate-100',
}

export function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts)
  const dismissToast = useToastStore((state) => state.dismissToast)

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 grid gap-3 sm:left-auto sm:right-4 sm:w-[380px]">
      {toasts.map((toast) => (
        <article
          key={toast.id}
          className={`pointer-events-auto animate-toast-in rounded-[1.35rem] border px-4 py-4 shadow-[0_18px_60px_rgba(2,6,23,0.42)] backdrop-blur ${toneClasses[toast.tone]}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold">{toast.title}</div>
              {toast.description ? (
                <p className="mt-1 text-sm text-slate-300">{toast.description}</p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="rounded-full border border-white/10 px-2 py-1 text-xs text-slate-300 hover:bg-white/10 hover:text-white"
            >
              Close
            </button>
          </div>
        </article>
      ))}
    </div>
  )
}
