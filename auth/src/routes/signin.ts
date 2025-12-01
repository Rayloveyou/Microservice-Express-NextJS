import express, { Request, Response } from 'express'
import { body } from 'express-validator' // for request validation
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { User } from '../models/user'
import { Password } from '../services/password'
import { BadRequestError, UserRole, validateRequest } from '@datnxecommerce/common'

const router = express.Router() // Create a router instance

router.post(
  '/api/users/signin',
  [
    body('email').isEmail().withMessage('Email must be valid'),
    body('password').trim().notEmpty().withMessage('You must supply a password')
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const { email, password } = req.body

    // Check if user exists
    const existingUser = await User.findOne({ email })
    if (!existingUser) {
      throw new BadRequestError('Invalid credentials')
    }

    // Compare passwords
    const passwordsMatch = await Password.compare(existingUser.password, password)
    if (!passwordsMatch) {
      throw new BadRequestError('Invalid credentials')
    }

    // If this is the configured admin email but role is still user, upgrade to Admin
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@gmail.com'
    if (email === adminEmail && existingUser.role !== UserRole.Admin) {
      existingUser.role = UserRole.Admin
    }

    // Generate access token (short-lived)
    const accessToken = jwt.sign(
      { id: existingUser.id, email: existingUser.email, role: existingUser.role },
      process.env.JWT_KEY!,
      { expiresIn: '15m' }
    )

    // Generate refresh token (random string, long-lived)
    const refreshToken = crypto.randomBytes(32).toString('hex')
    const refreshTtlDays = parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || '7', 10)
    const refreshExpires = new Date()
    refreshExpires.setDate(refreshExpires.getDate() + refreshTtlDays)

    existingUser.refreshToken = refreshToken
    existingUser.refreshTokenExpiresAt = refreshExpires
    await existingUser.save()

    // Set access token in session cookie
    req.session = { jwt: accessToken }

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: refreshTtlDays * 24 * 60 * 60 * 1000
    })

    res.status(200).send(existingUser)
  }
)

export { router as signinRouter } // Export the router
