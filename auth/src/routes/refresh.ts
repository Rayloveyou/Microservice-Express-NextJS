import express, { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { User } from '../models/user'
import { isUserRevoked } from '../services/revocation'

const router = express.Router()

const clearAuthCookies = (res: Response) => {
  res.cookie('refreshToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  })
}

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

router.post('/api/users/refresh', async (req: Request, res: Response) => {
  const cookies = parseCookies(req.headers.cookie)
  const refreshToken = cookies['refreshToken']

  if (!refreshToken) {
    return res.status(401).send({ errors: [{ message: 'Refresh token missing' }] })
  }

  const user = await User.findOne({ refreshToken })
  const isRevoked = user ? await isUserRevoked(user.id) : false

  if (
    !user ||
    !user.refreshTokenExpiresAt ||
    user.refreshTokenExpiresAt < new Date() ||
    user.isBlocked ||
    isRevoked
  ) {
    req.session = null
    clearAuthCookies(res)
    return res.status(401).send({ errors: [{ message: 'Refresh token invalid or expired' }] })
  }

  // Issue new access token
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_KEY!,
    { expiresIn: '15m' }
  )

  req.session = { jwt: accessToken }

  res.cookie(
    'refreshToken',
    refreshToken,
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge:
        (process.env.REFRESH_TOKEN_TTL_DAYS
          ? parseInt(process.env.REFRESH_TOKEN_TTL_DAYS, 10)
          : 7) *
        24 *
        60 *
        60 *
        1000
    }
  )

  res.send({
    currentUser: {
      id: user.id,
      email: user.email,
      role: user.role
    },
    blocked: false
  })
})

export { router as refreshRouter }
