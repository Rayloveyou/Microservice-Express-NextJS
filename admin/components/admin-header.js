'use client'

import { useRouter } from 'next/navigation'
import axios from 'axios'

export default function AdminHeader() {
  const router = useRouter()

  const handleSignout = async () => {
    try {
      await axios.post('/api/users/signout')
      router.push('/auth/signin')
      router.refresh()
    } catch (error) {
      console.error('Signout failed:', error)
    }
  }

  return (
    <header className="admin-header">
      <div className="admin-header-left">
        <h1 className="admin-header-title">Dashboard</h1>
      </div>
      <div className="admin-header-right">
        <div className="admin-user-menu">
          <div className="admin-user-avatar">A</div>
          <span>Admin</span>
          <button
            onClick={handleSignout}
            className="admin-signout-btn"
            title="Sign Out"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}
