import axios from 'axios'

import { fetchCurrentUser } from '../../lib/server-auth'
import { getCookieHeader } from '../../lib/get-cookie-header'
import { requireEnv } from '../../lib/require-env'
import UsersClient from './users-client'

export const metadata = {
  title: 'Users | Admin'
}

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const cookieHeader = await getCookieHeader()
  const currentUser = await fetchCurrentUser(cookieHeader)
  const isSignedIn = !!currentUser

  const apiBase = requireEnv('API_GATEWAY_URL')
  let users = []

  if (isSignedIn) {
    try {
      const { data } = await axios.get(`${apiBase}/api/admin/users`, {
        headers: { Cookie: cookieHeader },
        withCredentials: true
      })
      users = Array.isArray(data) ? data : []
    } catch (err) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        return (
          <div className="auth-error-container">
            <div className="auth-error-card">
              <h2>Session Expired</h2>
              <p>Your session has expired. Please sign in again.</p>
              <a href="/auth/signin" className="btn btn-primary">
                Sign In
              </a>
            </div>
          </div>
        )
      }
      console.error('Failed to fetch users:', err?.message)
    }
  }

  return (
    <>
      {!isSignedIn ? (
        <div className="auth-error-container">
          <div className="auth-error-card">
            <h2>Authentication Required</h2>
            <p>Please sign in to view users.</p>
            <a href="/auth/signin" className="btn btn-primary">
              Sign In
            </a>
          </div>
        </div>
      ) : (
        <>
          <div className="page-header">
            <div>
              <h1 className="page-title">Users</h1>
              <p className="page-subtitle">Manage registered users.</p>
            </div>
          </div>

          <UsersClient users={users} />
        </>
      )}
    </>
  )
}
