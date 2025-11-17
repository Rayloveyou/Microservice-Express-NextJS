import { Listener, OrderCancelledEvent, Subjects } from "@datnxecommerce/common"
import { queueGroupName } from "./queue-group-name"
import { Message } from "node-nats-streaming"
import { Product } from "../../models/product"
import { ProductUpdatedPublisher } from "../publishers/product-updated-publisher"

export class OrderCancelledListener extends Listener<OrderCancelledEvent> {
    subject: Subjects.OrderCancelled = Subjects.OrderCancelled
    queueGroupName = queueGroupName

    async onMessage(data: OrderCancelledEvent['data'], msg: Message) {
        // Process all items in the cancelled order
        for (const item of data.items) {
            const productId = item.productId
            if (typeof productId !== 'string' || productId.length !== 24) {
                console.error('Invalid productId in OrderCancelled event:', productId)
                continue
            }

            const product = await Product.findById(productId)
            if (!product) {
                console.error('Product not found:', productId)
                continue
            }

            // Restore the product quantity by adding back the cancelled order item quantity
            product.set({
                quantity: product.quantity + item.quantity
            })
            await product.save()

            // Publish product updated event
            await new ProductUpdatedPublisher(this.client).publish({
                id: product.id,
                title: product.title,
                price: product.price,
                userId: product.userId,
                quantity: product.quantity,
                version: product.version
            })
        }

        msg.ack()
    }
}