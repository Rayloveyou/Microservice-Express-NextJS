import request from 'supertest'
import { app } from '../../app'
import mongoose from 'mongoose'
import { Order } from '../../models/order'
import { OrderStatus } from '@datnxecommerce/common'
import { stripe } from '../../stripe'
import { Payment } from '../../models/payment'

it('return a 404 when purchasing an order that does not exist', async () => {
  await request(app)
    .post('/api/payments')
    .set('Cookie', global.signin())
    .send({
      token: 'asdf',
      orderId: new mongoose.Types.ObjectId().toHexString()
    })
    .expect(404)
})

it('return 401 when purchasing an order that does not belong to the user', async () => {
  const order = await Order.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    userId: new mongoose.Types.ObjectId().toHexString(),
    version: 0,
    total: 20,
    status: OrderStatus.Created,
    items: [{ productId: new mongoose.Types.ObjectId().toHexString(), quantity: 1, price: 20 }]
  })
  await order.save()
  await request(app)
    .post('/api/payments')
    .set('Cookie', global.signin())
    .send({
      token: 'asdf',
      orderId: order.id
    })
    .expect(401)
})

it('return 400 when purchasing a cancelled order', async () => {
  const userId = new mongoose.Types.ObjectId().toHexString()

  const order = await Order.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    userId: userId,
    version: 0,
    total: 20,
    status: OrderStatus.Cancelled,
    items: [{ productId: new mongoose.Types.ObjectId().toHexString(), quantity: 1, price: 20 }]
  })

  await order.save()

  await request(app)
    .post('/api/payments')
    .set('Cookie', global.signin(userId))
    .send({
      token: 'asdf',
      orderId: order.id
    })
    .expect(400)
})

it('returns a 201 with valid inputs', async () => {
  const userId = new mongoose.Types.ObjectId().toHexString()
  const price = Math.floor(Math.random() * 100000)

  const order = await Order.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    userId: userId,
    version: 0,
    total: price,
    status: OrderStatus.Created,
    items: [{ productId: new mongoose.Types.ObjectId().toHexString(), quantity: 1, price: price }]
  })

  await order.save()

  const response = await request(app)
    .post('/api/payments')
    .set('Cookie', global.signin(userId))
    .send({
      token: 'tok_visa',
      orderId: order.id
    })

  console.log('Response status:', response.status)
  console.log('Response body:', response.body)

  expect(response.status).toEqual(201)

  // Make sure a charge was created
  const stripeCharges = await stripe.charges.list({ limit: 50 })
  const stripeCharge = stripeCharges.data.find(charge => {
    return charge.amount === price * 100
  })

  expect(stripeCharge).toBeDefined()
  expect(stripeCharge!.currency).toEqual('usd')

  const payment = await Payment.findOne({
    orderId: order.id,
    stripeId: stripeCharge!.id
  })

  expect(payment).not.toBeNull()
})
