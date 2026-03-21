type AISidebarPanelProps = {
  onAction: (prompt: string) => void
}

const actions = [
  {
    label: 'Explain Code',
    prompt: 'Explain the currently selected code and describe how it works.',
  },
  {
    label: 'Fix Code',
    prompt: 'Review the current code and suggest a concrete fix for bugs or issues.',
  },
  {
    label: 'Refactor Code',
    prompt: 'Refactor the current code for clarity and maintainability without changing behavior.',
  },
]

export function AISidebarPanel({ onAction }: AISidebarPanelProps) {
  return (
    <aside className="rounded-[1.75rem] border border-black/10 bg-stone-950 p-5 text-stone-100 shadow-[0_18px_50px_rgba(78,57,29,0.14)]">
      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300/80">
        AI Actions
      </div>
      <h2 className="mt-3 font-['Space_Grotesk',_'Segoe_UI',_sans-serif] text-2xl font-semibold">
        Senior engineer shortcuts
      </h2>
      <p className="mt-2 text-sm leading-6 text-stone-300">
        Kick off focused prompts with one click, then continue the conversation
        in the chat panel.
      </p>

      <div className="mt-5 grid gap-3">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => onAction(action.prompt)}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-medium transition hover:bg-white/10"
          >
            {action.label}
          </button>
        ))}
      </div>
    </aside>
  )
}
