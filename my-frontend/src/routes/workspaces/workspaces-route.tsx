import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { useCreateWorkspace, useWorkspaces } from '../../api/workspaces'
import { Button } from '../../ui/button'
import { Modal } from '../../ui/modal'
import { Panel } from '../../ui/panel'
import { Skeleton } from '../../ui/skeleton'
import { pushToast } from '../../ui/toast'

export function WorkspacesRoute() {
  const workspacesQuery = useWorkspaces()
  const createWorkspaceMutation = useCreateWorkspace()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const navigate = useNavigate()

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()

    try {
      await createWorkspaceMutation.mutateAsync({ name, description: description || undefined })
      pushToast({ title: 'Workspace created', tone: 'success' })
      setIsModalOpen(false)
      setName('')
      setDescription('')
    } catch {
      pushToast({ title: 'Could not create workspace', tone: 'error' })
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Your workspaces</h1>
        <Button onClick={() => setIsModalOpen(true)}>New workspace</Button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {workspacesQuery.isLoading ? (
          Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28" />)
        ) : workspacesQuery.data?.length === 0 ? (
          <Panel className="md:col-span-2 text-sm text-slate-400">
            No workspaces yet. Create one to get started.
          </Panel>
        ) : (
          workspacesQuery.data?.map((membership) => (
            <Panel
              key={membership.id}
              className="cursor-pointer transition hover:border-cyan-300/40"
              onClick={() => navigate(`/w/${membership.workspace.id}`)}
            >
              <div className="text-lg font-semibold text-white">{membership.workspace.name}</div>
              <div className="mt-1 text-sm text-slate-400">
                {membership.workspace.description || 'No description'}
              </div>
              <div className="mt-3 text-xs uppercase tracking-wide text-cyan-200/75">
                Role: {membership.role}
              </div>
            </Panel>
          ))
        )}
      </div>

      <Modal isOpen={isModalOpen} title="New workspace" onClose={() => setIsModalOpen(false)}>
        <form className="grid gap-4" onSubmit={(event) => void handleCreate(event)}>
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Workspace name"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300"
          />
          <textarea
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Description"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300"
          />
          <Button type="submit" disabled={createWorkspaceMutation.isPending}>
            {createWorkspaceMutation.isPending ? 'Creating...' : 'Create workspace'}
          </Button>
        </form>
      </Modal>
    </div>
  )
}
