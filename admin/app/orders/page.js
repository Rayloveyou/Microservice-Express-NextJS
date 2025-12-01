import axios from 'axios'
import Link from 'next/link'

import { fetchCurrentUser } from '../../lib/server-auth'
import { getCookieHeader } from '../../lib/get-cookie-header'

export const metadata = {
  title: 'Orders'
}

export const dynamic = 'force-dynamic'

export default async function OrdersPage() {
  const cookieHeader = await getCookieHeader()
  const currentUser = await fetchCurrentUser(cookieHeader)
  const isSignedIn = !!currentUser

  const gatewayUrl = process.env.API_GATEWAY_URL
  if (!gatewayUrl) {
    throw new Error('API_GATEWAY_URL is not configured for admin')
  }
  let orders = []

  if (isSignedIn) {
    try {
      const { data } = await axios.get(`${gatewayUrl}/api/orders`, {
        headers: { Cookie: cookieHeader },
        withCredentials: true
      })
      const all = Array.isArray(data) ? data : []
      orders = all.filter(o => o.status === 'complete')
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
          Please sign in to view orders. <a href="/auth/signin">Sign in</a>
        </div>
      ) : (
        <>
          <div className="row mb-4">
            <div className="col">
              <h1 className="h3 mb-1">Orders</h1>
              <p className="text-muted mb-0">List of paid (completed) orders.</p>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              {orders.length === 0 ? (
                <div className="text-muted">No completed orders yet.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>User</th>
                        <th>Status</th>
                        <th>Total</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(o => (
                        <tr key={o.id}>
                          <td>{o.id}</td>
                          <td>{o.userEmail || o.userId}</td>
                          <td>{o.status}</td>
                          <td>${typeof o.total === 'number' ? o.total.toFixed(2) : o.total}</td>
                          <td className="text-end">
                            <Link
                              href={`/orders/${o.id}`}
                              className="btn btn-sm btn-outline-secondary"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
