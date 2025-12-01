import { Consumer, OrderCreatedEvent, Topics, EachMessagePayload } from '@datnxecommerce/common'
import { WebsocketManager } from '../../websocket-manager'

export class OrderCreatedConsumer extends Consumer<OrderCreatedEvent> {
  readonly topic = Topics.OrderCreated
  consumerGroupId = 'notifications-order-created'

  constructor(
    consumer: any,
    private wsManager: WebsocketManager
  ) {
    super(consumer)
  }

  async onMessage(data: OrderCreatedEvent['data'], payload: EachMessagePayload): Promise<void> {
    console.log(
      '[Notifications] order.created event received for user:',
      data.userId,
      'order:',
      data.id
    )
    // Hiện tại không gửi notification cho order.created,
    // chỉ giữ log để debug nếu cần.
  }
}
