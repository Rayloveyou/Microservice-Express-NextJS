'use client'

export default function RecentOrdersTable({ orders }) {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="data-table-container">
      <div className="data-table-header">
        <h3 className="data-table-title">📋 Recent Orders</h3>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Customer</th>
            <th>Total</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {orders && orders.length > 0 ? (
            orders.map((order) => {
              const orderId = order.id || order._id
              return (
                <tr key={orderId}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                    {orderId ? `${orderId.toString().substring(0, 8)}...` : 'N/A'}
                  </td>
                  <td>{order.userEmail || order.userId || 'Unknown'}</td>
                  <td style={{ fontWeight: 600, color: '#00f2ea' }}>
                    ${order.total?.toFixed(2) || '0.00'}
                  </td>
                  <td style={{ color: '#a1a1aa', fontSize: '0.875rem' }}>
                    {order.createdAt ? formatDate(order.createdAt) : 'N/A'}
                  </td>
                </tr>
              )
            })
          ) : (
            <tr>
              <td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: '#71717a' }}>
                No orders found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
