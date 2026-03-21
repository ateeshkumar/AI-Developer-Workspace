import { useEffect, useMemo, useState } from 'react'

import { useAppHealth } from './use-app-health'
import { useCreateWorkspace, useWorkspaces } from './use-workspaces'
import { useToast } from './use-toast'
import { setAuthToken } from '../services/api'
import { getSocketClient } from '../services/socket'
import { useAuthStore } from '../store/auth-store'
import { useEditorStore } from '../store/editor-store'
import type { NavigationItem } from '../types/navigation'
import type { Repository } from '../types/repository'
import type { CreateWorkspacePayload, WorkspaceMembership } from '../types/workspace'

const navItems: NavigationItem[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'repositories', label: 'Repositories' },
  { id: 'ai-assistant', label: 'AI Assistant' },
]

export const useWorkspacePage = () => {
  const healthQuery = useAppHealth()
  const workspacesQuery = useWorkspaces()
  const createWorkspaceMutation = useCreateWorkspace()
  const { toast } = useToast()
  const [activeNavItem, setActiveNavItem] = useState<NavigationItem['id']>('dashboard')
  const { token } = useAuthStore()
  const editorStore = useEditorStore()
  const {
    setWorkspaceId,
    setRepoId,
    setFile,
    openFileTab,
    setContent,
    setSocketConnected,
  } = editorStore

  useEffect(() => {
    setAuthToken(token ?? undefined)
  }, [token])

  useEffect(() => {
    const socket = getSocketClient()

    if (!token) {
      socket.disconnect()
      setSocketConnected(false)
      return
    }

    const onConnect = () => setSocketConnected(true)
    const onDisconnect = () => setSocketConnected(false)

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.connect(token)

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
    }
  }, [setSocketConnected, token])

  useEffect(() => {
    if (!createWorkspaceMutation.isSuccess) {
      return
    }

    toast({
      title: 'Workspace created',
      description: 'Your dashboard now includes the new workspace.',
      tone: 'success',
    })
  }, [createWorkspaceMutation.isSuccess, toast])

  useEffect(() => {
    if (!createWorkspaceMutation.isError) {
      return
    }

    toast({
      title: 'Workspace creation failed',
      description: 'Please try again after checking the backend.',
      tone: 'error',
    })
  }, [createWorkspaceMutation.isError, toast])

  const healthLabel = useMemo(() => {
    if (healthQuery.isLoading) {
      return 'Checking backend'
    }

    if (healthQuery.isError) {
      return 'Backend unavailable'
    }

    return healthQuery.data?.ok ? 'Backend healthy' : 'Backend response unknown'
  }, [healthQuery.data, healthQuery.isError, healthQuery.isLoading])

  const openWorkspace = (membership: WorkspaceMembership) => {
    setWorkspaceId(membership.workspace.id)
    setRepoId(membership.workspace.repos[0]?.id ?? '')
    setActiveNavItem('repositories')
  }

  const createWorkspace = (payload: CreateWorkspacePayload) => {
    createWorkspaceMutation.mutate(payload)
  }

  const selectRepository = (repository: Repository) => {
    setRepoId(repository.id)
    setFile('', '')
    setContent('')
  }

  const selectFile = (nextFileId: string, nextFilePath: string) => {
    openFileTab(nextFileId, nextFilePath)
    setContent('')
  }

  return {
    activeNavItem,
    createWorkspace,
    healthLabel,
    navItems,
    openWorkspace,
    selectFile,
    selectRepository,
    setActiveNavItem,
    token,
    workspacesQuery,
    createWorkspaceMutation,
    editorStore,
  }
}
