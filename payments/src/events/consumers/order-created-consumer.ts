import { Consumer, OrderCreatedEvent, Topics, EachMessagePayload } from '@datnxecommerce/common'
import { Order } from '../../models/order'

/**
 * OrderCreatedConsumer
 *
 * Consumer Group: 'payments-service'
 * Topic: 'order:created'
 *
 * Logic: Replicate order data vào local DB để validate khi payment
 */
export class OrderCreatedConsumer extends Consumer<OrderCreatedEvent> {
  readonly topic = Topics.OrderCreated
  consumerGroupId = 'payments-order-created'

  async onMessage(data: OrderCreatedEvent['data'], payload: EachMessagePayload): Promise<void> {
    console.log('OrderCreated event received:', data.id)

    // Replicate order vào local DB để validate khi payment
    const order = Order.build({
      id: data.id,
      status: data.status,
      userId: data.userId,
      version: data.version,
      total: data.total,
      items: data.items.map(it => ({
        productId: it.productId,
        title: it.title,
        price: it.price,
        quantity: it.quantity
      }))
    })
    await order.save()

    console.log(`Order ${data.id} replicated to payments service`)
  }
}
