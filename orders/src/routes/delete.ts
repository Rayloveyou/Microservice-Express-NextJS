import express, { Request, Response } from 'express'
import { body } from 'express-validator'
import { requireAuth, NotFoundError } from '@datnxtickets/common'
import { natsWrapper } from '../nats-wrapper'
import mongoose from 'mongoose'
import { Order, OrderStatus } from '../models/order'
import { OrderCancelledPublisher } from '../events/publishers/order-cancelled-publisher'
const router = express.Router()

// Route tạo product
router.delete('/api/orders/:id', requireAuth, async (req: Request, res: Response) => {
    
    const { id } = req.params

    // Validate if id is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id!)) {
        throw new NotFoundError()
    }

    // Find the order and associated product with it
    const order = await Order.findById(req.params.id).populate('product')

    if (!order) {
        throw new NotFoundError()
    }
    // Check if the user is the owner of the order
    if (order.userId !== req.currentUser!.id) {
        throw new NotFoundError()
    }

    order.status = OrderStatus.Cancelled
    await order.save()

    // Publish an event to NATS
    new OrderCancelledPublisher(natsWrapper.client).publish({
        id: order.id,
        product: {
            id: order.product.id,
        }
    })
    res.status(204).send(order)
})
    
export { router as deleteOrderRouter }