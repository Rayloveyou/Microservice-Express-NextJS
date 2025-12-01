import { Consumer, PaymentCreatedEvent, Topics, EachMessagePayload } from '@datnxecommerce/common'
import { Cart } from '../../models/cart'

/**
 * PaymentCreatedListener - Kafka version
 *
 * Consumer Group: 'cart-payment-created'
 * Topic: 'payment:created'
 *
 * Logic: Xóa purchased items khỏi cart sau khi payment thành công
 */
export class PaymentCreatedConsumer extends Consumer<PaymentCreatedEvent> {
  readonly topic = Topics.PaymentCreated
  consumerGroupId = 'cart-payment-created'

  async onMessage(data: PaymentCreatedEvent['data'], payload: EachMessagePayload): Promise<void> {
    console.log('PaymentCreated event received, clearing cart for order:', data.orderId)

    const { items } = data

    if (!items || items.length === 0) {
      return
    }

    // Lấy danh sách productIds đã mua
    const productIds = items.map(item => item.productId)

    // Tìm cart có items trong danh sách purchased products
    const cart = await Cart.findOne({
      items: {
        $elemMatch: { productId: { $in: productIds } }
      }
    })

    if (!cart) {
      console.log('No cart found with purchased items')
      return
    }

    // Xóa purchased items khỏi cart
    cart.items = cart.items.filter(
      ci => !items.some(orderItem => orderItem.productId === ci.productId.toString())
    )

    await cart.save()
    console.log(`Cleared purchased items from cart ${cart.id}`)
  }
}
