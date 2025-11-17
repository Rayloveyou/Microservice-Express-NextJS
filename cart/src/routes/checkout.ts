import express, { Request, Response } from 'express'
import { requireAuth, BadRequestError, NotFoundError } from '@datnxecommerce/common'
import { Cart } from '../models/cart'
import { Product } from '../models/product'
import { CartCheckoutPublisher } from '../events/publishers/cart-checkout-publisher'
import { natsWrapper } from '../nats-wrapper'

const router = express.Router()

// Route: Checkout cart - validate stock and create order
router.post('/api/cart/checkout', requireAuth, async (req: Request, res: Response) => {
    const userId = req.currentUser!.id

    const cart = await Cart.findOne({ userId })

    if (!cart || cart.items.length === 0) {
        throw new BadRequestError('Cart is empty')
    }

    // Get all products in cart
    const productIds = cart.items.map((item: any) => item.productId)
    const products = await Product.find({ _id: { $in: productIds } })

    // Validate stock for each product in cart
    const outOfStockProducts: string[] = []

    for (const item of cart.items) {
        const product = products.find((p: any) => p.id === item.productId)
        
        if (!product) {
            outOfStockProducts.push(`Product ${item.productId} not found`)
            continue
        }

        // Check if product has enough stock
        if (product.quantity < item.quantity) {
            outOfStockProducts.push(`${product.title} đã hết hàng, hãy đặt lại`)
        }
    }

    // If any product is out of stock, return error
    if (outOfStockProducts.length > 0) {
        throw new BadRequestError(outOfStockProducts.join(', '))
    }

    // Publish asynchronous event (kept for other consumers)
    await new CartCheckoutPublisher(natsWrapper.client).publish({
        userId: cart.userId,
        items: cart.items.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity
        }))
    })

    // Synchronously create individual orders by calling order service for each item
    // Assumes order service POST /api/orders accepts { productId, quantity }
    const cookieHeader = req.headers.cookie || ''
    const createdOrders: any[] = []
    for (const item of cart.items) {
        try {
            const response = await fetch('http://order-svc:3000/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': cookieHeader
                },
                body: JSON.stringify({ productId: item.productId, quantity: item.quantity })
            })
            if (!response.ok) {
                // If one order fails, abort and return error (could refine partial success strategy)
                const text = await response.text()
                throw new BadRequestError(`Failed to create order for product ${item.productId}: ${text}`)
            }
            const orderJson = await response.json()
            createdOrders.push(orderJson)
        } catch (err) {
            throw err
        }
    }

    // Clear cart after successful synchronous creation
    cart.items = []
    await cart.save()

    res.status(201).send({
        message: 'Checkout successful',
        orders: createdOrders
    })
})

export { router as checkoutCartRouter }
