import axios from 'axios'

import { fetchCurrentUser } from '../../lib/server-auth'
import { getCookieHeader } from '../../lib/get-cookie-header'
import UsersClient from './users-client'

export const metadata = {
  title: 'Users'
}

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const cookieHeader = await getCookieHeader()
  const currentUser = await fetchCurrentUser(cookieHeader)
  const isSignedIn = !!currentUser

  const apiBase = process.env.API_GATEWAY_URL?.trim()
  if (!apiBase) {
    throw new Error('API_GATEWAY_URL is not configured for admin')
  }
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
          <div className="alert alert-warning">
            Session expired. Please <a href="/auth/signin">sign in</a> again.
          </div>
        )
      }
      throw err
    }
  }

  return (
    <>
      {!isSignedIn ? (
        <div className="alert alert-warning">
          Please sign in to view users. <a href="/auth/signin">Sign in</a>
        </div>
      ) : (
        <>
          <div className="row mb-4">
            <div className="col">
              <h1 className="h3 mb-1">Users</h1>
              <p className="text-muted mb-0">List of registered users.</p>
            </div>
          </div>

          <UsersClient users={users} />
        </>
      )}
    </>
  )
}
