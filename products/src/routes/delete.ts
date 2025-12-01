import express, { Request, Response } from 'express'
import {
  requireAuth,
  requireAdmin,
  NotFoundError,
  NotAuthorizedError
} from '@datnxecommerce/common'
import { Product } from '../models/product'
import mongoose from 'mongoose'

const router = express.Router()

router.delete('/api/products/:id', requireAuth, async (req: Request, res: Response) => {
  const id = req.params.id as string

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new NotFoundError()
  }

  const product = await Product.findById(id)

  if (!product) {
    throw new NotFoundError()
  }

  // Cho phép xóa nếu là owner hoặc admin
  if (product.userId !== req.currentUser!.id && req.currentUser!.role !== 'admin') {
    throw new NotAuthorizedError()
  }

  await product.deleteOne()

  res.status(204).send()
})

export { router as deleteProductRouter }
