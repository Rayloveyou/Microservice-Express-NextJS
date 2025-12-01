import { OrderCreatedListener } from '../order-created-listener'
import { natsWrapper } from '../../../nats-wrapper'
import { OrderCreatedEvent, OrderStatus } from '@datnxecommerce/common'
import mongoose from 'mongoose'
import { Product } from '../../../models/product'

const setup = async () => {
  // Create an instance of the listener
  const listener = new OrderCreatedListener(natsWrapper.client)

  // Create and save a product
  const product = Product.build({
    title: 'concert',
    price: 20,
    userId: 'asdf',
    quantity: 10
  })

  await product.save()

  // Create a fake data object
  const data: OrderCreatedEvent['data'] = {
    id: new mongoose.Types.ObjectId().toHexString(),
    version: 0,
    status: OrderStatus.Created,
    userId: 'asdf',
    items: [
      {
        productId: product.id,
        price: product.price,
        quantity: 2,
        title: product.title
      }
    ],
    total: product.price * 2
  }

  // Create a fake message object
  // @ts-ignore
  const msg: Message = {
    ack: jest.fn()
  }

  return { listener, data, msg }
}

it('does NOT reduce the quantity of the product on order creation', async () => {
  const { listener, data, msg } = await setup()

  // Call the onMessage function with the data object + message object
  await listener.onMessage(data, msg)

  // Product quantity should remain unchanged (will be reduced on payment)
  const product = await Product.findById(data.items[0]!.productId)

  // Initial quantity was 10, should still be 10
  expect(product!.quantity).toEqual(10)
})

it('acks the message', async () => {
  const { listener, data, msg } = await setup()

  // Call the onMessage function with the data object + message object
  await listener.onMessage(data, msg)

  // Write assertions to make sure ack function is called
  expect(msg.ack).toHaveBeenCalled()
})

it('does NOT publish a product updated event on order creation', async () => {
  const { listener, data, msg } = await setup()

  // Call the onMessage function with the data object + message object
  await listener.onMessage(data, msg)

  // Should NOT publish any events (quantity unchanged)
  expect(natsWrapper.client.publish).not.toHaveBeenCalled()
})
