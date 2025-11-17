import { Listener, PaymentCreatedEvent, Subjects } from "@datnxecommerce/common"
import { queueGroupName } from "./queue-group-name"
import { Message } from "node-nats-streaming"
import { Product } from "../../models/product"
import { ProductUpdatedPublisher } from "../publishers/product-updated-publisher"

export class PaymentCreatedListener extends Listener<PaymentCreatedEvent> {
    readonly subject = Subjects.PaymentCreated
    queueGroupName = queueGroupName
    
    async onMessage(data: PaymentCreatedEvent['data'], msg: Message) {
        console.log('Payment completed for order:', data.orderId)
        
        // Now reduce product quantities since payment succeeded
        for (const item of data.items) {
            const productId = item.productId
            if (typeof productId !== 'string' || productId.length !== 24) {
                console.error('Invalid productId in PaymentCreated event:', productId)
                continue
            }
            
            const product = await Product.findById(productId)
            if (!product) {
                console.error('Product not found:', productId)
                continue
            }

            // Reduce the product quantity by the order item quantity
            const newQuantity = product.quantity - item.quantity
            if (newQuantity < 0) {
                console.error('Insufficient stock for product:', productId, 'Available:', product.quantity, 'Required:', item.quantity)
                // Still process but set to 0
                product.set({ quantity: 0 })
            } else {
                product.set({ quantity: newQuantity })
            }
            
            await product.save()

            // Publish product updated event
            await new ProductUpdatedPublisher(this.client).publish({
                id: product.id,
                title: product.title,
                price: product.price,
                userId: product.userId,
                quantity: product.quantity,
                version: product.version
            })
            
            console.log('Reduced product quantity:', product.title, 'New quantity:', product.quantity)
        }

        msg.ack()
    } 
}
