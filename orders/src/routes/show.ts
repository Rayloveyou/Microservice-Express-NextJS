import express, { Request, Response } from 'express'
import { NotAuthorizedError, NotFoundError, requireAuth } from '@datnxecommerce/common'
import { Order } from '../models/order'
import mongoose from 'mongoose'

const router = express.Router()


router.get('/api/orders/:id', requireAuth, async (req: Request, res: Response) => {

    // Validate if id is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id!)) {
        throw new NotFoundError()
    }

    // Find the order and populate products inside items
    const order = await Order.findById(req.params.id).populate('items.product')

    if (!order) {
        throw new NotFoundError()
    }
    // Check if the user is the owner of the order
    if (order.userId !== req.currentUser!.id) {
        throw new NotAuthorizedError()
    }

    res.send(order)
})
export { router as showOrderRouter }