import express, { Request, Response } from 'express'
import { body } from 'express-validator'
import axios from 'axios'
import {
  requireAuth,
  validateRequest,
  BadRequestError,
  NotFoundError,
  NotAuthorizedError
} from '@datnxecommerce/common'
import { Order } from '../models/order'
import { OrderStatus } from '@datnxecommerce/common'
import { stripe } from '../stripe'
import { Payment } from '../models/payment'
// Kafka publisher (new)
import { PaymentCreatedProducer } from '../events/producers/payment-created-producer'
import { kafkaWrapper } from '../kafka-wrapper'
// NATS publisher (legacy)
// import { PaymentCreatedPublisher } from '../events/publishers/payment-created-publisher'
// import { natsWrapper } from '../nats-wrapper'

const router = express.Router()

router.post(
  '/api/payments',
  requireAuth,
  [body('token').not().isEmpty(), body('orderId').not().isEmpty()],
  validateRequest,
  async (req: Request, res: Response) => {
    const { token, orderId } = req.body
    // Make sure that the order exists
    const order = await Order.findById(orderId)

    if (!order) {
      throw new NotFoundError()
    }
    // Make sure that the order belongs to the user
    if (order.userId! != req.currentUser!.id) {
      throw new NotAuthorizedError()
    }

    // Make sure that the order is not cancelled
    if (order.status === OrderStatus.Cancelled) {
      throw new BadRequestError('Cannot pay for a cancelled order')
    }

    // Before charging, reserve stock atomically in Product service (first payer wins)
    const productServiceUrl = process.env.PRODUCT_SERVICE_URL
    if (!productServiceUrl) {
      throw new BadRequestError('PRODUCT_SERVICE_URL is not configured')
    }

    try {
      await axios.post(`${productServiceUrl}/api/products/reserve`, {
        items: order.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity
        }))
      })
    } catch (err: any) {
      const message =
        err?.response?.data?.errors?.[0]?.message || 'Not enough stock to complete this order'
      throw new BadRequestError(message)
    }

    // Create a charge with Stripe
    const charge = await stripe.charges.create({
      currency: 'usd',
      amount: Math.round(order.total * 100),
      source: token,
      description: `Order ${order.id}`
    })

    const payment = Payment.build({
      orderId,
      stripeId: charge.id
    })
    await payment.save()

    // Publish PaymentCreated event to Kafka topic 'payment.created'
    // Dùng orderId làm message key để đảm bảo ordering
    await new PaymentCreatedProducer(kafkaWrapper.producer).publish(
      {
        id: payment.id,
        orderId: payment.orderId,
        stripeId: payment.stripeId,
        userId: order.userId,
        items: order.items.map(item => ({
          productId: item.productId,
          price: item.price || 0,
          quantity: item.quantity,
          title: item.title || ''
        }))
      },
      orderId
    ) // Message key = orderId

    res.status(201).send({ id: charge.id })
  }
)

export { router as createChargeRouter }
