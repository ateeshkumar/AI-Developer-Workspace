import { useState } from 'react'

type CreateWorkspaceCardProps = {
  isPending: boolean
  onCreate: (payload: { name: string; description: string }) => void
}

export function CreateWorkspaceCard({
  isPending,
  onCreate,
}: CreateWorkspaceCardProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  return (
    <section className="panel-dark rounded-[1.75rem] p-5 text-slate-100">
      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
        Create Workspace
      </div>
      <h3 className="mt-3 font-['Space_Grotesk',_'Segoe_UI',_sans-serif] text-2xl font-semibold">
        Start a new project hub
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-300">
        Create a workspace to organize repositories, collaborators, and AI
        workflows in one place.
      </p>

      <form
        className="mt-5 grid gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          onCreate({ name, description })
          setName('')
          setDescription('')
        }}
      >
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Workspace name"
          className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-300"
        />
        <textarea
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Describe this workspace"
          className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-300"
        />
        <button
          type="submit"
          disabled={isPending || !name.trim()}
          className="rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 hover:-translate-y-0.5 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? 'Creating...' : 'Create workspace'}
        </button>
      </form>
    </section>
  )
}
