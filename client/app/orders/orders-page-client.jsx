'use client'
import Link from 'next/link'

export default function OrdersPageClient({ orders, currentUser }) {
  const orderList = orders.map(order => {
    const statusBadge = {
      Created: 'text-bg-warning',
      Complete: 'text-bg-success',
      Cancelled: 'text-bg-secondary'
    }

    const totalPrice = typeof order.total === 'number' ? order.total.toFixed(2) : '0.00'

    const firstTitle =
      order.items && order.items.length > 0
        ? order.items[0].titleSnapshot || order.items[0].product?.title || 'N/A'
        : 'N/A'
    const itemCount = order.items ? order.items.length : 0
    const totalUnits = order.items
      ? order.items.reduce((s, i) => s + (i.quantity || 0), 0)
      : order.quantity || 0

    return (
      <tr key={order.id}>
        <td>
          <Link href={`/orders/${order.id}`} className="text-decoration-none">
            {firstTitle}
          </Link>
          {itemCount > 1 && <div className="small text-muted">+ {itemCount - 1} more item(s)</div>}
        </td>
        <td>{totalUnits}</td>
        <td className="fw-semibold">${totalPrice}</td>
        <td>
          <span className={`badge ${statusBadge[order.status] || 'text-bg-secondary'}`}>
            {order.status}
          </span>
        </td>
        <td>{order.expiredAt ? new Date(order.expiredAt).toLocaleDateString() : 'N/A'}</td>
        <td>
          {order.status === 'Created' ? (
            <Link href={`/orders/${order.id}`} className="btn btn-brand btn-sm">
              Pay Now
            </Link>
          ) : (
            <Link href={`/orders/${order.id}`} className="btn btn-outline-secondary btn-sm">
              View
            </Link>
          )}
        </td>
      </tr>
    )
  })

  return (
    <div className="mt-4">
      <div className="hero brand-gradient mb-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
          {!currentUser && (
            <div className="d-flex gap-2">
              <a className="btn btn-outline-brand btn-sm" href="/auth/signin">
                Sign in
              </a>
              <a className="btn btn-brand btn-sm" href="/auth/signup">
                Create account
              </a>
            </div>
          )}
          <div>
            <span className="badge rounded-pill badge-brand mb-2">Orders</span>
            <h1 className="display-6 mb-2">My Orders</h1>
            <p className="mb-0">Track and manage your product purchases</p>
          </div>
        </div>
      </div>

      <div className="card card-product">
        <div className="card-body">
          {orders.length === 0 ? (
            <div className="text-center py-5">
              <p className="text-muted mb-3">You haven't made any orders yet.</p>
              <Link href="/" className="btn btn-brand">
                Browse Products
              </Link>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>First Item</th>
                    <th>Total Units</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>{orderList}</tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
