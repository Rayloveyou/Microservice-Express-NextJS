import { Subjects, Publisher ,PaymentCreatedEvent } from "@datnxtickets/common"

export class PaymentCreatedPublisher extends Publisher<PaymentCreatedEvent> {
    subject: Subjects.PaymentCreated = Subjects.PaymentCreated
}