import express from 'express'
import cookieSession from 'cookie-session'
import { errorHandler, NotFoundError, currentUser } from '@datnxtickets/common'
import { createOrderRouter } from './routes/new'
import { showOrderRouter } from './routes/show'
import { indexOrderRouter } from './routes/index'
import { deleteOrderRouter } from './routes/delete'


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
app.use(createOrderRouter)
app.use(showOrderRouter)
app.use(indexOrderRouter)
app.use(deleteOrderRouter)

// Handle all other routes - throw NotFoundError
app.use((req, res, next) => {
  throw new NotFoundError()
})

// Middleware
app.use(errorHandler) // Use the errorHandler middleware

export { app } // Export the app