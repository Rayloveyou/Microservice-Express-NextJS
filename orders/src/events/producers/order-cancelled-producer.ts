import { Producer, OrderCancelledEvent, Topics } from '@datnxecommerce/common'

/**
 * OrderCancelledPublisher - Kafka version
 * Publish event khi order bị cancel
 *
 * Topic: 'order:cancelled'
 * Message key: order.id
 */
export class OrderCancelledProducer extends Producer<OrderCancelledEvent> {
  readonly topic = Topics.OrderCancelled
}
