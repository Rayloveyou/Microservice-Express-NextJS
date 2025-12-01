import request from 'supertest'
import { app } from '../../app'
import { Product } from '../../models/product'
import { Order, OrderStatus } from '../../models/order'
import { natsWrapper } from '../../nats-wrapper'
import mongoose from 'mongoose'

it('cancel the order', async () => {
  // create a product
  const product = Product.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    title: 'Test Product',
    price: 100,
    quantity: 10
  })
  await product.save()

  const userCookie = global.signin()
  // create an order
  const { body: order } = await request(app)
    .post('/api/orders')
    .set('Cookie', userCookie)
    .send({
      items: [{ productId: product.id, quantity: 1 }]
    })
    .expect(201)

  // make a request to cancel the order
  await request(app).delete(`/api/orders/${order.id}`).set('Cookie', userCookie).send().expect(204)

  const updatedOrder = await Order.findById(order.id)
  expect(updatedOrder!.status).toEqual(OrderStatus.Cancelled)
})

it('emits an order cancelled event', async () => {
  // create a product
  const product = Product.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    title: 'Test Product',
    price: 100,
    quantity: 10
  })
  await product.save()

  const userCookie = global.signin()
  // create an order
  const { body: order } = await request(app)
    .post('/api/orders')
    .set('Cookie', userCookie)
    .send({
      items: [{ productId: product.id, quantity: 1 }]
    })
    .expect(201)

  // make a request to cancel the order
  await request(app).delete(`/api/orders/${order.id}`).set('Cookie', userCookie).send().expect(204)

  expect(natsWrapper.client.publish).toHaveBeenCalled()
})
