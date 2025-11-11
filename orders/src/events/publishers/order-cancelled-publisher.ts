import { Publisher, OrderCancelledEvent, Subjects } from "@datnxtickets/common"

export class OrderCancelledPublisher extends Publisher<OrderCancelledEvent> {
    subject: Subjects.OrderCancelled = Subjects.OrderCancelled
}

