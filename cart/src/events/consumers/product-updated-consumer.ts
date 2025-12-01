import { Consumer, ProductUpdatedEvent, Topics, EachMessagePayload } from '@datnxecommerce/common'
import { Product } from '../../models/product'

/**
 * ProductUpdatedConsumer - Kafka version
 *
 * Consumer Group: 'cart-product-updated'
 * Topic: 'product.updated'
 *
 * Keep local product data in cart service in sync with products service.
 * Dùng findById để tránh lỗi version khi chỉ cập nhật quantity.
 */
export class ProductUpdatedConsumer extends Consumer<ProductUpdatedEvent> {
  readonly topic = Topics.ProductUpdated
  consumerGroupId = 'cart-product-updated'

  async onMessage(data: ProductUpdatedEvent['data'], payload: EachMessagePayload): Promise<void> {
    const { id, title, price, quantity, imageUrl } = data

    const product = await Product.findById(id)

    if (!product) {
      console.error(`[Cart] Product not found for update: ${id}`)
      return
    }

    product.set({
      title,
      price,
      quantity,
      ...(imageUrl ? { imageUrl } : {})
    })

    await product.save()
    console.log(`[Cart] Updated product ${product.id} - ${product.title}`)
  }
}
