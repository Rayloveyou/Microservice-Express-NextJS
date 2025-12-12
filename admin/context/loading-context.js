'use client'

import { createContext, useContext, useState, useCallback, useRef } from 'react'

const LoadingContext = createContext()

export function LoadingProvider({ children }) {
  const [activeRequests, setActiveRequests] = useState(0)
  const requestCountRef = useRef(0)

  const startLoading = useCallback(() => {
    requestCountRef.current += 1
    setActiveRequests(requestCountRef.current)
  }, [])

  const stopLoading = useCallback(() => {
    requestCountRef.current = Math.max(0, requestCountRef.current - 1)
    setActiveRequests(requestCountRef.current)
  }, [])

  const isLoading = activeRequests > 0

  return (
    <LoadingContext.Provider value={{ isLoading, startLoading, stopLoading, activeRequests }}>
      {children}
      {isLoading && <LoadingOverlay />}
    </LoadingContext.Provider>
  )
}

// Global loading overlay
function LoadingOverlay() {
  return (
    <div className="loading-overlay">
      <div className="spinner-gradient" />
      <style jsx>{`
        .loading-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9998;
          animation: fadeIn 0.15s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .spinner-gradient {
          width: 48px;
          height: 48px;
          border: 4px solid var(--bg-elevated, #2a2a2a);
          border-top-color: var(--accent-cyan, #00f2ea);
          border-right-color: var(--accent-pink, #ff0050);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  )
}

export function useLoading() {
  const context = useContext(LoadingContext)
  if (!context) {
    throw new Error('useLoading must be used within LoadingProvider')
  }
  return context
}
