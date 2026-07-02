import { useMemo, useState } from 'react'

import {
  useConnectGithub,
  useDisconnectGithub,
  useGithubConnectionStatus,
  useGithubImportPreview,
  useGithubRepos,
  useImportGithubRepo,
} from '../hooks/use-github'
import { useToast } from '../hooks/use-toast'
import type { GithubRemoteRepo } from '../types/github'
import type { Repository } from '../types/repository'

type GithubImportModalProps = {
  workspaceId: string
  disabled?: boolean
  onImported: (repo: Repository) => void
}

export function GithubImportModal({
  workspaceId,
  disabled = false,
  onImported,
}: GithubImportModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [token, setToken] = useState('')
  const [search, setSearch] = useState('')
  const [selectedRepo, setSelectedRepo] = useState<GithubRemoteRepo | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const { toast } = useToast()
  const connectionQuery = useGithubConnectionStatus()
  const connectMutation = useConnectGithub()
  const disconnectMutation = useDisconnectGithub()
  const reposQuery = useGithubRepos(isOpen && Boolean(connectionQuery.data?.connected))
  const previewQuery = useGithubImportPreview(
    selectedRepo?.owner ?? '',
    selectedRepo?.name ?? ''
  )
  const importMutation = useImportGithubRepo()

  const closeModal = () => {
    setIsOpen(false)
    setToken('')
    setSearch('')
    setSelectedRepo(null)
    setName('')
    setDescription('')
  }

  const filteredRepos = useMemo(() => {
    const repos = reposQuery.data ?? []
    const query = search.trim().toLowerCase()

    if (!query) {
      return repos
    }

    return repos.filter((repo) => repo.fullName.toLowerCase().includes(query))
  }, [reposQuery.data, search])

  const handleConnect = async (event: React.FormEvent) => {
    event.preventDefault()

    try {
      await connectMutation.mutateAsync(token)
      setToken('')
      toast({ title: 'GitHub connected', description: 'You can now pick a repository.', tone: 'success' })
    } catch {
      toast({
        title: 'Connection failed',
        description: 'That token was rejected by GitHub. Check it and try again.',
        tone: 'error',
      })
    }
  }

  const handleSelectRepo = (repo: GithubRemoteRepo) => {
    setSelectedRepo(repo)
    setName(repo.name)
    setDescription('')
  }

  const handleImport = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!selectedRepo || !workspaceId) {
      return
    }

    try {
      const result = await importMutation.mutateAsync({
        workspaceId,
        owner: selectedRepo.owner,
        repo: selectedRepo.name,
        name: name.trim() || selectedRepo.name,
        description: description.trim() || undefined,
      })

      toast({
        title: 'Repository imported',
        description: `${result.importedCount} file(s) imported from ${selectedRepo.fullName}.`,
        tone: 'success',
      })
      onImported(result.repo)
      closeModal()
    } catch {
      toast({
        title: 'Import failed',
        description: 'Make sure the repository name is unique in this workspace.',
        tone: 'error',
      })
    }
  }

  const isConnected = Boolean(connectionQuery.data?.connected)

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(true)}
        className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-semibold text-slate-100 hover:-translate-y-0.5 hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-60"
      >
        Import from GitHub
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/70 px-4 backdrop-blur-sm">
          <div className="panel-dark w-full max-w-xl rounded-[1.75rem] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/75">
                  GitHub import
                </div>
                <h2 className="mt-2 font-['Space_Grotesk',_'Segoe_UI',_sans-serif] text-3xl font-semibold text-white">
                  Import a repository
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  Connect your GitHub account and pull a repository into this workspace.
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

            {!isConnected ? (
              <form className="mt-6 grid gap-4" onSubmit={handleConnect}>
                <label className="text-sm text-slate-300">
                  Personal Access Token
                  <input
                    type="password"
                    value={token}
                    onChange={(event) => setToken(event.target.value)}
                    placeholder="ghp_..."
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-300"
                  />
                </label>
                <p className="text-xs text-slate-500">
                  Needs the `repo` scope for private repositories, or `public_repo` for public-only access.
                  The token is encrypted before it is stored.
                </p>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={connectMutation.isPending || !token.trim()}
                    className="rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 hover:-translate-y-0.5 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {connectMutation.isPending ? 'Connecting...' : 'Connect GitHub'}
                  </button>
                </div>
              </form>
            ) : !selectedRepo ? (
              <div className="mt-6 grid gap-4">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>
                    Connected as{' '}
                    <span className="font-semibold text-white">
                      {connectionQuery.data?.githubLogin}
                    </span>
                  </span>
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
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-300"
                />

                <div className="grid max-h-80 gap-2 overflow-y-auto">
                  {reposQuery.isLoading ? (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-400">
                      Loading your repositories...
                    </div>
                  ) : filteredRepos.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-400">
                      No repositories matched.
                    </div>
                  ) : (
                    filteredRepos.map((repo) => (
                      <button
                        key={repo.fullName}
                        type="button"
                        onClick={() => handleSelectRepo(repo)}
                        className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-cyan-300/40 hover:bg-cyan-300/8"
                      >
                        <div className="text-sm font-semibold text-white">{repo.fullName}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {repo.private ? 'Private' : 'Public'} · default branch {repo.defaultBranch}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <form className="mt-6 grid gap-4" onSubmit={handleImport}>
                <button
                  type="button"
                  onClick={() => setSelectedRepo(null)}
                  className="justify-self-start text-xs font-semibold text-slate-400 hover:text-white"
                >
                  ← Choose a different repository
                </button>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
                  {previewQuery.isLoading ? (
                    'Checking repository contents...'
                  ) : previewQuery.data ? (
                    <>
                      <span className="font-semibold text-white">
                        {previewQuery.data.includedFiles}
                      </span>{' '}
                      file(s) will be imported
                      {previewQuery.data.skipped.length > 0 ? (
                        <>
                          , <span className="font-semibold text-white">
                            {previewQuery.data.skipped.length}
                          </span>{' '}
                          skipped (too large or excluded)
                        </>
                      ) : null}
                      .
                    </>
                  ) : (
                    'Unable to preview this repository.'
                  )}
                </div>

                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Repository name"
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-300"
                />
                <textarea
                  rows={3}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Describe this repository"
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
                    disabled={importMutation.isPending || !name.trim()}
                    className="rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 hover:-translate-y-0.5 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {importMutation.isPending ? 'Importing...' : 'Import repository'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  )
}
