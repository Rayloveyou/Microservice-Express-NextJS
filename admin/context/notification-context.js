'use client'

import { createContext, useContext, useState, useCallback } from 'react'

const NotificationContext = createContext()

// Notification types
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
}

// Auto-dismiss duration in ms
const DEFAULT_DURATION = 5000

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([])

  const addNotification = useCallback((message, type = NOTIFICATION_TYPES.INFO, duration = DEFAULT_DURATION) => {
    const id = Date.now() + Math.random()

    setNotifications(prev => [...prev, { id, message, type }])

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, duration)
    }

    return id
  }, [])

  const removeNotification = useCallback(id => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  // Convenience methods
  const success = useCallback((message, duration) => {
    return addNotification(message, NOTIFICATION_TYPES.SUCCESS, duration)
  }, [addNotification])

  const error = useCallback((message, duration) => {
    return addNotification(message, NOTIFICATION_TYPES.ERROR, duration)
  }, [addNotification])

  const warning = useCallback((message, duration) => {
    return addNotification(message, NOTIFICATION_TYPES.WARNING, duration)
  }, [addNotification])

  const info = useCallback((message, duration) => {
    return addNotification(message, NOTIFICATION_TYPES.INFO, duration)
  }, [addNotification])

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        removeNotification,
        success,
        error,
        warning,
        info
      }}
    >
      {children}
      <NotificationContainer notifications={notifications} onRemove={removeNotification} />
    </NotificationContext.Provider>
  )
}

// Toast container component
function NotificationContainer({ notifications, onRemove }) {
  if (notifications.length === 0) return null

  return (
    <div className="notification-container">
      {notifications.map(notification => (
        <Toast key={notification.id} notification={notification} onClose={() => onRemove(notification.id)} />
      ))}
      <style jsx>{`
        .notification-container {
          position: fixed;
          top: 80px;
          right: 24px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-width: 400px;
        }
      `}</style>
    </div>
  )
}

// Individual toast component
function Toast({ notification, onClose }) {
  const { message, type } = notification

  const getTypeStyles = () => {
    switch (type) {
      case NOTIFICATION_TYPES.SUCCESS:
        return {
          background: 'rgba(34, 197, 94, 0.15)',
          borderColor: '#22c55e',
          iconColor: '#22c55e',
          icon: '✓'
        }
      case NOTIFICATION_TYPES.ERROR:
        return {
          background: 'rgba(239, 68, 68, 0.15)',
          borderColor: '#ef4444',
          iconColor: '#ef4444',
          icon: '✕'
        }
      case NOTIFICATION_TYPES.WARNING:
        return {
          background: 'rgba(245, 158, 11, 0.15)',
          borderColor: '#f59e0b',
          iconColor: '#f59e0b',
          icon: '!'
        }
      default:
        return {
          background: 'rgba(59, 130, 246, 0.15)',
          borderColor: '#3b82f6',
          iconColor: '#3b82f6',
          icon: 'i'
        }
    }
  }

  const styles = getTypeStyles()

  return (
    <div className="toast" style={{ background: styles.background, borderColor: styles.borderColor }}>
      <span className="toast-icon" style={{ color: styles.iconColor }}>
        {styles.icon}
      </span>
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={onClose}>
        ×
      </button>
      <style jsx>{`
        .toast {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border-radius: 12px;
          border: 1px solid;
          background: var(--bg-elevated);
          color: var(--text-primary);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .toast-icon {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 14px;
        }

        .toast-message {
          flex: 1;
          font-size: 14px;
          line-height: 1.4;
        }

        .toast-close {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 20px;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 0.15s;
        }

        .toast-close:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
      `}</style>
    </div>
  )
}

export function useNotification() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider')
  }
  return context
}
