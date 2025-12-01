import { Producer, PaymentCreatedEvent, Topics } from '@datnxecommerce/common'

/**
 * PaymentCreatedProducer
 * Publish event khi payment thành công
 *
 * Topic: 'payment:created'
 * Message key: orderId (để đảm bảo events của cùng order vào cùng partition)
 */
export class PaymentCreatedProducer extends Producer<PaymentCreatedEvent> {
  readonly topic = Topics.PaymentCreated
}
