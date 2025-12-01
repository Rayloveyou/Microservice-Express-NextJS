import express, { Request, Response } from 'express'
import { requireAuth } from '@datnxecommerce/common'
import { Cart } from '../models/cart'
import { Product } from '../models/product'

const router = express.Router()

// Route: View cart with product details and stock status
router.get('/api/cart', requireAuth, async (req: Request, res: Response) => {
  const userId = req.currentUser!.id

  const cart = await Cart.findOne({ userId })

  if (!cart || cart.items.length === 0) {
    return res.send({ items: [] })
  }

  // Get product details for all items in cart
  const productIds = cart.items.map(item => item.productId)
  const products = await Product.find({ _id: { $in: productIds } })

  // Map cart items with product details and stock status
  const cartItemsWithDetails = cart.items.map(item => {
    const product = products.find(p => p.id === item.productId)

    if (!product) {
      return {
        productId: item.productId,
        quantity: item.quantity,
        outOfStock: true,
        productNotFound: true
      }
    }

    return {
      productId: item.productId,
      quantity: item.quantity,
      product: {
        id: product.id,
        title: product.title,
        price: product.price,
        availableQuantity: product.quantity
      },
      outOfStock: product.quantity === 0,
      insufficientStock: product.quantity < item.quantity
    }
  })

  res.send({
    id: cart.id,
    userId: cart.userId,
    items: cartItemsWithDetails,
    version: cart.version
  })
})

export { router as viewCartRouter }
