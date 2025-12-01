import { WebSocket } from 'ws'

interface TrackedClient {
  ws: WebSocket
  userId?: string
}

type NotificationPayload =
  | { type: 'product.created'; data: { id: string; title: string } }
  | { type: 'order.created'; data: { id: string; total: number; userId: string } }
  | { type: 'payment.created'; data: { id: string; orderId: string; userId: string } }

/**
 * Quản lý WebSocket connections và gửi notification cho client.
 *
 * Protocol đơn giản:
 * - Client connect và gửi message:
 *   { "type": "auth", "userId": "<currentUser.id>" }
 *
 * - Server sẽ map socket -> userId để gửi thông báo theo user.
 */
export class WebsocketManager {
  private clients = new Set<TrackedClient>()
  private clientsByUser = new Map<string, Set<WebSocket>>()

  addClient(ws: WebSocket) {
    const client: TrackedClient = { ws }
    this.clients.add(client)

    ws.on('message', raw => {
      try {
        const msg = JSON.parse(raw.toString())
        if (msg && msg.type === 'auth' && typeof msg.userId === 'string') {
          this.setClientUser(client, msg.userId)
        }
      } catch {
        // ignore malformed messages
      }
    })

    ws.on('close', () => {
      this.removeClient(client)
    })

    ws.on('error', () => {
      this.removeClient(client)
    })
  }

  private setClientUser(client: TrackedClient, userId: string) {
    // Remove from old mapping
    if (client.userId) {
      const existing = this.clientsByUser.get(client.userId)
      if (existing) {
        existing.delete(client.ws)
        if (existing.size === 0) {
          this.clientsByUser.delete(client.userId)
        }
      }
    }

    client.userId = userId
    if (!this.clientsByUser.has(userId)) {
      this.clientsByUser.set(userId, new Set())
    }
    this.clientsByUser.get(userId)!.add(client.ws)
  }

  private removeClient(client: TrackedClient) {
    this.clients.delete(client)
    if (client.userId) {
      const set = this.clientsByUser.get(client.userId)
      if (set) {
        set.delete(client.ws)
        if (set.size === 0) {
          this.clientsByUser.delete(client.userId)
        }
      }
    }
  }

  /**
   * Gửi notification cho tất cả clients (broadcast).
   */
  broadcast(payload: NotificationPayload) {
    const message = JSON.stringify(payload)
    for (const client of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message)
      }
    }
  }

  /**
   * Gửi notification cho 1 user cụ thể.
   */
  sendToUser(userId: string, payload: NotificationPayload) {
    const set = this.clientsByUser.get(userId)
    if (!set) return
    const message = JSON.stringify(payload)
    for (const ws of set) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message)
      }
    }
  }
}
