'use client'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { useLoading } from '../../context/loading-context'
import { useNotifications } from '../../context/notifications-context'

export default function ProfilePageClient({ currentUser }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const { startLoading, stopLoading } = useLoading()
  const { addNotification } = useNotifications()

  useEffect(() => {
    let mounted = true
    const fetchProfile = async () => {
      setLoading(true)
      startLoading()
      try {
        const { data } = await axios.get('/api/users/profile')
        if (!mounted) return
        setName(data.name || '')
        setPhone(data.phone || '')
        setAddress(data.address || '')
      } catch (err) {
        if (!mounted) return
        setError(err.response?.data?.errors?.[0]?.message || 'Failed to load profile')
      } finally {
        if (mounted) setLoading(false)
        stopLoading()
      }
    }

    fetchProfile()
    return () => {
      mounted = false
    }
  }, [])

  const handleSubmit = async e => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    startLoading()

    try {
      await axios.put('/api/users/profile', {
        name,
        phone,
        address
      })
      addNotification('Cập nhật thông tin thành công')
    } catch (err) {
      setError(err.response?.data?.errors?.[0]?.message || 'Failed to update profile')
    } finally {
      setSaving(false)
      stopLoading()
    }
  }

  if (!currentUser) {
    return (
      <div className="mt-4">
        <div className="alert alert-warning">Please sign in to view your profile.</div>
      </div>
    )
  }

  return (
    <div className="mt-4">
      <div className="hero brand-gradient mb-4">
        <div>
          <span className="badge rounded-pill badge-brand mb-2">Profile</span>
          <h1 className="display-6 mb-2">Your Profile</h1>
          <p className="mb-0">Manage your personal information.</p>
        </div>
      </div>

      <div className="card card-product">
        <div className="card-body">
          {loading ? (
            <div className="text-muted">Loading profile...</div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Email (read-only)</label>
                <input className="form-control" value={currentUser.email} disabled />
              </div>
              <div className="mb-3">
                <label className="form-label">Name</label>
                <input
                  className="form-control"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Phone</label>
                <input
                  className="form-control"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Address</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                />
              </div>
              {error && <div className="alert alert-danger">{error}</div>}
              <button className="btn btn-brand" type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
