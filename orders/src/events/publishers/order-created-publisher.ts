import { Publisher,OrderCreatedEvent , Subjects } from "@datnxtickets/common"

export class OrderCreatedPublisher extends Publisher<OrderCreatedEvent> {
    subject: Subjects.OrderCreated = Subjects.OrderCreated
}

