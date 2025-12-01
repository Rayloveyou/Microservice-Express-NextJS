'use client'

import Link from 'next/link'
import { useState } from 'react'
import axios from 'axios'

export default function ProductsClient({ products }) {
  const [loadingId, setLoadingId] = useState(null)

  const handleDelete = async id => {
    const confirmed = window.confirm('Delete this product?')
    if (!confirmed) return
    try {
      setLoadingId(id)
      await axios.delete(`/api/products/${id}`)
      window.location.reload()
    } catch (err) {
      alert('Failed to delete product')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <>
      <div className="card">
        <div className="card-body">
          {products.length === 0 ? (
            <div className="text-muted">No products.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Price</th>
                    <th>Quantity</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id}>
                      <td>{p.title}</td>
                      <td>${p.price}</td>
                      <td>{p.quantity}</td>
                      <td className="text-end">
                        <Link
                          href={`/products/${p.id}`}
                          className="btn btn-sm btn-outline-secondary me-2"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDelete(p.id)}
                          disabled={loadingId === p.id}
                        >
                          {loadingId === p.id ? 'Deleting...' : 'Delete'}
                        </button>
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
  )
}

