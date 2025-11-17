import { Subjects, Publisher ,PaymentCreatedEvent } from "@datnxecommerce/common"

export class PaymentCreatedPublisher extends Publisher<PaymentCreatedEvent> {
    subject: Subjects.PaymentCreated = Subjects.PaymentCreated
}