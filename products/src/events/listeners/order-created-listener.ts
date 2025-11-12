import { Listener, OrderCreatedEvent, Subjects } from "@datnxtickets/common"
import { queueGroupName } from "./queue-group-name"
import { Message } from "node-nats-streaming"
import { Product } from "../../models/product"
import { ProductUpdatedPublisher } from "../publishers/product-updated-publisher"

export class OrderCreatedListener extends Listener<OrderCreatedEvent> {
    readonly subject = Subjects.OrderCreated
    queueGroupName = queueGroupName
    async onMessage(data: OrderCreatedEvent['data'], msg: Message) {
        // Find the ticket that the order is reserving
        const product = await Product.findById(data.product.id)

        // If no ticket, throw error
        if (!product) {
            throw new Error('Product not found')
        }

        // Mark the ticket as being reserved by setting its orderId property
        product.set({
            orderId: data.id
        })

        // Save the ticket
        await product.save()

        // publish an event that a ticket was updated after being reserved
        new ProductUpdatedPublisher(this.client).publish({
            id: product.id,
            title: product.title,
            price: product.price,
            userId: product.userId,
            ...(product.orderId && { orderId: product.orderId }), // if product.orderId exists, add it to the object 
            version: product.version
        })

        // ack the message
        msg.ack()
    } 
}