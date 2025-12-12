'use client'

import { useEffect, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'
import axios from 'axios'

// Token refresh interval: 10 minutes (access token expires in 15 minutes)
const REFRESH_INTERVAL_MS = 10 * 60 * 1000

export default function SessionRefresher() {
  const intervalRef = useRef(null)
  const isRefreshingRef = useRef(false)
  const pathname = usePathname()

  // Don't refresh on auth pages
  const isAuthPage = pathname?.startsWith('/auth')

  const refreshToken = useCallback(async () => {
    // Skip refresh on auth pages
    if (isAuthPage) return

    // Prevent concurrent refresh attempts
    if (isRefreshingRef.current) return

    isRefreshingRef.current = true
    try {
      const { data } = await axios.post('/api/users/refresh', {}, { withCredentials: true })

      // Verify user still has admin role
      if (data.currentUser && data.currentUser.role !== 'admin') {
        console.warn('[Admin] User is no longer admin, signing out')
        await axios.post('/api/users/signout', {}, { withCredentials: true })
        window.location.href = '/auth/signin'
        return
      }
    } catch (err) {
      // Check if it's an auth error - only redirect if not already on auth page
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        // Don't redirect if already on signin page
        if (!window.location.pathname.startsWith('/auth')) {
          console.warn('[Admin] Session expired, redirecting to signin')
          window.location.href = '/auth/signin'
        }
        return
      }
      // Other errors: silently fail, will retry on next interval
      console.error('[Admin] Token refresh failed:', err?.message)
    } finally {
      isRefreshingRef.current = false
    }
  }, [isAuthPage])

  useEffect(() => {
    // Initial refresh on mount
    refreshToken()

    // Set up periodic refresh
    intervalRef.current = setInterval(refreshToken, REFRESH_INTERVAL_MS)

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [refreshToken])

  // Also refresh on window focus (user returns to tab)
  useEffect(() => {
    const handleFocus = () => {
      refreshToken()
    }

    window.addEventListener('focus', handleFocus)
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [refreshToken])

  return null
}
