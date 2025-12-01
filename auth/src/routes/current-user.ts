import express from 'express'
import jwt from 'jsonwebtoken'
import { currentUser } from '@datnxecommerce/common'
import { User } from '../models/user'
import { isUserRevoked } from '../services/revocation'

const router = express.Router() // Create a router instance

// Parse cookies from header string into object
const parseCookies = (cookieHeader?: string) => {
  const list: Record<string, string> = {}
  if (!cookieHeader) return list

  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=')
    const key = parts.shift()?.trim()
    if (!key) return
    const value = decodeURIComponent(parts.join('=').trim())
    list[key] = value
  })
  return list
}

router.get('/api/users/currentuser', currentUser, async (req, res) => {
  let blocked = false

  if (!req.currentUser) {
    // Try refresh token when access token is missing/expired
    const cookies = parseCookies(req.headers.cookie)
    const refreshToken = cookies['refreshToken']
    if (!refreshToken) {
      return res.send({ currentUser: null, blocked })
    }

    const user = await User.findOne({ refreshToken })
    const isRevoked = user ? await isUserRevoked(user.id) : false
    const invalidOrBlocked =
      !user ||
      !user.refreshTokenExpiresAt ||
      user.refreshTokenExpiresAt < new Date() ||
      user.isBlocked ||
      isRevoked

    if (invalidOrBlocked) {
      blocked = !!(user?.isBlocked || isRevoked)
      req.session = null
      res.cookie('refreshToken', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0
      })
      return res.send({ currentUser: null, blocked })
    }

    // Issue new access token (include role so downstream services can authorize)
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_KEY!,
      { expiresIn: '15m' }
    )
    req.session = { jwt: accessToken }

    return res.send({
      currentUser: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      blocked
    })
  }

  const existingUser = await User.findById(req.currentUser.id)

  const isRevoked = existingUser ? await isUserRevoked(existingUser.id) : false
  if (!existingUser || existingUser.isBlocked || isRevoked) {
    blocked = !!(existingUser?.isBlocked || isRevoked)
    req.session = null
    res.cookie('refreshToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0
    })
    return res.send({ currentUser: null, blocked })
  }

  // Refresh the access token with role to keep downstream authorization working
  const accessToken = jwt.sign(
    { id: existingUser.id, email: existingUser.email, role: existingUser.role },
    process.env.JWT_KEY!,
    { expiresIn: '15m' }
  )
  req.session = { jwt: accessToken }

  res.send({
    currentUser: {
      id: existingUser.id,
      email: existingUser.email,
      role: existingUser.role
    },
    blocked
  })
})

export { router as currentUserRouter } // Export the router
