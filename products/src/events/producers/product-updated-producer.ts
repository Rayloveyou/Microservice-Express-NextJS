import { Producer, Topics, ProductUpdatedEvent } from '@datnxecommerce/common'

/**
 * ProductUpdatedPublisher - Kafka version
 * Publish event khi product được update
 *
 * Topic: 'product:updated'
 * Message key: product.id (để đảm bảo ordering)
 */
export class ProductUpdatedProducer extends Producer<ProductUpdatedEvent> {
  readonly topic = Topics.ProductUpdated
}
