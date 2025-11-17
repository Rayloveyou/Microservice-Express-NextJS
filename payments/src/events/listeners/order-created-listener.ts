import { Subjects, OrderCreatedEvent, Listener } from "@datnxecommerce/common"
import { queueGroupName } from "./queue-group-name"
import { Message } from "node-nats-streaming"
import { Order } from "../../models/order"
export class OrderCreatedListener extends Listener<OrderCreatedEvent> {
    readonly subject = Subjects.OrderCreated
    queueGroupName = queueGroupName

    async onMessage(data: OrderCreatedEvent['data'], msg: Message) {
        const order = Order.build({
            id: data.id,
            status: data.status,
            userId: data.userId,
            version: data.version,
            total: data.total,
            items: data.items.map(it => ({
                productId: it.productId,
                title: it.title,
                price: it.price,
                quantity: it.quantity
            }))
        })
        await order.save()
        msg.ack()
    }
}
