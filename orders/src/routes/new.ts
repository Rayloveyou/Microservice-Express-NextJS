import express, { Request, Response } from 'express'
import { body } from 'express-validator'
import { NotFoundError, requireAuth, validateRequest, OrderStatus, BadRequestError } from '@datnxtickets/common'
import { Product } from '../models/product'
import { Order } from '../models/order'
import { natsWrapper } from '../nats-wrapper'
import { OrderCreatedPublisher } from '../events/publishers/order-created-publisher'
import mongoose from 'mongoose'

const router = express.Router()

const EXPIRATION_WINDOW_SECONDS = 15 * 60 // 15 minutes

// Route tạo order
router.post('/api/orders', requireAuth, [
    body('productId')
    .not()
    .isEmpty()
    .custom((input: string) => mongoose.Types.ObjectId.isValid(input))
    .withMessage('Product ID is required'),
] , validateRequest, async (req: Request, res: Response) => {

    // Find the product the user is trying to order in the database
    const { productId } = req.body

    const product = await Product.findById(productId)

    if (!product) {
        throw new NotFoundError()
    }

    // Make sure that this product is not already reserved
    const isReserved = await product.isReserved()
    
    if (isReserved) {
        throw new BadRequestError('Product is already reserved')
    }

    // Calculate an expiration date for this order
    const expiration = new Date()
    expiration.setSeconds(expiration.getSeconds() + EXPIRATION_WINDOW_SECONDS) 

    // Build the order and save it to the database
    const order = Order.build({
        userId: req.currentUser!.id,
        status: OrderStatus.Created,
        expiresAt: expiration,
        product
    })
    await order.save()

    // Publish an event saying that an order was created
    await new OrderCreatedPublisher(natsWrapper.client).publish({
        id: order.id,
        version: order.version,
        status: order.status,
        userId: order.userId,
        expiresAt: order.expiresAt.toISOString(),
        product: {
            id: product.id,
            price: product.price
        }
    })

    res.status(201).send(order)
})
    
export { router as createOrderRouter }