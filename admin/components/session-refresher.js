'use client'

import { useEffect } from 'react'
import axios from 'axios'

// Best-effort: keep the session alive by refreshing access token in the browser
export default function SessionRefresher() {
  useEffect(() => {
    const refresh = async () => {
      try {
        await axios.post('/api/users/refresh', {}, { withCredentials: true })
      } catch (_err) {
        // ignore; user might need to sign in again
      }
    }
    refresh()
  }, [])

  return null
}
