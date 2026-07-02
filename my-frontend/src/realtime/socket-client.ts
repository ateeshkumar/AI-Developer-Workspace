import { API_ORIGIN } from '../api/http'

type ActorRef = { id: string; name: string; email?: string }

export type ServerMessage =
  | { type: 'connection:ready'; user: ActorRef }
  | { type: 'repo:subscribed'; repoId: string }
  | { type: 'file:joined'; repoId: string; fileId: string; path: string; presence: ActorRef[] }
  | { type: 'presence:update'; fileId: string; users: ActorRef[] }
  | { type: 'presence:pong'; timestamp: number }
  | {
      type: 'file:update'
      repoId: string
      fileId: string
      content?: string
      cursor?: unknown
      selection?: unknown
      user: ActorRef
      timestamp: string
    }
  | { type: 'file:created'; repoId: string; file: unknown; version: unknown; actor: ActorRef; timestamp: string }
  | {
      type: 'file:saved'
      repoId: string
      fileId: string
      file: unknown
      version: unknown
      actor: ActorRef
      timestamp: string
    }
  | {
      type: 'file:deleted'
      repoId: string
      fileId: string
      file: unknown
      version: unknown
      actor: ActorRef
      timestamp: string
    }
  | { type: 'file:lock'; repoId: string; fileId: string; lock: unknown; actor: ActorRef; timestamp: string }
  | { type: 'file:unlock'; repoId: string; fileId: string; lock: unknown; actor: ActorRef; timestamp: string }
  | { type: 'commit:created'; repoId: string; commit: unknown; actor: ActorRef; timestamp: string }
  | { type: 'error'; message: string }

export type ClientMessage =
  | { type: 'repo:subscribe'; repoId: string }
  | { type: 'repo:unsubscribe'; repoId: string }
  | { type: 'file:join'; repoId: string; fileId: string }
  | { type: 'file:leave'; fileId: string }
  | {
      type: 'file:update'
      repoId: string
      fileId: string
      content?: string
      cursor?: unknown
      selection?: unknown
    }
  | { type: 'presence:ping' }

type MessageListener = (message: ServerMessage) => void
type ConnectionListener = (connected: boolean) => void

class SocketClient {
  private socket: WebSocket | null = null
  private messageListeners = new Set<MessageListener>()
  private connectionListeners = new Set<ConnectionListener>()

  connect(token: string) {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return
    }

    const wsOrigin = API_ORIGIN.replace(/^http/, 'ws')
    const socket = new WebSocket(`${wsOrigin}/ws?token=${encodeURIComponent(token)}`)
    this.socket = socket

    socket.addEventListener('open', () => {
      this.connectionListeners.forEach((listener) => listener(true))
    })

    socket.addEventListener('close', () => {
      this.connectionListeners.forEach((listener) => listener(false))
    })

    socket.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data) as ServerMessage
        this.messageListeners.forEach((listener) => listener(message))
      } catch {
        // ignore malformed frames
      }
    })
  }

  disconnect() {
    this.socket?.close()
    this.socket = null
  }

  send(message: ClientMessage) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message))
    }
  }

  onMessage(listener: MessageListener) {
    this.messageListeners.add(listener)
    return () => this.messageListeners.delete(listener)
  }

  onConnectionChange(listener: ConnectionListener) {
    this.connectionListeners.add(listener)
    return () => this.connectionListeners.delete(listener)
  }

  get isConnected() {
    return this.socket?.readyState === WebSocket.OPEN
  }
}

export const socketClient = new SocketClient()
