import { useMemo, useState } from 'react'

import {
  useConnectGithub,
  useDisconnectGithub,
  useGithubConnectionStatus,
  useGithubImportPreview,
  useGithubRepos,
  useImportGithubRepo,
} from '../../api/github'
import { Button } from '../../ui/button'
import { Modal } from '../../ui/modal'
import { pushToast } from '../../ui/toast'
import type { GithubRemoteRepo, Repo } from '../../types/api'

type GithubImportPanelProps = {
  workspaceId: string
  isOpen: boolean
  onClose: () => void
  onImported: (repo: Repo) => void
}

export function GithubImportPanel({ workspaceId, isOpen, onClose, onImported }: GithubImportPanelProps) {
  const [token, setToken] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<GithubRemoteRepo | null>(null)
  const [name, setName] = useState('')

  const connectionQuery = useGithubConnectionStatus()
  const connectMutation = useConnectGithub()
  const disconnectMutation = useDisconnectGithub()
  const reposQuery = useGithubRepos(isOpen && Boolean(connectionQuery.data?.connected))
  const previewQuery = useGithubImportPreview(selected?.owner ?? '', selected?.name ?? '')
  const importMutation = useImportGithubRepo()

  const filteredRepos = useMemo(() => {
    const repos = reposQuery.data ?? []
    const query = search.trim().toLowerCase()
    return query ? repos.filter((repo) => repo.fullName.toLowerCase().includes(query)) : repos
  }, [reposQuery.data, search])

  const reset = () => {
    setToken('')
    setSearch('')
    setSelected(null)
    setName('')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleConnect = async () => {
    try {
      await connectMutation.mutateAsync(token)
      setToken('')
    } catch {
      pushToast({ title: 'Connection failed', description: 'That token was rejected by GitHub.', tone: 'error' })
    }
  }

  const handleImport = async () => {
    if (!selected) {
      return
    }

    try {
      const result = await importMutation.mutateAsync({
        workspaceId,
        owner: selected.owner,
        repo: selected.name,
        name: name.trim() || selected.name,
      })
      pushToast({ title: 'Repository imported', description: `${result.importedCount} file(s) imported.`, tone: 'success' })
      onImported(result.repo)
      handleClose()
    } catch {
      pushToast({ title: 'Import failed', tone: 'error' })
    }
  }

  const isConnected = Boolean(connectionQuery.data?.connected)

  return (
    <Modal isOpen={isOpen} title="Import from GitHub" onClose={handleClose}>
      {!isConnected ? (
        <div className="grid gap-4">
          <input
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="GitHub personal access token"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300"
          />
          <p className="text-xs text-slate-500">
            Needs the `repo` scope for private repositories. The token is encrypted before storage.
          </p>
          <Button onClick={() => void handleConnect()} disabled={connectMutation.isPending || !token.trim()}>
            {connectMutation.isPending ? 'Connecting...' : 'Connect GitHub'}
          </Button>
        </div>
      ) : !selected ? (
        <div className="grid gap-4">
          <div className="flex items-center justify-between text-sm text-slate-300">
            <span>Connected as <span className="font-semibold text-white">{connectionQuery.data?.githubLogin}</span></span>
            <button
              type="button"
              onClick={() => disconnectMutation.mutate()}
              className="text-xs font-semibold text-slate-400 hover:text-white"
            >
              Disconnect
            </button>
          </div>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search your repositories"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300"
          />
          <div className="grid max-h-72 gap-2 overflow-y-auto">
            {reposQuery.isLoading ? (
              <div className="text-sm text-slate-400">Loading...</div>
            ) : (
              filteredRepos.map((repo) => (
                <button
                  key={repo.fullName}
                  type="button"
                  onClick={() => {
                    setSelected(repo)
                    setName(repo.name)
                  }}
                  className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left text-sm text-white hover:border-cyan-300/40"
                >
                  {repo.fullName}
                </button>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          <button type="button" onClick={() => setSelected(null)} className="justify-self-start text-xs text-slate-400 hover:text-white">
            ← Choose a different repository
          </button>
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-slate-300">
            {previewQuery.isLoading
              ? 'Checking repository contents...'
              : previewQuery.data
                ? `${previewQuery.data.includedFiles} file(s) will be imported.`
                : 'Unable to preview.'}
          </div>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Repository name"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300"
          />
          <Button onClick={() => void handleImport()} disabled={importMutation.isPending || !name.trim()}>
            {importMutation.isPending ? 'Importing...' : 'Import repository'}
          </Button>
        </div>
      )}
    </Modal>
  )
}
