import { Producer, Topics, ProductCreatedEvent } from '@datnxecommerce/common'

/**
 * ProductCreatedPublisher - Kafka version
 * Publish event khi product mới được tạo
 *
 * Topic: 'product:created'
 * Message key: product.id (để đảm bảo events của cùng 1 product vào cùng partition)
 */
export class ProductCreatedProducer extends Producer<ProductCreatedEvent> {
  readonly topic = Topics.ProductCreated
}
