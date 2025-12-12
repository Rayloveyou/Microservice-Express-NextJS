import axios from 'axios'

import OrdersClient from './orders-client'
import { fetchCurrentUser } from '../../lib/server-auth'
import { getCookieHeader } from '../../lib/get-cookie-header'
import { requireEnv } from '../../lib/require-env'

export const metadata = {
  title: 'Orders | Admin'
}

export const dynamic = 'force-dynamic'

export default async function OrdersPage() {
  const cookieHeader = await getCookieHeader()
  const currentUser = await fetchCurrentUser(cookieHeader)
  const isSignedIn = !!currentUser

  const gatewayUrl = requireEnv('API_GATEWAY_URL')
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
      // Log error but don't throw - show empty state instead
      console.error('Failed to fetch orders:', err?.message)
    }
  }

  return (
    <>
      {!isSignedIn ? (
        <div className="auth-error-container">
          <div className="auth-error-card">
            <h2>Authentication Required</h2>
            <p>Please sign in to view orders.</p>
            <a href="/auth/signin" className="btn btn-primary">
              Sign In
            </a>
          </div>
        </div>
      ) : (
        <>
          <div className="page-header">
            <div>
              <h1 className="page-title">Orders</h1>
              <p className="page-subtitle">View and manage completed orders.</p>
            </div>
          </div>

          <OrdersClient orders={orders} />
        </>
      )}
    </>
  )
}
