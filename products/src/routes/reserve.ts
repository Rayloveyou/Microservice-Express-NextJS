import express, { Request, Response } from 'express'
import { Product } from '../models/product'

const router = express.Router()

interface ReserveItem {
  productId: string
  quantity: number
}

// Internal endpoint: reserve stock atomically for a list of items.
// Used by Payments service before charging Stripe.
router.post('/api/products/reserve', async (req: Request, res: Response) => {
  const items = (req.body.items || []) as ReserveItem[]

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).send({ errors: [{ message: 'Items array is required' }] })
  }

  const successfulUpdates: { productId: string; quantity: number }[] = []

  try {
    for (const item of items) {
      if (!item.productId || typeof item.quantity !== 'number' || item.quantity <= 0) {
        return res.status(400).send({ errors: [{ message: 'Invalid item payload' }] })
      }

      const result = await Product.updateOne(
        { _id: item.productId, quantity: { $gte: item.quantity } },
        { $inc: { quantity: -item.quantity } }
      )

      if (result.matchedCount === 0 || result.modifiedCount === 0) {
        // rollback previous reservations
        for (const success of successfulUpdates) {
          await Product.updateOne(
            { _id: success.productId },
            { $inc: { quantity: success.quantity } }
          )
        }

        return res.status(400).send({
          errors: [{ message: 'Not enough stock for one or more products' }]
        })
      }

      successfulUpdates.push({ productId: item.productId, quantity: item.quantity })
    }

    return res.status(204).send()
  } catch (err) {
    // best-effort rollback
    for (const success of successfulUpdates) {
      await Product.updateOne({ _id: success.productId }, { $inc: { quantity: success.quantity } })
    }

    console.error('Error reserving stock:', err)
    return res.status(500).send({ errors: [{ message: 'Error reserving stock' }] })
  }
})

export { router as reserveProductRouter }
