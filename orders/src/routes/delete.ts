import express, { Request, Response } from 'express'
import { body } from 'express-validator'
import { requireAuth, NotFoundError } from '@datnxecommerce/common'
// Kafka publisher (new)
import { kafkaWrapper } from '../kafka-wrapper'
import { OrderCancelledProducer } from '../events/producers/order-cancelled-producer'
// NATS publisher (legacy)
// import { natsWrapper } from '../nats-wrapper'
// import { OrderCancelledPublisher } from '../events/publishers/order-cancelled-publisher'
import mongoose from 'mongoose'
import { Order, OrderStatus } from '../models/order'
const router = express.Router()

// Route tạo product
router.delete('/api/orders/:id', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params

  // Validate if id is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(req.params.id!)) {
    throw new NotFoundError()
  }

  // Find the order and populate products within items
  const order = await Order.findById(req.params.id).populate('items.product')

  if (!order) {
    throw new NotFoundError()
  }
  // Check if the user is the owner of the order
  if (order.userId !== req.currentUser!.id) {
    throw new NotFoundError()
  }

  order.status = OrderStatus.Cancelled
  await order.save()

  // Publish OrderCancelled event to Kafka topic 'order:cancelled'
  await new OrderCancelledProducer(kafkaWrapper.producer).publish(
    {
      id: order.id,
      version: order.version,
      items: order.items.map(i => ({
        productId: (i.product as any)._id
          ? (i.product as any)._id.toString()
          : i.product.toString(),
        quantity: i.quantity
      })),
      total: order.total
    },
    order.id
  ) // Message key = order.id
  res.status(204).send(order)
})

export { router as deleteOrderRouter }
