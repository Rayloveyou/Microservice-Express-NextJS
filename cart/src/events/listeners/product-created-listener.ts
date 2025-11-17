import { Message } from 'node-nats-streaming'
import { Subjects, Listener, ProductCreatedEvent } from '@datnxecommerce/common'
import { Product } from '../../models/product'
import  { queueGroupName }  from './queue-group-name'

export class ProductCreatedListener extends Listener<ProductCreatedEvent> {
    subject: Subjects.ProductCreated = Subjects.ProductCreated
    queueGroupName = queueGroupName

    async onMessage(data: ProductCreatedEvent['data'], msg: Message) {
        const { id, title, price, quantity, imageUrl } = data
        const product = Product.build({
            id,
            title,
            price,
            quantity,
            ...(imageUrl && { imageUrl })
        })
        await product.save()

        msg.ack()
    }
}
