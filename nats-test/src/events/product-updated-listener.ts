import { Message } from 'node-nats-streaming'
import { Listener } from './base-listener'
import { ProductUpdatedEvent } from './product-updated-event'
import { Subjects } from './subjects'


// listener for product:updated
export class ProductUpdatedListener extends Listener<ProductUpdatedEvent> {
    readonly subject = Subjects.ProductUpdated
    queueGroupName = 'payments-service'

    onMessage(data: ProductUpdatedEvent['data'], msg: Message) {
        console.log('Event data:', data)
        msg.ack()
    }
}