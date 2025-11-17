import express, { Request, Response } from 'express'
import { body } from 'express-validator'
import { requireAuth, validateRequest, BadRequestError, NotFoundError, NotAuthorizedError } from '@datnxecommerce/common'
import { Order } from '../models/order'
import { OrderStatus } from '@datnxecommerce/common'
import { stripe } from '../stripe'
import { Payment } from '../models/payment'
import { Publisher } from '@datnxecommerce/common'
import { PaymentCreatedPublisher } from '../events/publishers/payment-created-publisher'
import { natsWrapper } from '../nats-wrapper'

const router = express.Router()

router.post('/api/payments',
    requireAuth,
    [
        body('token')
            .not()
            .isEmpty(),
        body('orderId')
            .not()
            .isEmpty(),
    ],
    validateRequest,
    async (req: Request, res: Response) => {
        const { token, orderId } = req.body
        // Make sure that the order exists
        const order = await Order.findById(orderId)

        if (!order) {
            throw new NotFoundError()
        }
        // Make sure that the order belongs to the user
        if (order.userId! != req.currentUser!.id) {
            throw new NotAuthorizedError()
        }

        // Make sure that the order is not cancelled
        if (order.status === OrderStatus.Cancelled) {
            throw new BadRequestError('Cannot pay for a cancelled order')
        }

        // Create a charge with Stripe 
        const charge = await stripe.charges.create({
            currency: 'usd',
            amount: Math.round(order.total * 100),
            source: token,
            description: `Order ${order.id}`
        })

        const payment = Payment.build({
            orderId,
            stripeId: charge.id
        })
        await payment.save()

        // publish an event that a payment was created
        await new PaymentCreatedPublisher(natsWrapper.client).publish({
            id: payment.id,
            orderId: payment.orderId,
            stripeId: payment.stripeId,
            items: order.items.map(item => ({
                productId: item.productId,
                price: item.price || 0,
                quantity: item.quantity,
                title: item.title || ''
            }))
        })

        res.status(201).send({ id: charge.id })
    }
)

export { router as createChargeRouter }