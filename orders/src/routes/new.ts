import express, { Request, Response } from 'express'
import { body } from 'express-validator'
import {
  NotFoundError,
  requireAuth,
  validateRequest,
  OrderStatus,
  BadRequestError
} from '@datnxecommerce/common'
import { Product } from '../models/product'
import { Order } from '../models/order'
// Kafka publisher (new)
import { kafkaWrapper } from '../kafka-wrapper'
import { OrderCreatedProducer } from '../events/producers/order-created-producer'
// NATS publisher (legacy)
// import { natsWrapper } from '../nats-wrapper'
// import { OrderCreatedPublisher } from '../events/publishers/order-created-publisher'
import mongoose from 'mongoose'

const router = express.Router()

// Route tạo order
router.post(
  '/api/orders',
  requireAuth,
  [
    body('items').isArray({ min: 1 }).withMessage('Items array is required'),
    body('items.*.productId')
      .custom((input: string) => mongoose.Types.ObjectId.isValid(input))
      .withMessage('Valid productId is required for each item'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1')
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const { items } = req.body as { items: { productId: string; quantity: number }[] }

    // Fetch all products in parallel
    const productIds = items.map(i => i.productId)
    const products = await Product.find({ _id: { $in: productIds } })

    // Map productId -> product
    const productMap: Record<string, any> = {}
    products.forEach(p => {
      productMap[p.id] = p
    })

    // Validate product exists and has stock
    for (const item of items) {
      const product = productMap[item.productId]
      if (!product) throw new NotFoundError()
      const hasEnoughStock = await product.hasStock(item.quantity)
      if (!hasEnoughStock) {
        throw new BadRequestError(`Not enough stock for product ${product.title}`)
      }
    }

    // Build order items array with snapshots
    const orderItems = items.map(item => {
      const product = productMap[item.productId]
      return {
        product,
        quantity: item.quantity,
        priceSnapshot: product.price,
        titleSnapshot: product.title
      }
    })

    const total = orderItems.reduce((sum, it) => sum + it.priceSnapshot * it.quantity, 0)

    const order = Order.build({
      userId: req.currentUser!.id,
      status: OrderStatus.Created,
      items: orderItems,
      total,
      userEmail: req.currentUser!.email
    })
    await order.save()

    // Publish OrderCreated event to Kafka topic 'order:created'
    // Dùng order.id làm message key để đảm bảo ordering
    await new OrderCreatedProducer(kafkaWrapper.producer).publish(
      {
        id: order.id,
        version: order.version,
        status: order.status,
        userId: order.userId,
        items: order.items.map(i => ({
          productId: i.product.id.toString(),
          price: i.priceSnapshot,
          quantity: i.quantity,
          title: i.titleSnapshot
        })),
        total: order.total
      },
      order.id
    ) // Message key = order.id

    res.status(201).send(order)
  }
)

export { router as createOrderRouter }
