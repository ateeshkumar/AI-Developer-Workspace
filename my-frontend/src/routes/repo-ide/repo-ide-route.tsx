import { useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'

import { useIndexRepo, useRepos } from '../../api/repos'
import { pushToast } from '../../ui/toast'
import { AssistantPane } from './assistant-pane'
import { EditorPane } from './editor-pane'
import { FileExplorer } from './file-explorer'
import { IdeProvider, useIde } from './ide-context'

const indexedRepoIds = new Set<string>()

function IdeShell() {
  const { workspaceId, repoId, isAiPanelOpen } = useIde()
  const reposQuery = useRepos(workspaceId)
  const indexMutation = useIndexRepo()
  const triggeredRef = useRef(false)

  const activeRepo = reposQuery.data?.find((repo) => repo.id === repoId) ?? null

  useEffect(() => {
    if (!repoId || indexedRepoIds.has(repoId) || triggeredRef.current) {
      return
    }

    triggeredRef.current = true
    indexedRepoIds.add(repoId)
    indexMutation.mutate(repoId, {
      onError: () => {
        pushToast({ title: 'Background indexing failed', description: 'AI answers may be less relevant.', tone: 'info' })
      },
    })
  }, [indexMutation, repoId])

  return (
    <div
      className={`grid h-[calc(100vh-140px)] gap-4 ${
        isAiPanelOpen ? 'lg:grid-cols-[280px_minmax(0,1fr)_360px]' : 'lg:grid-cols-[280px_minmax(0,1fr)_56px]'
      }`}
    >
      <FileExplorer activeRepo={activeRepo} />
      <EditorPane />
      <AssistantPane />
    </div>
  )
}

export function RepoIdeRoute() {
  const { repoId } = useParams()

  return (
    <IdeProvider key={repoId}>
      <IdeShell />
    </IdeProvider>
  )
}
