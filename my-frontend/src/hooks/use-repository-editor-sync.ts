import { useAutoSaveFile } from './use-repositories'
import { useToast } from './use-toast'
import { getSocketClient } from '../services/socket'
import { useEffect, useMemo, useRef, useState } from 'react'

type UseRepositoryEditorSyncOptions = {
  repoId: string
  fileId: string
  content: string
  latestPersistedContent: string
  socketConnected: boolean
  canEdit: boolean
  onEditorChange: (value: string) => void
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'
type PresenceUser = {
  id: string
  name: string
  email: string
}

export const useRepositoryEditorSync = ({
  repoId,
  fileId,
  content,
  latestPersistedContent,
  socketConnected,
  canEdit,
  onEditorChange,
}: UseRepositoryEditorSyncOptions) => {
  const autoSaveMutation = useAutoSaveFile()
  const { toast } = useToast()
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([])
  const isHydratingContentRef = useRef(false)
  const isApplyingRemoteUpdateRef = useRef(false)
  const socket = useMemo(() => getSocketClient(), [])

  useEffect(() => {
    if (!fileId) {
      return
    }

    isHydratingContentRef.current = true
    onEditorChange(latestPersistedContent)
  }, [fileId, latestPersistedContent, onEditorChange])

  useEffect(() => {
    if (!repoId || !socketConnected) {
      return
    }

    socket.send({
      type: 'repo:subscribe',
      repoId,
    })

    return () => {
      socket.send({
        type: 'repo:unsubscribe',
        repoId,
      })
    }
  }, [repoId, socket, socketConnected])

  useEffect(() => {
    if (!repoId || !fileId || !socketConnected) {
      return
    }

    socket.send({
      type: 'file:join',
      repoId,
      fileId,
    })

    return () => {
      socket.send({
        type: 'file:leave',
        fileId,
      })
    }
  }, [fileId, repoId, socket, socketConnected])

  useEffect(() => {
    if (!fileId) {
      setPresenceUsers([])
      return
    }

    const handlePresenceUpdate = (
      message:
        | { type: 'file:joined'; fileId?: string; presence?: PresenceUser[] }
        | { type: 'presence:update'; fileId?: string; users?: PresenceUser[] },
    ) => {
      if (message.fileId !== fileId) {
        return
      }

      setPresenceUsers(message.type === 'file:joined' ? message.presence ?? [] : message.users ?? [])
    }

    socket.on('file:joined', handlePresenceUpdate)
    socket.on('presence:update', handlePresenceUpdate)

    return () => {
      socket.off('file:joined', handlePresenceUpdate)
      socket.off('presence:update', handlePresenceUpdate)
    }
  }, [fileId, socket])

  useEffect(() => {
    const handleRealtimeUpdate = (
      message:
        | { type: 'file:update'; fileId?: string; content?: string }
        | { type: 'file:saved'; fileId?: string; version?: { content?: string | null } },
    ) => {
      if (message.fileId !== fileId) {
        return
      }

      const nextContent =
        message.type === 'file:update' ? message.content : message.version?.content ?? null

      if (typeof nextContent !== 'string' || nextContent === content) {
        return
      }

      isHydratingContentRef.current = true
      isApplyingRemoteUpdateRef.current = true
      onEditorChange(nextContent)
      setSaveState('idle')
    }

    socket.on('file:update', handleRealtimeUpdate)
    socket.on('file:saved', handleRealtimeUpdate)

    return () => {
      socket.off('file:update', handleRealtimeUpdate)
      socket.off('file:saved', handleRealtimeUpdate)
    }
  }, [content, fileId, onEditorChange, socket])

  useEffect(() => {
    if (!repoId || !fileId || !socketConnected || !canEdit) {
      return
    }

    if (isHydratingContentRef.current || isApplyingRemoteUpdateRef.current) {
      isApplyingRemoteUpdateRef.current = false
      return
    }

    const timeout = window.setTimeout(() => {
      socket.send({
        type: 'file:update',
        repoId,
        fileId,
        content,
      })
    }, 250)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [canEdit, content, fileId, repoId, socket, socketConnected])

  useEffect(() => {
    if (!fileId || !repoId || !canEdit) {
      return
    }

    if (isHydratingContentRef.current) {
      isHydratingContentRef.current = false
      return
    }

    setSaveState('saving')

    const timeout = window.setTimeout(async () => {
      try {
        await autoSaveMutation.mutateAsync({
          repoId,
          fileId,
          content,
        })
        setSaveState('saved')
      } catch {
        setSaveState('error')
        toast({
          title: 'Save failed',
          description: 'The latest file changes could not be persisted.',
          tone: 'error',
        })
      }
    }, 900)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [autoSaveMutation, canEdit, content, fileId, repoId, toast])

  useEffect(() => {
    if (saveState !== 'saved') {
      return
    }

    const timeout = window.setTimeout(() => {
      setSaveState('idle')
    }, 1500)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [saveState])

  return {
    presenceUsers,
    saveState,
  }
}
