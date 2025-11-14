import { Subjects, OrderCreatedEvent, Listener } from "@datnxtickets/common"
import { queueGroupName } from "./queue-group-name"
import { Message } from "node-nats-streaming"
import { Order } from "../../models/order"
export class OrderCreatedListener extends Listener<OrderCreatedEvent> {
    readonly subject = Subjects.OrderCreated
    queueGroupName = queueGroupName

    async onMessage(data: OrderCreatedEvent['data'], msg: Message) {
        const order = Order.build({
            id: data.id,
            price: data.product.price,
            status: data.status,
            userId: data.userId,
            version: data.version
        })
        
        await order.save()
        
        msg.ack() // Marked the message as processed
        // console.log('event data', data)
        // console.log('event data', msg.ack)
        }
 }
