import { Consumer, OrderCancelledEvent, Topics, EachMessagePayload } from '@datnxecommerce/common'
import { Order } from '../../models/order'

/**
 * OrderCancelledConsumer
 *
 * Consumer Group: 'payments-service'
 * Topic: 'order:cancelled'
 *
 * Logic: Update local order status thành Cancelled
 */
export class OrderCancelledConsumer extends Consumer<OrderCancelledEvent> {
  readonly topic = Topics.OrderCancelled
  consumerGroupId = 'payments-order-cancelled'

  async onMessage(data: OrderCancelledEvent['data'], payload: EachMessagePayload): Promise<void> {
    console.log('OrderCancelled event received:', data.id)

    const order = await Order.findById(data.id)
    if (!order) {
      console.error(`Order ${data.id} not found in payments service`)
      return
    }

    order.set({ status: 'Cancelled' })
    await order.save()

    console.log(`Order ${data.id} marked as Cancelled in payments service`)
  }
}
