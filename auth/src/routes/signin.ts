import express, { Request, Response } from 'express'
import { body } from 'express-validator' // for request validation
import jwt from 'jsonwebtoken'
import { User } from '../models/user'
import { Password } from '../services/password'
import { BadRequestError ,validateRequest } from '@datnxtickets/common'

const router = express.Router() // Create a router instance

router.post('/api/users/signin', [
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

    // Generate JWT
    const userJwt = jwt.sign(
      { id: existingUser.id, email: existingUser.email },
      process.env.JWT_KEY!
    )

    req.session = { jwt: userJwt }

    res.status(200).send(existingUser)
  })

export { router as signinRouter } // Export the router
