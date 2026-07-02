import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useFileHistory, useRepoSummary, useRepoTree } from '../../api/repos'
import { useRepoPresence } from '../../realtime/use-repo-presence'
import type { FileTreeNode } from '../../types/api'

export type OpenTab = { fileId: string; filePath: string }

type IdeContextValue = {
  workspaceId: string
  repoId: string
  filePath: string
  fileId: string | null
  content: string
  setContent: (value: string) => void
  latestPersistedContent: string
  openTabs: OpenTab[]
  openFile: (fileId: string, filePath: string) => void
  closeTab: (fileId: string) => void
  isAiPanelOpen: boolean
  toggleAiPanel: () => void
  isTerminalOpen: boolean
  toggleTerminal: () => void
  role: 'ADMIN' | 'EDITOR' | 'VIEWER' | null
  connected: boolean
  presenceUsers: Array<{ id: string; name: string; email?: string }>
  currentUserId: string | null
  sendFileUpdate: (content: string) => void
}

const IdeContext = createContext<IdeContextValue | null>(null)

const flattenTree = (nodes: FileTreeNode[]): Array<{ id: string; path: string }> => {
  const result: Array<{ id: string; path: string }> = []

  const walk = (items: FileTreeNode[]) => {
    for (const item of items) {
      if (item.type === 'file' && item.id) {
        result.push({ id: item.id, path: item.path })
      }
      if (item.children) {
        walk(item.children)
      }
    }
  }

  walk(nodes)
  return result
}

export function IdeProvider({ children }: { children: ReactNode }) {
  const { workspaceId = '', repoId = '', '*': filePath = '' } = useParams()
  const navigate = useNavigate()
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([])
  const [content, setContent] = useState('')
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(true)
  const [isTerminalOpen, setIsTerminalOpen] = useState(false)

  const treeQuery = useRepoTree(repoId)
  const summaryQuery = useRepoSummary(repoId)

  const fileId = useMemo(() => {
    if (!filePath || !treeQuery.data) {
      return null
    }
    return flattenTree(treeQuery.data).find((entry) => entry.path === filePath)?.id ?? null
  }, [filePath, treeQuery.data])

  const historyQuery = useFileHistory(repoId, fileId ?? '')

  const latestPersistedContent = useMemo(() => {
    const versions = historyQuery.data?.versions ?? []
    return versions.find((version) => version.content !== null)?.content ?? ''
  }, [historyQuery.data?.versions])

  useEffect(() => {
    // Intentional: syncs the editable buffer from server-loaded content once the
    // file's history has loaded for this fileId (not on every refetch — `isLoading`
    // only flips on the initial fetch per query key, so a collaborator's background
    // save elsewhere doesn't clobber in-progress local typing here).
    if (historyQuery.isLoading) {
      return
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setContent(latestPersistedContent)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId, historyQuery.isLoading])

  const { connected, presenceUsers, currentUserId, sendFileUpdate } = useRepoPresence(repoId, fileId ?? '')

  const openFile = (nextFileId: string, nextFilePath: string) => {
    setOpenTabs((current) =>
      current.some((tab) => tab.fileId === nextFileId) ? current : [...current, { fileId: nextFileId, filePath: nextFilePath }]
    )
    navigate(`/w/${workspaceId}/r/${repoId}/f/${nextFilePath}`)
  }

  const closeTab = (closingFileId: string) => {
    setOpenTabs((current) => {
      const next = current.filter((tab) => tab.fileId !== closingFileId)

      if (closingFileId === fileId) {
        const fallback = next[next.length - 1]
        navigate(fallback ? `/w/${workspaceId}/r/${repoId}/f/${fallback.filePath}` : `/w/${workspaceId}/r/${repoId}`)
      }

      return next
    })
  }

  const value: IdeContextValue = {
    workspaceId,
    repoId,
    filePath,
    fileId,
    content,
    setContent,
    latestPersistedContent,
    openTabs,
    openFile,
    closeTab,
    isAiPanelOpen,
    toggleAiPanel: () => setIsAiPanelOpen((value) => !value),
    isTerminalOpen,
    toggleTerminal: () => setIsTerminalOpen((value) => !value),
    role: summaryQuery.data?.role ?? null,
    connected,
    presenceUsers,
    currentUserId,
    sendFileUpdate,
  }

  return <IdeContext.Provider value={value}>{children}</IdeContext.Provider>
}

export function useIde() {
  const context = useContext(IdeContext)

  if (!context) {
    throw new Error('useIde must be used within an IdeProvider')
  }

  return context
}
