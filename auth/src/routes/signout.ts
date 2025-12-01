import express from 'express'
import { User } from '../models/user'

const router = express.Router() // Create a router instance

const handleSignout = async (req: express.Request, res: express.Response) => {
  // Clear access token session
  req.session = null

  // Clear refresh token cookie
  res.cookie('refreshToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  })

  // Best-effort: invalidate refresh token in DB if we can identify the user
  const refreshToken = req.headers.cookie
    ?.split(';')
    .map(c => c.trim())
    .find(c => c.startsWith('refreshToken='))
    ?.split('=')[1]

  if (refreshToken) {
    await User.updateOne(
      { refreshToken },
      { $unset: { refreshToken: '', refreshTokenExpiresAt: '' } }
    )
  }

  res.send({})
}

router.post('/api/users/signout', handleSignout)

export { router as signoutRouter } // Export the router
