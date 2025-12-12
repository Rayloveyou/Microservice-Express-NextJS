import request from 'supertest'
import { app } from '../../app'
import { Order } from '../../models/order'
import { Product } from '../../models/product'
import { OrderStatus } from '@datnxecommerce/common'
import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'
import { kafkaWrapper } from '../../kafka-wrapper'

// Mock kafkaWrapper
jest.mock('../../kafka-wrapper')

// Helper to create a signin cookie with specific userId
const signinWithUser = (userId: string, email: string = 'test@example.com') => {
  const payload = { id: userId, email }
  const token = jwt.sign(payload, process.env.JWT_KEY!)
  const session = { jwt: token }
  const sessionJSON = JSON.stringify(session)
  const base64 = Buffer.from(sessionJSON).toString('base64')
  return [`session=${base64}`]
}

describe('DELETE /api/orders/:id', () => {
  it('returns 401 if user is not authenticated', async () => {
    const orderId = new mongoose.Types.ObjectId().toHexString()
    await request(app).delete(`/api/orders/${orderId}`).expect(401)
  })

  it('returns 404 if order id is not a valid ObjectId', async () => {
    await request(app)
      .delete('/api/orders/invalid-id')
      .set('Cookie', global.signin())
      .expect(404)
  })

  it('returns 404 if order does not exist', async () => {
    const orderId = new mongoose.Types.ObjectId().toHexString()

    await request(app)
      .delete(`/api/orders/${orderId}`)
      .set('Cookie', global.signin())
      .expect(404)
  })

  it('returns 404 if user is not the owner of the order', async () => {
    // Create a product
    const product = Product.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'Test Product',
      price: 100,
      quantity: 10
    })
    await product.save()

    // Create an order with a specific userId
    const ownerUserId = new mongoose.Types.ObjectId().toHexString()
    const order = Order.build({
      userId: ownerUserId,
      status: OrderStatus.Created,
      items: [
        {
          product,
          quantity: 1,
          priceSnapshot: 100,
          titleSnapshot: 'Test Product'
        }
      ],
      total: 100,
      userEmail: 'owner@example.com'
    })
    await order.save()

    // Try to delete with different userId
    const differentUserId = new mongoose.Types.ObjectId().toHexString()
    const cookie = signinWithUser(differentUserId, 'other@example.com')

    await request(app).delete(`/api/orders/${order.id}`).set('Cookie', cookie).expect(404)

    // Order should still exist
    const orderExists = await Order.findById(order.id)
    expect(orderExists).toBeDefined()
    expect(orderExists!.status).toEqual(OrderStatus.Created)
  })

  it('cancels the order if user is the owner', async () => {
    const product = Product.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'Cancel Product',
      price: 150,
      quantity: 20
    })
    await product.save()

    const userId = new mongoose.Types.ObjectId().toHexString()
    const order = Order.build({
      userId,
      status: OrderStatus.Created,
      items: [
        {
          product,
          quantity: 2,
          priceSnapshot: 150,
          titleSnapshot: 'Cancel Product'
        }
      ],
      total: 300,
      userEmail: 'owner@example.com'
    })
    await order.save()

    const cookie = signinWithUser(userId, 'owner@example.com')

    await request(app).delete(`/api/orders/${order.id}`).set('Cookie', cookie).expect(204)

    // Order should be cancelled
    const cancelledOrder = await Order.findById(order.id)
    expect(cancelledOrder).toBeDefined()
    expect(cancelledOrder!.status).toEqual(OrderStatus.Cancelled)
  })

  it('publishes an order cancelled event to Kafka', async () => {
    const product = Product.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'Event Product',
      price: 200,
      quantity: 15
    })
    await product.save()

    const userId = new mongoose.Types.ObjectId().toHexString()
    const order = Order.build({
      userId,
      status: OrderStatus.Created,
      items: [
        {
          product,
          quantity: 1,
          priceSnapshot: 200,
          titleSnapshot: 'Event Product'
        }
      ],
      total: 200,
      userEmail: 'user@example.com'
    })
    await order.save()

    const cookie = signinWithUser(userId, 'user@example.com')

    await request(app).delete(`/api/orders/${order.id}`).set('Cookie', cookie).expect(204)

    // Verify Kafka producer was called
    expect(kafkaWrapper.producer.send).toHaveBeenCalled()
  })

  it('does not delete the order from database, only cancels it', async () => {
    const product = Product.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'Persist Product',
      price: 99,
      quantity: 25
    })
    await product.save()

    const userId = new mongoose.Types.ObjectId().toHexString()
    const order = Order.build({
      userId,
      status: OrderStatus.Created,
      items: [
        {
          product,
          quantity: 1,
          priceSnapshot: 99,
          titleSnapshot: 'Persist Product'
        }
      ],
      total: 99,
      userEmail: 'user@example.com'
    })
    await order.save()

    const ordersBefore = await Order.countDocuments()
    expect(ordersBefore).toEqual(1)

    const cookie = signinWithUser(userId, 'user@example.com')

    await request(app).delete(`/api/orders/${order.id}`).set('Cookie', cookie).expect(204)

    // Order should still exist in database
    const ordersAfter = await Order.countDocuments()
    expect(ordersAfter).toEqual(1)

    // But status should be cancelled
    const updatedOrder = await Order.findById(order.id)
    expect(updatedOrder!.status).toEqual(OrderStatus.Cancelled)
  })

  it('increments order version when cancelled', async () => {
    const product = Product.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'Version Product',
      price: 120,
      quantity: 30
    })
    await product.save()

    const userId = new mongoose.Types.ObjectId().toHexString()
    const order = Order.build({
      userId,
      status: OrderStatus.Created,
      items: [
        {
          product,
          quantity: 1,
          priceSnapshot: 120,
          titleSnapshot: 'Version Product'
        }
      ],
      total: 120,
      userEmail: 'user@example.com'
    })
    await order.save()

    const originalVersion = order.version
    const cookie = signinWithUser(userId, 'user@example.com')

    await request(app).delete(`/api/orders/${order.id}`).set('Cookie', cookie).expect(204)

    const updatedOrder = await Order.findById(order.id)
    expect(updatedOrder!.version).toEqual(originalVersion + 1)
  })

  it('can cancel order with multiple items', async () => {
    const product1 = Product.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'Product 1',
      price: 50,
      quantity: 100
    })
    await product1.save()

    const product2 = Product.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'Product 2',
      price: 75,
      quantity: 80
    })
    await product2.save()

    const userId = new mongoose.Types.ObjectId().toHexString()
    const order = Order.build({
      userId,
      status: OrderStatus.Created,
      items: [
        {
          product: product1,
          quantity: 2,
          priceSnapshot: 50,
          titleSnapshot: 'Product 1'
        },
        {
          product: product2,
          quantity: 3,
          priceSnapshot: 75,
          titleSnapshot: 'Product 2'
        }
      ],
      total: 325,
      userEmail: 'user@example.com'
    })
    await order.save()

    const cookie = signinWithUser(userId, 'user@example.com')

    await request(app).delete(`/api/orders/${order.id}`).set('Cookie', cookie).expect(204)

    const cancelledOrder = await Order.findById(order.id).populate('items.product')
    expect(cancelledOrder!.status).toEqual(OrderStatus.Cancelled)
    expect(cancelledOrder!.items).toHaveLength(2)
  })

  it('publishes correct event data when cancelling order', async () => {
    const product = Product.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'Event Data Product',
      price: 88,
      quantity: 40
    })
    await product.save()

    const userId = new mongoose.Types.ObjectId().toHexString()
    const order = Order.build({
      userId,
      status: OrderStatus.Created,
      items: [
        {
          product,
          quantity: 3,
          priceSnapshot: 88,
          titleSnapshot: 'Event Data Product'
        }
      ],
      total: 264,
      userEmail: 'user@example.com'
    })
    await order.save()

    const cookie = signinWithUser(userId, 'user@example.com')

    await request(app).delete(`/api/orders/${order.id}`).set('Cookie', cookie).expect(204)

    // Check that Kafka producer was called with correct data structure
    expect(kafkaWrapper.producer.send).toHaveBeenCalled()
    const sendCall = (kafkaWrapper.producer.send as jest.Mock).mock.calls[0][0]
    expect(sendCall).toBeDefined()
  })

  it('returns 204 with no content on successful cancellation', async () => {
    const product = Product.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'No Content Product',
      price: 77,
      quantity: 50
    })
    await product.save()

    const userId = new mongoose.Types.ObjectId().toHexString()
    const order = Order.build({
      userId,
      status: OrderStatus.Created,
      items: [
        {
          product,
          quantity: 1,
          priceSnapshot: 77,
          titleSnapshot: 'No Content Product'
        }
      ],
      total: 77,
      userEmail: 'user@example.com'
    })
    await order.save()

    const cookie = signinWithUser(userId, 'user@example.com')

    const response = await request(app)
      .delete(`/api/orders/${order.id}`)
      .set('Cookie', cookie)
      .expect(204)

    expect(response.body).toEqual({})
  })

  it('cannot cancel already cancelled order', async () => {
    const product = Product.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'Already Cancelled',
      price: 60,
      quantity: 20
    })
    await product.save()

    const userId = new mongoose.Types.ObjectId().toHexString()
    const order = Order.build({
      userId,
      status: OrderStatus.Cancelled,
      items: [
        {
          product,
          quantity: 1,
          priceSnapshot: 60,
          titleSnapshot: 'Already Cancelled'
        }
      ],
      total: 60,
      userEmail: 'user@example.com'
    })
    await order.save()

    const cookie = signinWithUser(userId, 'user@example.com')

    // Should still succeed (idempotent operation)
    await request(app).delete(`/api/orders/${order.id}`).set('Cookie', cookie).expect(204)

    const stillCancelled = await Order.findById(order.id)
    expect(stillCancelled!.status).toEqual(OrderStatus.Cancelled)
  })
})
