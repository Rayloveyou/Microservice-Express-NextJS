'use client'

import Link from 'next/link'
import axios from 'axios'
import { useState } from 'react'
import { useNotification } from '../../context/notification-context'

export default function UsersClient({ users: initialUsers }) {
  const [users, setUsers] = useState(initialUsers)
  const [loadingId, setLoadingId] = useState(null)
  const { success, error } = useNotification()

  const toggleBlock = async user => {
    const action = user.isBlocked ? 'unblock' : 'block'
    const confirmMessage = user.isBlocked
      ? `Unblock ${user.email}? They will be able to use their account again.`
      : `Block ${user.email}? They will be signed out immediately and cannot use their account.`

    const confirmed = window.confirm(confirmMessage)
    if (!confirmed) return

    try {
      setLoadingId(user.id)
      await axios.post(`/api/admin/users/${user.id}/${action}`, {}, { withCredentials: true })

      // Update local state
      setUsers(prev => prev.map(u => (u.id === user.id ? { ...u, isBlocked: !u.isBlocked } : u)))

      success(`User ${user.isBlocked ? 'unblocked' : 'blocked'} successfully`)
    } catch (err) {
      const message = err?.response?.data?.errors?.[0]?.message || 'Failed to update user status'
      error(message)

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
        <h3 className="data-table-title">Users ({users.length})</h3>
      </div>

      {users.length === 0 ? (
        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <p>No users found.</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: 'var(--gradient-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: 14
                      }}
                    >
                      {u.email?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500 }}>{u.email}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>ID: {u.id.slice(-8)}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span
                    className={`status-badge ${u.role === 'admin' ? 'completed' : 'pending'}`}
                    style={{ textTransform: 'capitalize' }}
                  >
                    {u.role}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${u.isBlocked ? 'cancelled' : 'completed'}`}>
                    {u.isBlocked ? 'Blocked' : 'Active'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => toggleBlock(u)}
                      disabled={loadingId === u.id}
                      style={
                        u.isBlocked
                          ? {
                              background: 'rgba(34, 197, 94, 0.1)',
                              border: '1px solid var(--success)',
                              color: 'var(--success)'
                            }
                          : {
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid var(--error)',
                              color: 'var(--error)'
                            }
                      }
                    >
                      {loadingId === u.id ? 'Processing...' : u.isBlocked ? 'Unblock' : 'Block'}
                    </button>
                    <Link href={`/users/${u.id}`} className="btn btn-secondary btn-sm">
                      View
                    </Link>
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
