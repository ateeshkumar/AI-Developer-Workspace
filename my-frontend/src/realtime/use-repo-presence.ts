import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { getAccessToken } from '../auth/session-storage'
import { useAuth } from '../auth/auth-context'
import { socketClient } from './socket-client'

type ActorRef = { id: string; name: string; email?: string }

export function useRepoPresence(repoId: string, fileId: string) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [connected, setConnected] = useState(socketClient.isConnected)
  const [presenceUsers, setPresenceUsers] = useState<ActorRef[]>([])

  useEffect(() => {
    const token = getAccessToken()

    if (!token) {
      return
    }

    socketClient.connect(token)

    const off = socketClient.onConnectionChange(setConnected)
    return () => {
      off()
    }
  }, [])

  useEffect(() => {
    if (!repoId) {
      return
    }

    socketClient.send({ type: 'repo:subscribe', repoId })

    const off = socketClient.onMessage((message) => {
      if (!('repoId' in message) || message.repoId !== repoId) {
        return
      }

      if (
        message.type === 'file:created' ||
        message.type === 'file:saved' ||
        message.type === 'file:deleted' ||
        message.type === 'commit:created'
      ) {
        queryClient.invalidateQueries({ queryKey: ['repo-tree', repoId] })
        queryClient.invalidateQueries({ queryKey: ['repo-activity', repoId] })
      }

      if (message.type === 'file:lock' || message.type === 'file:unlock') {
        queryClient.invalidateQueries({ queryKey: ['file-lock', repoId, message.fileId] })
      }
    })

    return () => {
      off()
      socketClient.send({ type: 'repo:unsubscribe', repoId })
    }
  }, [queryClient, repoId])

  useEffect(() => {
    if (!repoId || !fileId) {
      return
    }

    socketClient.send({ type: 'file:join', repoId, fileId })

    const off = socketClient.onMessage((message) => {
      if (message.type === 'file:joined' && message.fileId === fileId) {
        setPresenceUsers(message.presence)
      }

      if (message.type === 'presence:update' && message.fileId === fileId) {
        setPresenceUsers(message.users)
      }
    })

    return () => {
      off()
      socketClient.send({ type: 'file:leave', fileId })
      setPresenceUsers([])
    }
  }, [repoId, fileId])

  const sendFileUpdate = (content: string) => {
    if (repoId && fileId) {
      socketClient.send({ type: 'file:update', repoId, fileId, content })
    }
  }

  return {
    connected,
    presenceUsers,
    currentUserId: user?.id ?? null,
    sendFileUpdate,
  }
}
