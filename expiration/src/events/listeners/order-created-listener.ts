import { Listener, Subjects, OrderCreatedEvent } from "@datnxtickets/common"
import { Message } from "node-nats-streaming"
import { queueGroupName } from "./queue-group-name"
import { expirationQueue } from "../../queues/expiration-queue"

export class OrderCreatedListener extends Listener<OrderCreatedEvent> {
    readonly subject = Subjects.OrderCreated
    queueGroupName = queueGroupName

    async onMessage(data: OrderCreatedEvent['data'], msg: Message) {
        // Delay time = expiration time - current time (15 mins)s
        const delay = new Date(data.expiresAt).getTime() - new Date().getTime()
        await expirationQueue.add(
        {
            orderId: data.id
        }
        , {
            delay: delay // delay to send the expiration job
        }
        )

        // Marked the message as processed
        msg.ack()
    }
}