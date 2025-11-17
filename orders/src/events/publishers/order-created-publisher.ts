import { Publisher,OrderCreatedEvent , Subjects } from "@datnxecommerce/common"

export class OrderCreatedPublisher extends Publisher<OrderCreatedEvent> {
    subject: Subjects.OrderCreated = Subjects.OrderCreated
}

