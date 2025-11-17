import { Listener, Subjects, PaymentCreatedEvent } from '@datnxecommerce/common'
import { Message } from 'node-nats-streaming'
import { queueGroupName } from './queue-group-name'
import { Cart } from '../../models/cart'

export class PaymentCreatedListener extends Listener<PaymentCreatedEvent> {
  readonly subject: Subjects.PaymentCreated = Subjects.PaymentCreated
  queueGroupName = queueGroupName

  async onMessage(data: PaymentCreatedEvent['data'], msg: Message) {
    const { items } = data
    
    // Find cart by checking if any items match
    if (!items || items.length === 0) {
      return msg.ack()
    }

    // Find cart that contains these products
    const productIds = items.map(item => item.productId)
    const cart = await Cart.findOne({ 
      items: { 
        $elemMatch: { productId: { $in: productIds } } 
      } 
    })
    
    if (!cart) {
      return msg.ack()
    }

    // Remove purchased items from cart
    cart.items = cart.items.filter(ci => 
      !items.some(orderItem => orderItem.productId === ci.productId)
    )
    
    await cart.save()
    msg.ack()
  }
}