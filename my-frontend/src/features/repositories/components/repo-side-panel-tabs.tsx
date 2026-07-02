import { useState } from 'react'

import type {
  FileLock,
  FileVersion,
  Repository,
  RepositoryActivityItem,
  RepositorySearchResult,
} from '../../../types/repository'

type TabId = 'search' | 'status' | 'history' | 'activity'

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'search', label: 'Search' },
  { id: 'status', label: 'Status' },
  { id: 'history', label: 'History' },
  { id: 'activity', label: 'Activity' },
]

const formatTimestamp = (value: string) =>
  new Date(value).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

type RepoSidePanelTabsProps = {
  repoId: string
  fileId: string
  filePath: string
  role: 'ADMIN' | 'EDITOR' | 'VIEWER' | null
  socketConnected: boolean
  selectedRepoName: string
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  searchResults: RepositorySearchResult[]
  isSearching: boolean
  onSelectSearchResult: (fileId: string, path: string) => void
  historyVersions: FileVersion[]
  isHistoryLoading: boolean
  activityItems: RepositoryActivityItem[]
  isActivityLoading: boolean
  activeLocksCount: number
  activeLock: FileLock | null
  lockOwnerName: string | null
  isGithubRepo: boolean
  activeRepo: Repository | null
  canSyncGithub: boolean
  isPulling: boolean
  isPushing: boolean
  onPullFromGithub: () => void
  onPushToGithub: () => void
}

export function RepoSidePanelTabs({
  repoId,
  fileId,
  filePath,
  role,
  socketConnected,
  selectedRepoName,
  searchQuery,
  onSearchQueryChange,
  searchResults,
  isSearching,
  onSelectSearchResult,
  historyVersions,
  isHistoryLoading,
  activityItems,
  isActivityLoading,
  activeLocksCount,
  activeLock,
  lockOwnerName,
  isGithubRepo,
  activeRepo,
  canSyncGithub,
  isPulling,
  isPushing,
  onPullFromGithub,
  onPushToGithub,
}: RepoSidePanelTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('status')
  const visibleSearchResults = searchQuery.trim() ? searchResults : []

  return (
    <section className="panel-dark-soft rounded-[1.75rem] p-5">
      <div className="flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
              activeTab === tab.id
                ? 'bg-cyan-300 text-slate-950'
                : 'border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {activeTab === 'search' ? (
          <div>
            <input
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              placeholder="Search by path or file content"
              disabled={!repoId}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            />

            {searchQuery.trim() ? (
              <div className="mt-4 grid gap-3">
                {isSearching ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-400">
                    Searching repository…
                  </div>
                ) : visibleSearchResults.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-400">
                    No files matched this search.
                  </div>
                ) : (
                  visibleSearchResults.slice(0, 6).map((result) => (
                    <button
                      key={result.fileId}
                      type="button"
                      onClick={() => onSelectSearchResult(result.fileId, result.path)}
                      className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-cyan-300/40 hover:bg-cyan-300/8"
                    >
                      <div className="text-sm font-semibold text-white">{result.path}</div>
                      <div className="mt-2 text-xs uppercase tracking-[0.2em] text-cyan-200/75">
                        {result.matchType}
                      </div>
                      {result.snippet ? (
                        <div className="mt-2 text-sm text-slate-400">{result.snippet}</div>
                      ) : null}
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        {activeTab === 'status' ? (
          <div>
            <div className="grid gap-3 text-sm text-slate-300">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <span className="font-medium text-white">Repository:</span> {selectedRepoName}
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <span className="font-medium text-white">File:</span>{' '}
                {filePath || 'Choose a file from the explorer'}
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <span className="font-medium text-white">Versions:</span> {historyVersions.length}
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <span className="font-medium text-white">Role:</span> {role ?? 'Unknown'}
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <span className="font-medium text-white">Active locks:</span> {activeLocksCount}
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <span className="font-medium text-white">Collaboration:</span>{' '}
                {socketConnected ? 'Connected' : 'Offline'}
              </div>
            </div>

            {isGithubRepo ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="font-medium text-white">GitHub sync</div>
                <div className="mt-1 text-xs text-slate-500">
                  {activeRepo?.githubOwner}/{activeRepo?.githubRepo}
                  {activeRepo?.githubLastSyncedAt
                    ? ` · last synced ${formatTimestamp(activeRepo.githubLastSyncedAt)}`
                    : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={!canSyncGithub || isPulling}
                    onClick={onPullFromGithub}
                    className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isPulling ? 'Pulling...' : 'Pull latest from GitHub'}
                  </button>
                  <button
                    type="button"
                    disabled={!canSyncGithub || isPushing}
                    onClick={onPushToGithub}
                    className="rounded-xl bg-cyan-300 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isPushing ? 'Pushing...' : 'Push changes to GitHub'}
                  </button>
                </div>
                {!canSyncGithub ? (
                  <div className="mt-2 text-xs text-slate-500">
                    Your role must be editor or higher to sync with GitHub.
                  </div>
                ) : null}
              </div>
            ) : null}

            {repoId && !fileId ? (
              <div className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm text-cyan-100">
                Repository opened. Choose a file from the explorer to load it in the editor.
              </div>
            ) : null}

            {fileId ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
                {activeLock ? (
                  <>
                    <div className="font-medium text-white">File lock</div>
                    <div className="mt-2">
                      Held by {lockOwnerName} until {formatTimestamp(activeLock.expiresAt)}
                    </div>
                  </>
                ) : role === 'VIEWER' ? (
                  'Your role is viewer, so this file opens in read-only mode.'
                ) : (
                  'No lock is active. Use “Lock to edit” in the workspace header before making changes.'
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        {activeTab === 'history' ? (
          <div className="grid gap-3">
            {!fileId ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-400">
                Choose a file to inspect version history.
              </div>
            ) : isHistoryLoading ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-400">
                Loading history…
              </div>
            ) : (
              historyVersions.slice(0, 6).map((version) => (
                <article
                  key={version.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-white">
                      v{version.versionNumber} · {version.changeType}
                    </div>
                    <div className="text-xs text-slate-500">{formatTimestamp(version.createdAt)}</div>
                  </div>
                  <div className="mt-2 text-sm text-slate-400">
                    {version.summary || 'No summary provided'}
                  </div>
                  {version.createdBy ? (
                    <div className="mt-2 text-xs text-slate-500">by {version.createdBy.name}</div>
                  ) : null}
                </article>
              ))
            )}
          </div>
        ) : null}

        {activeTab === 'activity' ? (
          <div className="grid gap-3">
            {isActivityLoading ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-400">
                Loading repository activity…
              </div>
            ) : (
              activityItems.slice(0, 6).map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-white">
                      {item.type === 'commit'
                        ? `Commit · ${item.message ?? 'Untitled commit'}`
                        : `${item.changeType} · ${item.file?.path ?? 'File change'}`}
                    </div>
                    <div className="text-xs text-slate-500">{formatTimestamp(item.createdAt)}</div>
                  </div>
                  <div className="mt-2 text-sm text-slate-400">
                    {item.type === 'commit'
                      ? `${item.changedFiles ?? 0} file version(s) grouped in this commit.`
                      : item.summary || `Version ${item.versionNumber} saved.`}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">by {item.actor.name}</div>
                </article>
              ))
            )}
          </div>
        ) : null}
      </div>
    </section>
  )
}
