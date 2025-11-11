import express, { Request, Response } from 'express'
import { body } from 'express-validator'
import { requireAuth, validateRequest } from '@datnxtickets/common'
import { Product } from '../models/product'
import { ProductCreatedPublisher} from '../events/publishers/product-created-publisher'
import { natsWrapper } from '../nats-wrapper'

const router = express.Router()

// Route tạo product
router.post('/api/products', requireAuth, [
    body('title').not().isEmpty().withMessage('Title is required'),
    body('price').isFloat({ gt: 0 }).withMessage('Price must be a positive number')
], validateRequest, async (req: Request, res: Response) => {
    const { title, price } = req.body

    const product = Product.build({ 
        title,
        price,
        userId: req.currentUser!.id
    })
    await product.save()

    // Publish an event to NATS
    await new ProductCreatedPublisher(natsWrapper.client).publish({
        id: product.id,
        title: product.title,
        price: product.price,
        userId: product.userId,
        version: product.version // version key from Mongoose (+1)
    })

    res.status(201).send(product)
})
    
export { router as createProductRouter }