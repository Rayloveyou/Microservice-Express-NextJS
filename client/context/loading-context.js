'use client'
import { createContext, useContext, useMemo, useState } from 'react'

const LoadingContext = createContext({
  loading: false,
  startLoading: () => {},
  stopLoading: () => {}
})

export const LoadingProvider = ({ children }) => {
  const [activeRequests, setActiveRequests] = useState(0)

  const startLoading = () => {
    setActiveRequests(current => current + 1)
  }

  const stopLoading = () => {
    setActiveRequests(current => (current > 0 ? current - 1 : 0))
  }

  const value = useMemo(
    () => ({
      loading: activeRequests > 0,
      startLoading,
      stopLoading
    }),
    [activeRequests]
  )

  return (
    <LoadingContext.Provider value={value}>
      {children}
      {activeRequests > 0 && (
        <div className="global-loading-overlay">
          <div className="spinner-gradient" />
        </div>
      )}
    </LoadingContext.Provider>
  )
}

export const useLoading = () => useContext(LoadingContext)
