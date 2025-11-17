import express, { Request, Response } from 'express'
import { requireAuth, NotFoundError } from '@datnxecommerce/common'
import { Cart } from '../models/cart'

const router = express.Router()

// Route: Remove product from cart
router.delete('/api/cart/:productId', requireAuth, async (req: Request, res: Response) => {
    const { productId } = req.params
    const userId = req.currentUser!.id

    const cart = await Cart.findOne({ userId })

    if (!cart) {
        throw new NotFoundError()
    }

    // Remove item from cart
    cart.items = cart.items.filter(item => item.productId !== productId)

    await cart.save()

    res.status(204).send(cart)
})

export { router as removeFromCartRouter }
