import { Message } from 'node-nats-streaming'
import { Subjects, Listener, ProductUpdatedEvent } from '@datnxecommerce/common'
import { Product } from '../../models/product'
import { queueGroupName } from './queue-group-name'
import { version } from 'mongoose'

export class ProductUpdatedListener extends Listener<ProductUpdatedEvent> {
    readonly subject = Subjects.ProductUpdated
    queueGroupName = queueGroupName

    async onMessage(data: ProductUpdatedEvent['data'], msg: Message) {
        
        // Find the product the user is trying to order in the database
        const product = await Product.findByEvent(data)

        if (!product) {
            throw new Error('Product not found')
        }
        
        const {title, price, quantity, imageUrl } = data
        product.set({
            title,
            price,
            quantity,
            ...(imageUrl && { imageUrl })
        })
        await product.save()

        msg.ack()
    }
}