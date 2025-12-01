'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

export default function SignoutPage() {
  const router = useRouter()

  useEffect(() => {
    const signout = async () => {
      try {
        // Hit the auth service through the same origin proxy and with the correct HTTP verb
        await axios.post('/api/users/signout', {}, { withCredentials: true })
      } catch (err) {
        // ignore errors; best effort signout
      } finally {
        window.location.href = '/'
      }
    }
    signout()
  }, [router])

  return (
    <div className="container py-5">
      <div className="alert alert-info">Signing you out...</div>
    </div>
  )
}
