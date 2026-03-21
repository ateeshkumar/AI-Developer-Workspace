type DraftSession = {
  accessToken: string
  workspaceId: string
  repoId: string
  fileId: string
}

type SessionSetupPanelProps = {
  draft: DraftSession
  onDraftChange: (value: DraftSession) => void
  onApply: () => void
}

export function SessionSetupPanel({
  draft,
  onDraftChange,
  onApply,
}: SessionSetupPanelProps) {
  return (
    <aside className="rounded-[2rem] border border-black/10 bg-white/75 p-5 shadow-[0_18px_50px_rgba(78,57,29,0.08)] backdrop-blur">
      <div className="mb-4">
        <h2 className="font-['Space_Grotesk',_'Segoe_UI',_sans-serif] text-2xl font-semibold">
          Session Setup
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          Seed the app with backend IDs and auth data while the product UI is
          still being built.
        </p>
      </div>

      <div className="grid gap-3">
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-stone-700">Access token</span>
          <textarea
            rows={4}
            value={draft.accessToken}
            onChange={(event) =>
              onDraftChange({
                ...draft,
                accessToken: event.target.value,
              })
            }
            className="rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-stone-950"
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-medium text-stone-700">Workspace ID</span>
          <input
            value={draft.workspaceId}
            onChange={(event) =>
              onDraftChange({
                ...draft,
                workspaceId: event.target.value,
              })
            }
            className="rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 outline-none transition focus:border-stone-950"
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-medium text-stone-700">Repo ID</span>
          <input
            value={draft.repoId}
            onChange={(event) =>
              onDraftChange({
                ...draft,
                repoId: event.target.value,
              })
            }
            className="rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 outline-none transition focus:border-stone-950"
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-medium text-stone-700">File ID</span>
          <input
            value={draft.fileId}
            onChange={(event) =>
              onDraftChange({
                ...draft,
                fileId: event.target.value,
              })
            }
            className="rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 outline-none transition focus:border-stone-950"
          />
        </label>

        <button
          type="button"
          onClick={onApply}
          className="mt-2 rounded-2xl bg-stone-950 px-4 py-3 text-sm font-semibold text-stone-50 transition hover:bg-stone-800"
        >
          Apply Session
        </button>
      </div>

      <div className="mt-6 rounded-[1.5rem] bg-stone-100 p-4 text-sm text-stone-700">
        <div className="font-semibold text-stone-900">Stack Modules</div>
        <ul className="mt-3 grid gap-2">
          <li>Vite + React + TypeScript runtime</li>
          <li>Tailwind CSS utility-first UI layer</li>
          <li>Zustand state for editor session</li>
          <li>React Query for API caching</li>
          <li>Axios request client</li>
          <li>Monaco Editor workspace panel</li>
          <li>Socket.IO client utility for future event streams</li>
        </ul>
      </div>
    </aside>
  )
}
