import express from 'express'
import cookieSession from 'cookie-session'
import { currentUserRouter } from './routes/current-user'
import { signinRouter } from './routes/signin'
import { signoutRouter } from './routes/signout'
import { signupRouter } from './routes/signup'
import { profileRouter } from './routes/profile'
import { adminUsersRouter } from './routes/admin-users'
import { refreshRouter } from './routes/refresh'
import { errorHandler, NotFoundError, currentUser } from '@datnxecommerce/common'

const app = express()

app.set('trust proxy', true) // trust traffic from proxy (e.g., ingress-nginx)
app.use(express.json()) // built-in middleware to parse JSON bodies
app.use(
  cookieSession({
    name: 'session',
    signed: false, // disable encryption
    secure: process.env.NODE_ENV === 'production', // only secure in prod
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000 // 15 minutes for access token cookie
  })
)

// Middleware to extract current user from JWT (needed for requireAuth/requireAdmin)
app.use(currentUser)

// Router
app.use(currentUserRouter)
app.use(signinRouter)
app.use(signoutRouter)
app.use(signupRouter)
app.use(profileRouter)
app.use(adminUsersRouter)
app.use(refreshRouter)

// Handle all other routes - throw NotFoundError
app.use((req, res, next) => {
  throw new NotFoundError()
})

// Middleware
app.use(errorHandler) // Use the errorHandler middleware

export { app } // Export the app
