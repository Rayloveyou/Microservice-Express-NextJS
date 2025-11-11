import { Message } from 'node-nats-streaming'
import { Listener } from './base-listener'
import { ProductCreatedEvent } from './product-created-event'
import { Subjects } from './subjects'

// listener for product:created
// custom type ProductCreatedEvent to define the structure of the event
export class ProductCreatedListener extends Listener<ProductCreatedEvent> {

    // readonly: prevents a property of a class from being changed
    readonly subject = Subjects.ProductCreated
    queueGroupName = 'payments-service'

    // ProductCreatedEvent['data']: define the data structure of the event
    onMessage(data: ProductCreatedEvent['data'], msg: Message) {
        console.log('Event data:', data)

        msg.ack()
    }
}
