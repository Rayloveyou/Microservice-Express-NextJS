import express, { Request, Response } from 'express'
import { body } from 'express-validator'
import { requireAuth, validateRequest, NotFoundError } from '@datnxecommerce/common'
import { Cart } from '../models/cart'
import { Product } from '../models/product'

const router = express.Router()

// Route: Add or update product in cart
router.post(
  '/api/cart',
  requireAuth,
  [
    body('productId').not().isEmpty().withMessage('Product ID is required'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1')
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const { productId, quantity } = req.body
    const userId = req.currentUser!.id

    // Check if product exists
    const product = await Product.findById(productId)
    if (!product) {
      throw new NotFoundError()
    }

    // Find or create cart for user
    const existingCart = await Cart.findOne({ userId })

    let cart: any
    if (!existingCart) {
      cart = Cart.build({
        userId,
        items: []
      })
    } else {
      cart = existingCart
    }

    // Check if product already in cart
    const existingItem = cart.items.find((item: any) => item.productId === productId)

    if (existingItem) {
      // Update quantity
      existingItem.quantity = quantity
    } else {
      // Add new item
      cart.items.push({ productId, quantity })
    }

    await cart.save()

    res.status(201).send(cart)
  }
)

export { router as addToCartRouter }
