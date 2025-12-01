import { Producer, OrderCreatedEvent, Topics } from '@datnxecommerce/common'

/**
 * OrderCreatedPublisher - Kafka version
 * Publish event khi order mới được tạo
 *
 * Topic: 'order:created'
 * Message key: order.id (để đảm bảo events của cùng order vào cùng partition)
 */
export class OrderCreatedProducer extends Producer<OrderCreatedEvent> {
  readonly topic = Topics.OrderCreated
}
