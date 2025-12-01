'use client'

import Link from 'next/link'
import axios from 'axios'
import { useState } from 'react'

export default function UsersClient({ users }) {
  const [loadingId, setLoadingId] = useState(null)

  const toggleBlock = async user => {
    const action = user.isBlocked ? 'unblock' : 'block'
    const confirmed = window.confirm(
      user.isBlocked
        ? 'Unblock this user?'
        : 'Block this user? They will be signed out and cannot use their account.'
    )
    if (!confirmed) return
    try {
      setLoadingId(user.id)
      await axios.post(`/api/admin/users/${user.id}/${action}`)
      window.location.reload()
    } catch (err) {
      alert('Failed to update user status')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="card">
      <div className="card-body">
        {users.length === 0 ? (
          <div className="text-muted">No users found.</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td>{u.isBlocked ? 'Blocked' : 'Active'}</td>
                    <td className="text-end">
                      <button
                        type="button"
                        className={
                          'btn btn-sm me-2 ' +
                          (u.isBlocked ? 'btn-outline-success' : 'btn-outline-danger')
                        }
                        onClick={() => toggleBlock(u)}
                        disabled={loadingId === u.id}
                      >
                        {u.isBlocked ? 'Unblock' : 'Block'}
                      </button>
                      <Link href={`/users/${u.id}`} className="btn btn-sm btn-outline-secondary">
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
  )
}

