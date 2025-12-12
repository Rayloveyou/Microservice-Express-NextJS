import 'server-only'

import { requireEnv } from './require-env'

export async function fetchCurrentUser(cookieHeader = '') {
  const gatewayUrl = requireEnv('API_GATEWAY_URL')

  const fetchOptions = {
    headers: { Cookie: cookieHeader },
    cache: 'no-store',
    credentials: 'include'
  }

  const tryCurrent = async () => {
    try {
      const res = await fetch(`${gatewayUrl}/api/users/currentuser`, fetchOptions)
      if (!res.ok) return null
      const data = await res.json()
      return data.currentUser || null
    } catch (err) {
      console.error('[Admin] Error fetching current user:', err.message)
      return null
    }
  }

  const tryRefresh = async () => {
    try {
      const res = await fetch(`${gatewayUrl}/api/users/refresh`, {
        method: 'POST',
        headers: { Cookie: cookieHeader },
        cache: 'no-store',
        credentials: 'include'
      })
      if (!res.ok) return null
      const data = await res.json()
      return data.currentUser || null
    } catch (err) {
      console.error('[Admin] Error refreshing token:', err.message)
      return null
    }
  }

  try {
    // First try to get current user
    let user = await tryCurrent()

    // If no user, try to refresh token
    if (!user) {
      user = await tryRefresh()
    }

    // Validate admin role (not email-based)
    if (!user || user.role !== 'admin') {
      return null
    }

    return user
  } catch (err) {
    console.error('[Admin] Auth error:', err.message)
    return null
  }
}

// Helper to check if user has admin role
export function isAdmin(user) {
  return user && user.role === 'admin'
}
