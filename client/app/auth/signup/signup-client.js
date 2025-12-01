'use client'

import { useState } from 'react'
import axios from 'axios'
import Link from 'next/link'

export default function SignupClient() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await axios.post('/api/users/signup', { email, password, name, phone, address })
      window.location.href = '/'
    } catch (err) {
      const msg = err?.response?.data?.errors?.[0]?.message || 'Signup failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-4">
      <div className="hero brand-gradient mb-4">
        <div>
          <span className="badge rounded-pill badge-brand mb-2">Account</span>
          <h1 className="display-6 mb-2">Create an account</h1>
          <p className="mb-0">Sign up to start shopping and managing your orders.</p>
        </div>
      </div>

      <div className="card card-product">
        <div className="card-body">
          <form onSubmit={onSubmit}>
            <div className="mb-3">
              <label htmlFor="name" className="form-label">
                Name
              </label>
              <input
                className="form-control"
                id="name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="Your full name"
              />
            </div>
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
                placeholder="••••••••"
              />
            </div>
            <div className="mb-3">
              <label htmlFor="phone" className="form-label">
                Phone
              </label>
              <input
                className="form-control"
                id="phone"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
                placeholder="+84..."
              />
            </div>
            <div className="mb-3">
              <label htmlFor="address" className="form-label">
                Address
              </label>
              <textarea
                className="form-control"
                id="address"
                rows={3}
                value={address}
                onChange={e => setAddress(e.target.value)}
                required
                placeholder="Street, City, Country"
              />
            </div>
            {error && (
              <div className="alert alert-danger">
                <p className="mb-0">{error}</p>
              </div>
            )}
            <button className="btn btn-brand" type="submit" disabled={loading}>
              {loading ? 'Signing up...' : 'Sign up'}
            </button>
            <Link href="/auth/signin" className="btn btn-link">
              Already have an account? Sign in
            </Link>
          </form>
        </div>
      </div>
    </div>
  )
}

