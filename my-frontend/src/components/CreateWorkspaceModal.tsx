import { useState } from 'react'

type CreateWorkspaceModalProps = {
  isPending: boolean
  onCreate: (payload: { name: string; description: string }) => void
}

export function CreateWorkspaceModal({
  isPending,
  onCreate,
}: CreateWorkspaceModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const closeModal = () => {
    setIsOpen(false)
    setName('')
    setDescription('')
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 hover:-translate-y-0.5 hover:bg-cyan-200"
      >
        Create workspace
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/70 px-4 backdrop-blur-sm">
          <div className="panel-dark w-full max-w-xl rounded-[1.75rem] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/75">
                  New workspace
                </div>
                <h2 className="mt-2 font-['Space_Grotesk',_'Segoe_UI',_sans-serif] text-3xl font-semibold text-white">
                  Create a workspace
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  Set up a new collaboration space for repositories, files, and AI tools.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/[0.08] hover:text-white"
              >
                Close
              </button>
            </div>

            <form
              className="mt-6 grid gap-4"
              onSubmit={(event) => {
                event.preventDefault()
                onCreate({
                  name: name.trim(),
                  description: description.trim(),
                })
                closeModal()
              }}
            >
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Workspace name"
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-300"
              />
              <textarea
                rows={4}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe this workspace"
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-300"
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/[0.08]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !name.trim()}
                  className="rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 hover:-translate-y-0.5 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? 'Creating...' : 'Create workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  )
}
