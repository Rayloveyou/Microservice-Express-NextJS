import { Listener, OrderCancelledEvent, Subjects } from "@datnxtickets/common"
import { queueGroupName } from "./queue-group-name"
import { Message } from "node-nats-streaming"
import { Product } from "../../models/product"
import { ProductUpdatedPublisher } from "../publishers/product-updated-publisher"

export class OrderCancelledListener extends Listener<OrderCancelledEvent> {
    subject: Subjects.OrderCancelled = Subjects.OrderCancelled
    queueGroupName = queueGroupName

    async onMessage(data: OrderCancelledEvent['data'], msg: Message) {

        const productId = data.product.id
        if (typeof productId !== 'string' || productId.length !== 24) {
            console.error('Invalid productId in OrderCancelled event:', productId)
            return msg.ack() // ack to skip bad event
        }

        const product = await Product.findById(productId)

        if (!product) {
            throw new Error('Product not found')
        }

        // set the orderId of the product to be undefined (delete field orderId)
        product.set({
            orderId: undefined
        })

        await product.save()

        // publish an event that a ticket was updated
        await new ProductUpdatedPublisher(this.client).publish({
            id: product.id,
            title: product.title,
            price: product.price,
            userId: product.userId,
            ...(product.orderId && { orderId: product.orderId }), // if product.orderId exists, add it to the object 
            version: product.version
        })

        msg.ack()
    }
}