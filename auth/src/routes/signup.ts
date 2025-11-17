import express, { Request, Response } from 'express'
import { body } from 'express-validator' // for request validation
import jwt from 'jsonwebtoken' // for creating JWT
import { User } from '../models/user'
import { BadRequestError,validateRequest } from '@datnxecommerce/common'

const router = express.Router() // Create a router instance

router.post('/api/users/signup', [
    // middleware validation
    body('email').isEmail().withMessage('Email must be valid'),
    body('password').trim().isLength({ min: 4, max: 20 }).withMessage('Password must be between 4 and 20 characters')
   ],
    validateRequest,
    // define req, res with types
    async (req: Request, res: Response) => {

        // new User { email, password }
        const { email, password } = req.body

        const existingUser = await User.findOne({ email }) // check if user exists
        if (existingUser) {
            throw new BadRequestError('Email in use') // throw error if user exists
        }

        const user = User.build({ email, password }) // use build method to create user
        await user.save() // save user to DB

        // Generate JWT
        const userJwt = jwt.sign({
            id: user.id,
            email: user.email
        }, process.env.JWT_KEY! // non-null assertion
        ) 

        // Store it on session object
        req.session = { jwt: userJwt }

        res.status(201).send(user) // send back created user with 201 status
    })

export { router as signupRouter } // Export the router 