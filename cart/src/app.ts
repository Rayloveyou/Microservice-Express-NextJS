import express from 'express'
import cookieSession from 'cookie-session'
import { errorHandler, NotFoundError, currentUser } from '@datnxecommerce/common'
import { addToCartRouter } from './routes/add-to-cart'
import { viewCartRouter } from './routes/view-cart'
import { removeFromCartRouter } from './routes/remove-from-cart'
import { checkoutCartRouter } from './routes/checkout'

const app = express()

app.set('trust proxy', true)
app.use(express.json())
app.use(cookieSession({
  signed: false,
  secure: process.env.NODE_ENV !== 'test'
}))

app.use(currentUser)

// Routes
app.use(addToCartRouter)
app.use(viewCartRouter)
app.use(removeFromCartRouter)
app.use(checkoutCartRouter)

app.use((req, res, next) => {
  throw new NotFoundError()
})

app.use(errorHandler)

export { app }
