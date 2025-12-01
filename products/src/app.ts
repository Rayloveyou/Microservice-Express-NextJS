import express from 'express'
import cookieSession from 'cookie-session'
import { errorHandler, NotFoundError, currentUser, requireNotRevoked } from '@datnxecommerce/common'
import { createProductRouter } from './routes/new'
import { showProductRouter } from './routes/show'
import { indexProductRouter } from './routes/index'
import { updateProductRouter } from './routes/update'
import { deleteProductRouter } from './routes/delete'
import { reserveProductRouter } from './routes/reserve'

const app = express()

app.set('trust proxy', true) // trust traffic from proxy (e.g., ingress-nginx)
app.use(express.json()) // built-in middleware to parse JSON bodies
app.use(
  cookieSession({
    signed: false, // disable encryption
    secure: process.env.NODE_ENV === 'production' // secure cookies only in prod
  })
)

// Middleware to extract current user from JWT
app.use(currentUser)
app.use(requireNotRevoked)

// Router
app.use(createProductRouter)
app.use(showProductRouter)
app.use(indexProductRouter)
app.use(updateProductRouter)
app.use(deleteProductRouter)
app.use(reserveProductRouter)

// Handle all other routes - throw NotFoundError
app.use((req, res, next) => {
  throw new NotFoundError()
})

// Middleware
app.use(errorHandler) // Use the errorHandler middleware

export { app } // Export the app
