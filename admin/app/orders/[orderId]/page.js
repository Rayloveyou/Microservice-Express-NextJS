import axios from 'axios'

import { fetchCurrentUser } from '../../../lib/server-auth'
import { getCookieHeader } from '../../../lib/get-cookie-header'
import { requireEnv } from '../../../lib/require-env'

export const metadata = {
  title: 'Order Detail | Admin'
}

export const dynamic = 'force-dynamic'

export default async function AdminOrderDetailPage({ params }) {
  const cookieHeader = await getCookieHeader()
  const currentUser = await fetchCurrentUser(cookieHeader)
  const isSignedIn = !!currentUser

  const gatewayUrl = requireEnv('API_GATEWAY_URL')
  const { orderId } = await params

  let order = null
  if (isSignedIn) {
    try {
      const { data } = await axios.get(`${gatewayUrl}/api/orders/${orderId}`, {
        headers: { Cookie: cookieHeader }
      })
      order = data
    } catch {
      order = null
    }
  }

  const total = order && typeof order.total === 'number' ? order.total.toFixed(2) : order?.total

  return (
    <>
      {!isSignedIn ? (
        <div className="alert alert-warning">
          Please sign in to view this order. <a href="/auth/signin">Sign in</a>
        </div>
      ) : !order ? (
        <div className="alert alert-danger">Order not found.</div>
      ) : (
        <>
          <div className="row mb-4">
            <div className="col">
              <h1 className="h4 mb-1">Order Detail</h1>
              <p className="text-muted mb-0">
                Order <strong>{order.id}</strong> – Status: <strong>{order.status}</strong>
              </p>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-body">
              <h5 className="card-title mb-3">Customer</h5>
              <dl className="row mb-0">
                <dt className="col-sm-3">User ID</dt>
                <dd className="col-sm-9">{order.userId}</dd>

                <dt className="col-sm-3">Email</dt>
                <dd className="col-sm-9">{order.userEmail || '-'}</dd>
              </dl>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h5 className="card-title mb-3">Items</h5>
              {order.items.length === 0 ? (
                <div className="text-muted">No items in this order.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm table-hover align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Price</th>
                        <th>Quantity</th>
                        <th>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.titleSnapshot}</td>
                          <td>${item.priceSnapshot.toFixed(2)}</td>
                          <td>{item.quantity}</td>
                          <td>${(item.priceSnapshot * item.quantity).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <th colSpan={3} className="text-end">
                          Total
                        </th>
                        <th>${total}</th>
                      </tr>
                    </tfoot>
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
