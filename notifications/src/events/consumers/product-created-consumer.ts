import { Consumer, ProductCreatedEvent, Topics, EachMessagePayload } from '@datnxecommerce/common'
import { WebsocketManager } from '../../websocket-manager'

export class ProductCreatedConsumer extends Consumer<ProductCreatedEvent> {
  readonly topic = Topics.ProductCreated
  consumerGroupId = 'notifications-product-created'

  constructor(
    consumer: any,
    private wsManager: WebsocketManager
  ) {
    super(consumer)
  }

  async onMessage(data: ProductCreatedEvent['data'], payload: EachMessagePayload): Promise<void> {
    console.log('[Notifications] product.created event received:', data.id, '-', data.title)
    this.wsManager.broadcast({
      type: 'product.created',
      data: {
        id: data.id,
        title: data.title
      }
    })
  }
}
