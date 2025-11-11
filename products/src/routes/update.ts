import express, { Request, Response } from 'express'
import { body } from 'express-validator'
import { requireAuth, validateRequest, NotFoundError, NotAuthorizedError } from '@datnxtickets/common'
import { Product } from '../models/product'
import mongoose from 'mongoose'
import { ProductUpdatedPublisher } from '../events/publishers/product-updated-publisher'
import { natsWrapper } from '../nats-wrapper'

const router = express.Router()

router.put('/api/products/:id', requireAuth, [
    body('title').not().isEmpty().withMessage('Title is required'),
    body('price').isFloat({ gt: 0 }).withMessage('Price must be a positive number')
], validateRequest, async (req: Request, res: Response) => {

    // Validate if id is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id!)) {
        throw new NotFoundError()
    }
    // Find product by id
    const product = await Product.findById(req.params.id)

    if (!product) {
        throw new NotFoundError()
    }

    // Check if the user is the owner of the product
    if (product.userId !== req.currentUser!.id) {
        throw new NotAuthorizedError()
    }

    // Update product
    product.set({
        title: req.body.title,
        price: req.body.price
    })

    // Save product
    await product.save()

    // Publish an event to NATS - not use await here
    new ProductUpdatedPublisher(natsWrapper.client).publish({
        id: product.id,
        title: product.title,
        price: product.price,
        userId: product.userId,
        version: product.version // version key from Mongoose (+1)
    })

    // Send response 
    res.send(product)
})

export { router as updateProductRouter }