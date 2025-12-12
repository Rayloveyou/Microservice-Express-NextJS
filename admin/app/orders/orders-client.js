'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function OrdersClient({ orders: initialOrders }) {
  const [orders] = useState(initialOrders)

  const getStatusBadge = status => {
    const statusMap = {
      complete: 'completed',
      pending: 'pending',
      cancelled: 'cancelled',
      'awaiting:payment': 'pending'
    }
    return statusMap[status] || 'pending'
  }

  const formatDate = dateString => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="data-table-container">
      <div className="data-table-header">
        <h3 className="data-table-title">Completed Orders ({orders.length})</h3>
      </div>

      {orders.length === 0 ? (
        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <p>No completed orders yet.</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Total</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id}>
                <td>
                  <div style={{ fontWeight: 500 }}>#{o.id.slice(-8)}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {o.items?.length || 0} item(s)
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: 'var(--gradient-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: 13
                      }}
                    >
                      {(o.userEmail || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500 }}>{o.userEmail || 'Unknown'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        ID: {o.userId?.slice(-8) || 'N/A'}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`status-badge ${getStatusBadge(o.status)}`}>
                    {o.status === 'complete' ? 'Completed' : o.status}
                  </span>
                </td>
                <td>
                  <span style={{ fontWeight: 600, color: 'var(--success)' }}>
                    ${typeof o.total === 'number' ? o.total.toFixed(2) : o.total}
                  </span>
                </td>
                <td>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {formatDate(o.createdAt)}
                  </div>
                </td>
                <td>
                  <Link href={`/orders/${o.id}`} className="btn btn-secondary btn-sm">
                    View Details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
