type SocketEventHandler<T = unknown> = (payload: T) => void

type CollaborationMessage = {
  type: string
  [key: string]: unknown
}

class CollaborationSocketClient {
  private socket: WebSocket | null = null
  private handlers = new Map<string, Set<SocketEventHandler>>()

  connect(token: string) {
    if (this.socket?.readyState === WebSocket.OPEN || this.socket?.readyState === WebSocket.CONNECTING) {
      return
    }

    const wsBaseUrl = import.meta.env.VITE_WS_URL ?? 'ws://localhost:3000/ws'
    const normalizedToken = token.startsWith('Bearer ') ? token.slice(7) : token
    const url = new URL(wsBaseUrl)

    url.searchParams.set('token', normalizedToken)

    this.socket = new WebSocket(url.toString())

    this.socket.addEventListener('open', () => {
      this.emit('connect')
    })

    this.socket.addEventListener('close', () => {
      this.emit('disconnect')
    })

    this.socket.addEventListener('error', () => {
      this.emit('disconnect')
    })

    this.socket.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data) as CollaborationMessage
        this.emit(message.type, message)
      } catch {
        this.emit('error', { type: 'error', message: 'Invalid realtime payload' })
      }
    })
  }

  disconnect() {
    this.socket?.close()
    this.socket = null
  }

  isConnected() {
    return this.socket?.readyState === WebSocket.OPEN
  }

  send(payload: Record<string, unknown>) {
    if (!this.isConnected()) {
      return
    }

    this.socket?.send(JSON.stringify(payload))
  }

  on<T = unknown>(eventType: string, handler: SocketEventHandler<T>) {
    const handlers = this.handlers.get(eventType) ?? new Set()
    handlers.add(handler as SocketEventHandler)
    this.handlers.set(eventType, handlers)
  }

  off<T = unknown>(eventType: string, handler: SocketEventHandler<T>) {
    const handlers = this.handlers.get(eventType)
    if (!handlers) {
      return
    }

    handlers.delete(handler as SocketEventHandler)

    if (handlers.size === 0) {
      this.handlers.delete(eventType)
    }
  }

  private emit(eventType: string, payload?: unknown) {
    const handlers = this.handlers.get(eventType)
    if (!handlers) {
      return
    }

    handlers.forEach((handler) => {
      handler(payload)
    })
  }
}

let socket: CollaborationSocketClient | null = null

export const getSocketClient = () => {
  if (socket) {
    return socket
  }

  socket = new CollaborationSocketClient()
  return socket
}
