'use client'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const NotificationsContext = createContext({
  notifications: [],
  addNotification: () => {},
  clearNotifications: () => {}
})

export const useNotifications = () => useContext(NotificationsContext)

export const NotificationsProvider = ({ children, currentUser }) => {
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    if (!currentUser) {
      setNotifications([])
      return
    }

    if (typeof window === 'undefined') {
      return
    }

    let wsUrl = process.env.NEXT_PUBLIC_WS_URL
    if (!wsUrl) {
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
      wsUrl = `${protocol}://${window.location.host}/ws/notifications`
    }

    const socket = new WebSocket(wsUrl)

    socket.addEventListener('open', () => {
      // Send userId to associate connection
      socket.send(
        JSON.stringify({
          type: 'auth',
          userId: currentUser.id
        })
      )
    })

    socket.addEventListener('message', event => {
      try {
        const msg = JSON.parse(event.data)
        if (!msg || !msg.type) return

        let text = ''
        if (msg.type === 'product.created') {
          text = `New product created: ${msg.data?.title || msg.data?.id}`
        } else if (msg.type === 'payment.created') {
          text = `Order successful (order ${msg.data?.orderId})`
        } else {
          text = msg.type
        }

        const id = `${Date.now()}-${Math.random()}`
        setNotifications(prev => [{ id, type: msg.type, text }, ...prev])

        // Auto-remove notification after 10 seconds
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== id))
        }, 10000)
      } catch {
        // ignore invalid messages
      }
    })

    socket.addEventListener('close', () => {
      // no-op; could implement reconnect if needed
    })

    return () => {
      socket.close()
    }
  }, [currentUser])

  const value = useMemo(
    () => ({
      notifications,
      addNotification: text => {
        const id = `${Date.now()}-${Math.random()}`
        setNotifications(prev => [{ id, type: 'custom', text }, ...prev])
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== id))
        }, 10000)
      },
      clearNotifications: () => setNotifications([]),
      removeNotification: id => setNotifications(prev => prev.filter(n => n.id !== id))
    }),
    [notifications]
  )

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      {notifications.length > 0 && (
        <div
          className="position-fixed"
          style={{ right: '16px', bottom: '16px', zIndex: 2050, maxWidth: '320px' }}
        >
          {notifications.slice(0, 3).map(n => (
            <div
              key={n.id}
              className="alert alert-info shadow-sm mb-2 d-flex justify-content-between align-items-start"
            >
              <span>{n.text}</span>
              <button
                type="button"
                className="btn btn-sm btn-link text-decoration-none ms-2 p-0"
                onClick={() => value.removeNotification(n.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </NotificationsContext.Provider>
  )
}
