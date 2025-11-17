import { Listener, OrderCreatedEvent, Subjects } from "@datnxecommerce/common"
import { queueGroupName } from "./queue-group-name"
import { Message } from "node-nats-streaming"
import { Product } from "../../models/product"
import { ProductUpdatedPublisher } from "../publishers/product-updated-publisher"

export class OrderCreatedListener extends Listener<OrderCreatedEvent> {
    readonly subject = Subjects.OrderCreated
    queueGroupName = queueGroupName
    async onMessage(data: OrderCreatedEvent['data'], msg: Message) {
        // Order created - do nothing with product quantities
        // Product quantities will be reduced only when payment completes
        console.log('Order created:', data.id, '- awaiting payment')
        msg.ack()
    } 
}