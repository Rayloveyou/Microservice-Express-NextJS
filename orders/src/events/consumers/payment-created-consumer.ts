import {
  Consumer,
  PaymentCreatedEvent,
  Topics,
  OrderStatus,
  EachMessagePayload
} from '@datnxecommerce/common'
import { consumerGroupId } from './consumer-group-id'
import { Order } from '../../models/order'

/**
 * PaymentCreatedListener - Kafka version
 *
 * Consumer Group: 'orders-service'
 * Topic: 'payment:created'
 *
 * Logic: Update order status to Complete khi payment thành công
 */
export class PaymentCreatedConsumer extends Consumer<PaymentCreatedEvent> {
  readonly topic = Topics.PaymentCreated
  consumerGroupId = consumerGroupId

  async onMessage(data: PaymentCreatedEvent['data'], payload: EachMessagePayload): Promise<void> {
    console.log('PaymentCreated event received for order:', data.orderId)

    const order = await Order.findById(data.orderId)

    if (!order) {
      throw new Error(`Order not found: ${data.orderId}`)
    }

    // Update order status to Complete
    order.set({
      status: OrderStatus.Complete
    })

    await order.save()

    console.log(`Order ${order.id} marked as Complete`)
    // Offset commit được handle tự động bởi Kafka
  }
}
