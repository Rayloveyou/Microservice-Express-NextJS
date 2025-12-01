import express, { Request, Response } from 'express'
import { requireAuth, BadRequestError } from '@datnxecommerce/common'
import { Cart } from '../models/cart'
import { CartCheckoutProducer } from '../events/producers/cart-checkout-producer'
import { kafkaWrapper } from '../kafka-wrapper'

const router = express.Router()

// Route: Checkout cart - validate stock, publish event and create order
router.post('/api/cart/checkout', requireAuth, async (req: Request, res: Response) => {
  const userId = req.currentUser!.id

  const cart = await Cart.findOne({ userId })

  if (!cart || cart.items.length === 0) {
    throw new BadRequestError('Cart is empty')
  }

  // Publish asynchronous event via Kafka (for observability/other consumers)
  const publisher = new CartCheckoutProducer(kafkaWrapper.producer)
  await publisher.publish({
    userId: cart.userId,
    items: cart.items.map((item: any) => ({
      productId: item.productId,
      quantity: item.quantity
    }))
  })

  // Synchronously create aggregated order by calling Orders service
  // Orders service POST /api/orders accepts { items: [{ productId, quantity }] }
  // Direct service-to-service URL (single source of truth)
  const orderServiceUrl = process.env.ORDER_SERVICE_URL
  if (!orderServiceUrl) {
    throw new BadRequestError('ORDER_SERVICE_URL is not configured')
  }
  const cookieHeader = req.headers.cookie || ''

  const orderPayload = {
    items: cart.items.map((item: any) => ({
      productId: item.productId,
      quantity: item.quantity
    }))
  }

  const response = await fetch(`${orderServiceUrl}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader
    },
    body: JSON.stringify(orderPayload)
  })

  if (!response.ok) {
    const text = await response.text()
    throw new BadRequestError(`Failed to create order: ${text}`)
  }

  const createdOrder = await response.json()

  res.status(201).send({
    message: 'Checkout successful',
    order: createdOrder
  })
})

export { router as checkoutCartRouter }
