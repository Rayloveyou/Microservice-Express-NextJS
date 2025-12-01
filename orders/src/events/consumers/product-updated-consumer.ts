import { Consumer, ProductUpdatedEvent, Topics, EachMessagePayload } from '@datnxecommerce/common'
import { Product } from '../../models/product'

/**
 * ProductUpdatedConsumer - Kafka version
 *
 * Consumer Group: 'orders-product-updated'
 * Topic: 'product.updated'
 *
 * Keep Orders service's product snapshot in sync
 * with Products service for accurate stock and pricing.
 *
 * Để đơn giản và tránh lỗi version khi chỉ cập nhật quantity,
 * dùng findById thay vì optimistic concurrency findByEvent.
 */
export class ProductUpdatedConsumer extends Consumer<ProductUpdatedEvent> {
  readonly topic = Topics.ProductUpdated
  consumerGroupId = 'orders-product-updated'

  async onMessage(data: ProductUpdatedEvent['data'], payload: EachMessagePayload): Promise<void> {
    const { id, title, price, quantity, imageUrl } = data

    const product = await Product.findById(id)

    if (!product) {
      console.error(`[Orders] Product not found for update: ${id}`)
      return
    }

    product.set({
      title,
      price,
      quantity,
      ...(imageUrl ? { imageUrl } : {})
    })

    await product.save()
    console.log(`[Orders] Updated product ${product.id} - ${product.title}`)
  }
}
