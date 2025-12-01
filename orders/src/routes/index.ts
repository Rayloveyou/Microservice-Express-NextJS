import express, { Request, Response } from 'express'
import { Order } from '../models/order'
import { requireAuth, OrderStatus } from '@datnxecommerce/common'

const router = express.Router()

router.get('/api/orders', requireAuth, async (req: Request, res: Response) => {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@gmail.com'
  const isAdmin = req.currentUser!.role === 'admin' || req.currentUser!.email === adminEmail

  const query = isAdmin
    ? {} // admin: xem toàn bộ orders
    : {
        userId: req.currentUser!.id,
        status: OrderStatus.Complete
      }

  const orders = await Order.find(query).populate('items.product')
  res.send(orders)
})

export { router as indexOrderRouter }
