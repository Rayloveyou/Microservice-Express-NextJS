import express from 'express'
import cookieSession from 'cookie-session'
import { errorHandler, NotFoundError, currentUser } from '@datnxtickets/common'
import { createChargeRouter } from './routes/new'

const app = express()

app.set('trust proxy', true) // trust traffic from proxy (e.g., ingress-nginx)
app.use(express.json()) // built-in middleware to parse JSON bodies
app.use(cookieSession({
  signed: false, // disable encryption
  secure: process.env.NODE_ENV !== 'test' // true in k8s with TLS, false in tests
}))

// Middleware to extract current user from JWT
app.use(currentUser)

// Router
app.use(createChargeRouter)

// Handle all other routes - throw NotFoundError
app.use((req, res, next) => {
  throw new NotFoundError()
})

// Middleware
app.use(errorHandler) // Use the errorHandler middleware

export { app } // Export the app