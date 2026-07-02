import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useCreateRepo, useRepos } from '../../api/repos'
import { Button } from '../../ui/button'
import { Modal } from '../../ui/modal'
import { Panel } from '../../ui/panel'
import { Skeleton } from '../../ui/skeleton'
import { pushToast } from '../../ui/toast'
import { GithubImportPanel } from './github-import-panel'

export function WorkspaceReposRoute() {
  const { workspaceId = '' } = useParams()
  const navigate = useNavigate()
  const reposQuery = useRepos(workspaceId)
  const createRepoMutation = useCreateRepo()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()

    try {
      const repo = await createRepoMutation.mutateAsync({
        workspaceId,
        payload: { name, description: description || undefined },
      })
      pushToast({ title: 'Repository created', tone: 'success' })
      setIsCreateOpen(false)
      setName('')
      setDescription('')
      navigate(`/w/${workspaceId}/r/${repo.id}`)
    } catch {
      pushToast({ title: 'Could not create repository', tone: 'error' })
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Repositories</h1>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setIsImportOpen(true)}>
            Import from GitHub
          </Button>
          <Button onClick={() => setIsCreateOpen(true)}>New repository</Button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {reposQuery.isLoading ? (
          Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-24" />)
        ) : reposQuery.data?.length === 0 ? (
          <Panel className="md:col-span-2 text-sm text-slate-400">
            No repositories yet. Create one or import from GitHub.
          </Panel>
        ) : (
          reposQuery.data?.map((repo) => (
            <Panel
              key={repo.id}
              className="cursor-pointer transition hover:border-cyan-300/40"
              onClick={() => navigate(`/w/${workspaceId}/r/${repo.id}`)}
            >
              <div className="text-lg font-semibold text-white">{repo.name}</div>
              <div className="mt-1 text-sm text-slate-400">{repo.description || 'No description'}</div>
              {repo.provider === 'github' ? (
                <div className="mt-2 text-xs text-cyan-200/75">
                  GitHub: {repo.githubOwner}/{repo.githubRepo}
                </div>
              ) : null}
            </Panel>
          ))
        )}
      </div>

      <Modal isOpen={isCreateOpen} title="New repository" onClose={() => setIsCreateOpen(false)}>
        <form className="grid gap-4" onSubmit={(event) => void handleCreate(event)}>
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Repository name"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300"
          />
          <textarea
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Description"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300"
          />
          <Button type="submit" disabled={createRepoMutation.isPending}>
            {createRepoMutation.isPending ? 'Creating...' : 'Create repository'}
          </Button>
        </form>
      </Modal>

      <GithubImportPanel
        workspaceId={workspaceId}
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImported={(repo) => navigate(`/w/${workspaceId}/r/${repo.id}`)}
      />
    </div>
  )
}
