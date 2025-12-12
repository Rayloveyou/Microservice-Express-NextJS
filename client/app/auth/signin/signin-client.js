'use client'

import { useState } from 'react'
import axios from 'axios'
import Link from 'next/link'

export default function SigninClient() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await axios.post(
        '/api/users/signin',
        { email, password },
        { withCredentials: true }
      )

      // Check if user is blocked
      if (data.isBlocked) {
        setError('Your account has been blocked. Please contact support.')
        setLoading(false)
        return
      }

      window.location.href = '/'
    } catch (err) {
      const msg = err?.response?.data?.errors?.[0]?.message || 'Sign in failed'
      setError(msg)
      setLoading(false)
    }
  }

  return (
    <div className="mt-4">
      <div className="hero brand-gradient mb-4">
        <div>
          <span className="badge rounded-pill badge-brand mb-2">Account</span>
          <h1 className="display-6 mb-2">Welcome back</h1>
          <p className="mb-0">Sign in to continue shopping and manage your orders.</p>
        </div>
      </div>

      <div className="card card-product">
        <div className="card-body">
          <form onSubmit={onSubmit}>
            <div className="mb-3">
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <input
                className="form-control"
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={loading}
                placeholder="you@example.com"
              />
            </div>
            <div className="mb-3">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                className="form-control"
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={loading}
                placeholder="••••••••"
              />
            </div>
            {error && (
              <div className="alert alert-danger">
                <p className="mb-0">{error}</p>
              </div>
            )}
            <div className="d-flex justify-content-between align-items-center">
              <button className="btn btn-brand" type="submit" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
              <Link href="/auth/signup" className="text-decoration-none">
                Need an account? Sign up
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

