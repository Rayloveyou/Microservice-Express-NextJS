import request from 'supertest'
import { app } from '../../app'
import { natsWrapper } from '../../nats-wrapper'
import { Order, OrderStatus } from '../../models/order'
import { Product } from '../../models/product'
import mongoose from 'mongoose'

it('fetches the order', async () => {
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

  // make a request to fetch the order
  // const {body: response}: destructure the response -> only get the body then assign it to response
  const { body: response } = await request(app)
    .get(`/api/orders/${order.id}`)
    .set('Cookie', userCookie)
    .send()
    .expect(200)

  // make sure we only fetch the order we just created
  expect(response.id).toEqual(order.id)
})

it('returns an error if one user tries to fetch another users order', async () => {
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

  // make a request to fetch the order
  await request(app)
    .get(`/api/orders/${order.id}`)
    .set('Cookie', global.signin())
    .send()
    .expect(401)
})
