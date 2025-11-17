import { Message } from 'node-nats-streaming'
import { Subjects, Listener, CartCheckoutEvent, OrderStatus } from '@datnxecommerce/common'
import { queueGroupName } from './queue-group-name'
import { Product } from '../../models/product'
import { Order } from '../../models/order'
import { OrderCreatedPublisher } from '../publishers/order-created-publisher'

export class CartCheckoutListener extends Listener<CartCheckoutEvent> {
    subject: Subjects.CartCheckout = Subjects.CartCheckout
    queueGroupName = queueGroupName

    async onMessage(data: CartCheckoutEvent['data'], msg: Message) {
        const { userId, items } = data

        // Fetch all products first
        const productIds = items.map(i => i.productId)
        const products = await Product.find({ _id: { $in: productIds } })
        const productMap: Record<string, any> = {}
        products.forEach(p => { productMap[p.id] = p })

        // Validate stock
        for (const item of items) {
            const product = productMap[item.productId]
            if (!product) {
                console.error(`Product ${item.productId} not found`)
                return msg.ack()
            }
            const hasEnoughStock = await product.hasStock(item.quantity)
            if (!hasEnoughStock) {
                console.error(`Not enough stock for product ${product.title}`)
                return msg.ack()
            }
        }

        const orderItems = items.map(item => {
            const product = productMap[item.productId]
            return {
                product,
                quantity: item.quantity,
                priceSnapshot: product.price,
                titleSnapshot: product.title
            }
        })
        const total = orderItems.reduce((sum, it) => sum + it.priceSnapshot * it.quantity, 0)

        const order = Order.build({
            userId,
            status: OrderStatus.Created,
            items: orderItems,
            total
        })
        await order.save()

        await new OrderCreatedPublisher(this.client).publish({
            id: order.id,
            version: order.version,
            status: order.status,
            userId: order.userId,
            items: order.items.map(i => ({
                productId: (i.product as any)._id ? (i.product as any)._id.toString() : i.product.toString(),
                price: i.priceSnapshot,
                quantity: i.quantity,
                title: i.titleSnapshot
            })),
            total: order.total
        })

        msg.ack()
    }
}
