import { Consumer, PaymentCreatedEvent, Topics, EachMessagePayload } from '@datnxecommerce/common'
import { consumerGroupId } from './consumer-group-id'
import { Product } from '../../models/product'
import { ProductUpdatedProducer } from '../producers/product-updated-producer'
import { kafkaWrapper } from '../../kafka-wrapper'

/**
 * PaymentCreatedListener - Kafka version
 *
 * Consumer Group: 'products-service'
 * Topic: 'payment:created'
 *
 * Logic:
 * - Sau khi payment thành công, chỉ publish ProductUpdated event
 *   dựa trên quantity hiện tại (đã được reserve trong bước thanh toán).
 */
export class PaymentCreatedConsumer extends Consumer<PaymentCreatedEvent> {
  readonly topic = Topics.PaymentCreated
  readonly consumerGroupId = consumerGroupId

  constructor(consumer: any) {
    super(consumer, { fromBeginning: false })
  }

  async onMessage(data: PaymentCreatedEvent['data'], payload: EachMessagePayload): Promise<void> {
    console.log('Payment completed for order', {
      order_id: data.orderId,
      items_count: data.items.length
    })

    for (const item of data.items) {
      const productId = item.productId

      if (typeof productId !== 'string' || productId.length !== 24) {
        console.warn('Invalid productId in PaymentCreated event', {
          product_id: productId,
          order_id: data.orderId
        })
        continue
      }

      const product = await Product.findById(productId)
      if (!product) {
        console.warn('Product not found when publishing update', {
          product_id: productId,
          order_id: data.orderId
        })
        continue
      }

      await new ProductUpdatedProducer(kafkaWrapper.producer).publish(
        {
          id: product.id,
          title: product.title,
          price: product.price,
          userId: product.userId,
          quantity: product.quantity,
          version: product.version,
          ...(product.imageUrl ? { imageUrl: product.imageUrl } : {})
        },
        product.id
      )

      console.log(
        `[Products] Published product.updated for ${product.title} (qty: ${product.quantity})`
      )
    }
  }
}
