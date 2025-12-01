import { Consumer, PaymentCreatedEvent, Topics, EachMessagePayload } from '@datnxecommerce/common'
import { WebsocketManager } from '../../websocket-manager'

export class PaymentCreatedConsumer extends Consumer<PaymentCreatedEvent> {
  readonly topic = Topics.PaymentCreated
  consumerGroupId = 'notifications-payment-created'

  constructor(
    consumer: any,
    private wsManager: WebsocketManager
  ) {
    super(consumer)
  }

  async onMessage(data: PaymentCreatedEvent['data'], payload: EachMessagePayload): Promise<void> {
    console.log('[Notifications] payment.created event received for order:', data.orderId)

    this.wsManager.sendToUser(data.userId, {
      type: 'payment.created',
      data: {
        id: data.id,
        orderId: data.orderId,
        userId: data.userId
      }
    })
  }
}
