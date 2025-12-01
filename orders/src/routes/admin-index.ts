import express, { Request, Response } from 'express'
import { requireAuth, requireAdmin } from '@datnxecommerce/common'
import { Order } from '../models/order'

const router = express.Router()

// Admin: list all orders in the system
router.get('/api/admin/orders', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const orders = await Order.find({}).populate('items.product')
  res.send(orders)
})

export { router as adminOrderIndexRouter }
