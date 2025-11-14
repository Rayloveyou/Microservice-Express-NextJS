import { OrderCancelledEvent, Subjects, Listener, OrderStatus } from "@datnxtickets/common"
import { queueGroupName } from "./queue-group-name"
import { Order } from "../../models/order"
export class OrderCancelledListener extends Listener<OrderCancelledEvent> {
    subject: Subjects.OrderCancelled = Subjects.OrderCancelled
    queueGroupName = queueGroupName

    async onMessage(data: OrderCancelledEvent['data'], msg: any) {
        const order = await Order.findOne({
            _id: data.id,
            version: data.version - 1 // version - 1 because we are updating the order , upcoming version always > current version in db
        })

        if (!order) {
            throw new Error('Order not found')
        }

        // update the status of the order to be cancelled
        order.set({
            status: OrderStatus.Cancelled
        })

        await order.save()

        msg.ack()
    }
}