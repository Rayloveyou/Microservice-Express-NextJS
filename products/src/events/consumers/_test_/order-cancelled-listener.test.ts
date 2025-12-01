import { natsWrapper } from '../../../nats-wrapper'
import { OrderCancelledListener } from '../order-cancelled-listener'
import { Product } from '../../../models/product'
import mongoose from 'mongoose'
import { OrderCancelledEvent } from '@datnxecommerce/common'

const setup = async () => {
  // Create an instance of the listener
  const listener = new OrderCancelledListener(natsWrapper.client)

  // Create and save a product with reduced quantity (simulating it was ordered)
  const product = Product.build({
    title: 'concert',
    price: 20,
    userId: 'asdf',
    quantity: 5 // Product has 5 remaining after some orders
  })

  await product.save()

  // Create a fake data object - an order of quantity 2 was cancelled
  const data: OrderCancelledEvent['data'] = {
    id: new mongoose.Types.ObjectId().toHexString(),
    version: 1,
    items: [
      {
        productId: product.id,
        quantity: 2
      }
    ],
    total: 40
  }

  // Create a fake message object
  // @ts-ignore
  const msg: Message = {
    ack: jest.fn()
  }

  return { listener, data, msg, product }
}

it('restores the product quantity, publishes an event, and acks the message', async () => {
  const { listener, data, msg, product } = await setup()

  // Initial quantity is 5
  expect(product.quantity).toEqual(5)

  // Call the onMessage function with the data object + message object
  await listener.onMessage(data, msg)

  // Find the updated product
  const updatedProduct = await Product.findById(product.id)

  // Quantity should be restored: 5 + 2 = 7
  expect(updatedProduct!.quantity).toEqual(7)

  expect(msg.ack).toHaveBeenCalled()

  // publish an event that a product was updated
  expect(natsWrapper.client.publish).toHaveBeenCalled()
})
