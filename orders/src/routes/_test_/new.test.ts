import request from 'supertest'
import { app } from '../../app'
import { natsWrapper } from '../../nats-wrapper'
import { Order, OrderStatus } from '../../models/order'
import { Product } from '../../models/product'
import mongoose from 'mongoose'

it('return an error if product does not exist', async () => {
  const productId = new mongoose.Types.ObjectId()
  await request(app)
    .post('/api/orders')
    .set('Cookie', global.signin())
    .send({
      items: [{ productId: productId.toHexString(), quantity: 1 }]
    })
    .expect(404)
})

it('return an error if product does not have enough stock', async () => {
  // create a product with quantity 2
  const product = Product.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    title: 'Test Product',
    price: 100,
    quantity: 2
  })
  await product.save()

  // create an order that reserves 2 units
  const order = Order.build({
    userId: new mongoose.Types.ObjectId().toHexString(),
    status: OrderStatus.Created,
    items: [
      {
        product,
        quantity: 2,
        priceSnapshot: 100,
        titleSnapshot: 'Test Product'
      }
    ],
    total: 200
  })
  await order.save()

  // make a request to build an order which should fail (no stock left)
  await request(app)
    .post('/api/orders')
    .set('Cookie', global.signin())
    .send({
      items: [{ productId: product.id, quantity: 1 }]
    })
    .expect(400)
})

it('reserve a product', async () => {
  const product = Product.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    title: 'Test Product',
    price: 100,
    quantity: 10
  })
  await product.save()

  await request(app)
    .post('/api/orders')
    .set('Cookie', global.signin())
    .send({
      items: [{ productId: product.id, quantity: 2 }]
    })
    .expect(201)
})

it('emit an order created event', async () => {
  const product = Product.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    title: 'Test Product',
    price: 100,
    quantity: 10
  })
  await product.save()

  await request(app)
    .post('/api/orders')
    .set('Cookie', global.signin())
    .send({
      items: [{ productId: product.id, quantity: 1 }]
    })
    .expect(201)

  expect(natsWrapper.client.publish).toHaveBeenCalled()
})
