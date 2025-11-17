import express, { Request, Response } from 'express'
import { body } from 'express-validator'
import { requireAuth, validateRequest, NotFoundError } from '@datnxecommerce/common'
import { Product } from '../models/product'
import mongoose from 'mongoose'

const router = express.Router()


router.get('/api/products/:id', async (req: Request, res: Response) => {
    
    // Validate if id is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id!)) {
        throw new NotFoundError()
    }
    
    const product = await Product.findById(req.params.id)
    
    if (!product) {
        throw new NotFoundError()
    }
    
    res.send(product)
})
export { router as showProductRouter }