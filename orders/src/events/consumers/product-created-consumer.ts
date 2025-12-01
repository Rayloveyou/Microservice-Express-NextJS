import { Consumer, ProductCreatedEvent, Topics, EachMessagePayload } from '@datnxecommerce/common'
import { Product } from '../../models/product'

/**
 * ProductCreatedConsumer - Kafka version
 *
 * Consumer Group: 'orders-product-created'
 * Topic: 'product.created'
 *
 * Sync product data from Products service into Orders DB
 * so that Orders can validate stock and build order snapshots.
 */
export class ProductCreatedConsumer extends Consumer<ProductCreatedEvent> {
  readonly topic = Topics.ProductCreated
  consumerGroupId = 'orders-product-created'

  async onMessage(data: ProductCreatedEvent['data'], payload: EachMessagePayload): Promise<void> {
    const { id, title, price, quantity, imageUrl } = data

    const existing = await Product.findById(id)
    if (existing) {
      return
    }

    const product = Product.build({
      id,
      title,
      price,
      quantity,
      ...(imageUrl ? { imageUrl } : {})
    })

    await product.save()
    console.log(`[Orders] Synced new product ${product.id} - ${product.title}`)
  }
}
