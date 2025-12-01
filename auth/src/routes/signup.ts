import express, { Request, Response } from 'express'
import { body } from 'express-validator' // for request validation
import jwt from 'jsonwebtoken' // for creating JWT
import crypto from 'crypto'
import { User } from '../models/user'
import { BadRequestError, validateRequest, UserRole } from '@datnxecommerce/common'

const router = express.Router() // Create a router instance

router.post(
  '/api/users/signup',
  [
    // middleware validation
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Email must be valid'),
    body('password')
      .trim()
      .isLength({ min: 4, max: 20 })
      .withMessage('Password must be between 4 and 20 characters'),
    body('phone').trim().notEmpty().withMessage('Phone is required'),
    body('address').trim().notEmpty().withMessage('Address is required')
  ],
  validateRequest,
  // define req, res with types
  async (req: Request, res: Response) => {
    // new User { email, password, name, phone, address }
    const { email, password, name, phone, address } = req.body as {
      email: string
      password: string
      name?: string
      phone?: string
      address?: string
    }

    const existingUser = await User.findOne({ email }) // check if user exists
    if (existingUser) {
      throw new BadRequestError('Email in use') // throw error if user exists
    }

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@gmail.com'
    const role = email === adminEmail ? UserRole.Admin : UserRole.User

    const user = User.build({
      email,
      password,
      role,
      ...(name ? { name } : {}),
      ...(phone ? { phone } : {}),
      ...(address ? { address } : {})
    }) // use build method to create user
    await user.save() // save user to DB

    // Generate access token (short-lived)
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_KEY!,
      { expiresIn: '15m' }
    )

    // Generate refresh token (random string, long-lived)
    const refreshToken = crypto.randomBytes(32).toString('hex')
    const refreshTtlDays = parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || '7', 10)
    const refreshExpires = new Date()
    refreshExpires.setDate(refreshExpires.getDate() + refreshTtlDays)

    user.refreshToken = refreshToken
    user.refreshTokenExpiresAt = refreshExpires
    await user.save()

    // Store access token on session object
    req.session = { jwt: accessToken }

    // Set refresh token cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: refreshTtlDays * 24 * 60 * 60 * 1000
    })

    res.status(201).send(user) // send back created user with 201 status
  }
)

export { router as signupRouter } // Export the router
