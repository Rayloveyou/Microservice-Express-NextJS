'use client'

import Link from 'next/link'
import { useState } from 'react'
import axios from 'axios'
import { useNotification } from '../../context/notification-context'

export default function ProductsClient({ products: initialProducts }) {
  const [products, setProducts] = useState(initialProducts)
  const [loadingId, setLoadingId] = useState(null)
  const { success, error } = useNotification()

  const handleDelete = async id => {
    const confirmed = window.confirm('Are you sure you want to delete this product?')
    if (!confirmed) return

    try {
      setLoadingId(id)
      await axios.delete(`/api/products/${id}`, { withCredentials: true })

      // Remove from local state instead of reloading
      setProducts(prev => prev.filter(p => p.id !== id))
      success('Product deleted successfully')
    } catch (err) {
      const message = err?.response?.data?.errors?.[0]?.message || 'Failed to delete product'
      error(message)

      // If unauthorized, redirect to signin
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        setTimeout(() => {
          window.location.href = '/auth/signin'
        }, 1500)
      }
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="data-table-container">
      <div className="data-table-header">
        <h3 className="data-table-title">Products ({products.length})</h3>
        <Link href="/products/new" className="btn btn-primary btn-sm">
          + Add Product
        </Link>
      </div>

      {products.length === 0 ? (
        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <p>No products yet.</p>
          <Link href="/products/new" className="btn btn-primary">
            Create Your First Product
          </Link>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Title</th>
              <th>Price</th>
              <th>Quantity</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id}>
                <td>
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt={p.title}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 8,
                        objectFit: 'cover',
                        background: 'var(--bg-elevated)'
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 8,
                        background: 'var(--bg-elevated)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-muted)'
                      }}
                    >
                      📦
                    </div>
                  )}
                </td>
                <td>
                  <strong>{p.title}</strong>
                </td>
                <td style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>${p.price}</td>
                <td>{p.quantity}</td>
                <td>
                  <span className={`status-badge ${p.quantity > 0 ? 'completed' : 'cancelled'}`}>
                    {p.quantity > 0 ? 'In Stock' : 'Out of Stock'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Link href={`/products/${p.id}`} className="btn btn-secondary btn-sm">
                      Edit
                    </Link>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => handleDelete(p.id)}
                      disabled={loadingId === p.id}
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid var(--error)',
                        color: 'var(--error)'
                      }}
                    >
                      {loadingId === p.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
