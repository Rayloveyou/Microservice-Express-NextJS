import { Message } from 'node-nats-streaming'
import { Subjects, Listener, ProductCreatedEvent } from '@datnxecommerce/common'
import { Product } from '../../models/product'
import { queueGroupName } from './queue-group-name'

export class ProductCreatedListener extends Listener<ProductCreatedEvent> {
    subject: Subjects.ProductCreated = Subjects.ProductCreated
    queueGroupName = queueGroupName

    //data is the data structure of the event , message is the event (we just use it to ack)
    async onMessage(data: ProductCreatedEvent['data'], msg: Message) {
        const { id ,title, price, quantity, imageUrl } = data
        const product = Product.build({
            id,
            title,
            price,
            quantity,
            ...(imageUrl && { imageUrl }) // Optional field
        })
        await product.save()

        msg.ack()
    }
}