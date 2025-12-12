import axios from 'axios'

import { fetchCurrentUser } from '../../../lib/server-auth'
import { getCookieHeader } from '../../../lib/get-cookie-header'
import { requireEnv } from '../../../lib/require-env'

export const metadata = {
  title: 'User Detail | Admin'
}

export const dynamic = 'force-dynamic'

export default async function AdminUserDetailPage({ params }) {
  const cookieHeader = await getCookieHeader()
  const currentUser = await fetchCurrentUser(cookieHeader)
  const isSignedIn = !!currentUser

  const apiBase = requireEnv('API_GATEWAY_URL')
  const { userId } = await params

  let user = null
  if (isSignedIn) {
    try {
      const { data } = await axios.get(`${apiBase}/api/admin/users/${userId}`, {
        headers: { Cookie: cookieHeader }
      })
      user = data
    } catch {
      user = null
    }
  }

  return (
    <>
      {!isSignedIn ? (
        <div className="alert alert-warning">
          Please sign in to view user details. <a href="/auth/signin">Sign in</a>
        </div>
      ) : !user ? (
        <div className="alert alert-danger">User not found.</div>
      ) : (
        <>
          <div className="row mb-4">
            <div className="col">
              <h1 className="h4 mb-1">User Detail</h1>
              <p className="text-muted mb-0">{user.email}</p>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <dl className="row mb-0">
                <dt className="col-sm-3">ID</dt>
                <dd className="col-sm-9">{user.id}</dd>

                <dt className="col-sm-3">Email</dt>
                <dd className="col-sm-9">{user.email}</dd>

                <dt className="col-sm-3">Role</dt>
                <dd className="col-sm-9">{user.role}</dd>

                <dt className="col-sm-3">Status</dt>
                <dd className="col-sm-9">{user.isBlocked ? 'Blocked' : 'Active'}</dd>

                <dt className="col-sm-3">Name</dt>
                <dd className="col-sm-9">{user.name || '-'}</dd>

                <dt className="col-sm-3">Phone</dt>
                <dd className="col-sm-9">{user.phone || '-'}</dd>

                <dt className="col-sm-3">Address</dt>
                <dd className="col-sm-9">{user.address || '-'}</dd>
              </dl>
            </div>
          </div>
        </>
      )}
    </>
  )
}
