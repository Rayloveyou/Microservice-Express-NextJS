import { Listener, Subjects, ExpirationCompleteEvent, OrderStatus } from "@datnxtickets/common"
import { queueGroupName } from "./queue-group-name"
import { Message } from "node-nats-streaming"
import { Order } from "../../models/order"
import { OrderCancelledPublisher } from "../publishers/order-cancelled-publisher"

export class ExpirationCompleteListener extends Listener<ExpirationCompleteEvent> {
    readonly subject = Subjects.ExpirationComplete
    queueGroupName = queueGroupName

    async onMessage(data: ExpirationCompleteEvent['data'], msg: Message) {
        const order = await Order.findById(data.orderId)

        if (!order) {
            throw new Error('Order not found')
        }

        // update the status of the order to be cancelled
        order.set({
            status: OrderStatus.Cancelled,
        })

        await order.save()
        
        // publish an event that the order was cancelled
        await new OrderCancelledPublisher(this.client).publish({
            id: order.id,
            version: order.version,
            product: {
                id: order.product.id
            }
        })

        msg.ack()
    }
}