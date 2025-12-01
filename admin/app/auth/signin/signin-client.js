'use client'

import { useState } from 'react'
import axios from 'axios'

export default function AdminSigninForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const onSubmit = async e => {
    e.preventDefault()
    setError('')
    try {
      await axios.post('/api/users/signin', { email, password })
      window.location.href = '/dashboard'
    } catch (err) {
      const msg = err?.response?.data?.errors?.[0]?.message || 'Sign in failed'
      setError(msg)
    }
  }

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-5">
          <div className="card shadow-sm">
            <div className="card-body">
              <h1 className="h4 mb-3 text-center">Admin Sign In</h1>
              <form onSubmit={onSubmit}>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>
                {error && <div className="alert alert-danger py-2">{error}</div>}
                <button type="submit" className="btn btn-primary w-100">
                  Sign In
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

