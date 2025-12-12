'use client'

import { useState } from 'react'
import axios from 'axios'

export default function AdminHeader({ currentUser }) {
  const [signingOut, setSigningOut] = useState(false)

  const handleSignout = async () => {
    if (signingOut) return
    setSigningOut(true)
    try {
      await axios.post('/api/users/signout', {}, { withCredentials: true })
      // Use window.location.href for full page reload to clear all state
      window.location.href = '/auth/signin'
    } catch (error) {
      console.error('Signout failed:', error)
      setSigningOut(false)
    }
  }

  const getInitials = email => {
    if (!email) return 'A'
    return email.split('@')[0].slice(0, 2).toUpperCase()
  }

  const userEmail = currentUser?.email || 'Admin'
  const userInitials = getInitials(currentUser?.email)

  return (
    <header className="admin-header">
      <div className="admin-header-left">
        <h1 className="admin-header-title">Dashboard</h1>
      </div>
      <div className="admin-header-right">
        <div className="admin-user-menu">
          <div className="admin-user-avatar">{userInitials}</div>
          <span>{userEmail}</span>
          <button
            onClick={handleSignout}
            className="admin-signout-btn"
            title="Sign Out"
            disabled={signingOut}
          >
            {signingOut ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="32" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
