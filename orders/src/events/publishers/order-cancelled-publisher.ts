import { Publisher, OrderCancelledEvent, Subjects } from "@datnxecommerce/common"

export class OrderCancelledPublisher extends Publisher<OrderCancelledEvent> {
    subject: Subjects.OrderCancelled = Subjects.OrderCancelled
}

