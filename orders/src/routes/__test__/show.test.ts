import request from 'supertest'
import { app } from '../../app'
import { Order } from '../../models/order'
import { Product } from '../../models/product'
import { OrderStatus } from '@datnxecommerce/common'
import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'

// Mock kafkaWrapper
jest.mock('../../kafka-wrapper')

// Helper to create a signin cookie with specific userId and role
const signinWithUser = (userId: string, email: string = 'test@example.com', role: string = 'user') => {
  const payload = { id: userId, email, role }
  const token = jwt.sign(payload, process.env.JWT_KEY!)
  const session = { jwt: token }
  const sessionJSON = JSON.stringify(session)
  const base64 = Buffer.from(sessionJSON).toString('base64')
  return [`session=${base64}`]
}

describe('GET /api/orders/:id', () => {
  it('returns 401 if user is not authenticated', async () => {
    const orderId = new mongoose.Types.ObjectId().toHexString()
    await request(app).get(`/api/orders/${orderId}`).expect(401)
  })

  it('returns 404 if order id is not a valid ObjectId', async () => {
    await request(app)
      .get('/api/orders/invalid-id')
      .set('Cookie', global.signin())
      .expect(404)
  })

  it('returns 404 if order does not exist', async () => {
    const orderId = new mongoose.Types.ObjectId().toHexString()

    await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Cookie', global.signin())
      .expect(404)
  })

  it('returns 403 if user is not the owner of the order', async () => {
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

    // Try to access with different userId
    const differentUserId = new mongoose.Types.ObjectId().toHexString()
    const cookie = signinWithUser(differentUserId, 'other@example.com')

    await request(app).get(`/api/orders/${order.id}`).set('Cookie', cookie).expect(403)
  })

  it('returns order if user is the owner', async () => {
    // Create a product
    const product = Product.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'Owner Product',
      price: 150,
      quantity: 20
    })
    await product.save()

    // Create an order with specific userId
    const userId = new mongoose.Types.ObjectId().toHexString()
    const order = Order.build({
      userId,
      status: OrderStatus.Created,
      items: [
        {
          product,
          quantity: 2,
          priceSnapshot: 150,
          titleSnapshot: 'Owner Product'
        }
      ],
      total: 300,
      userEmail: 'owner@example.com'
    })
    await order.save()

    // Access with same userId
    const cookie = signinWithUser(userId, 'owner@example.com')

    const response = await request(app)
      .get(`/api/orders/${order.id}`)
      .set('Cookie', cookie)
      .expect(200)

    expect(response.body.id).toEqual(order.id)
    expect(response.body.userId).toEqual(userId)
    expect(response.body.status).toEqual(OrderStatus.Created)
    expect(response.body.total).toEqual(300)
  })

  it('returns order if user is admin (not owner)', async () => {
    // Create a product
    const product = Product.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'Admin View Product',
      price: 200,
      quantity: 15
    })
    await product.save()

    // Create an order with specific userId
    const ownerUserId = new mongoose.Types.ObjectId().toHexString()
    const order = Order.build({
      userId: ownerUserId,
      status: OrderStatus.Complete,
      items: [
        {
          product,
          quantity: 1,
          priceSnapshot: 200,
          titleSnapshot: 'Admin View Product'
        }
      ],
      total: 200,
      userEmail: 'owner@example.com'
    })
    await order.save()

    // Access with admin userId
    const adminUserId = new mongoose.Types.ObjectId().toHexString()
    const adminCookie = signinWithUser(adminUserId, 'admin@example.com', 'admin')

    const response = await request(app)
      .get(`/api/orders/${order.id}`)
      .set('Cookie', adminCookie)
      .expect(200)

    expect(response.body.id).toEqual(order.id)
    expect(response.body.userId).toEqual(ownerUserId) // Different from admin
  })

  it('populates product details in order items', async () => {
    const product = Product.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'Populated Product',
      price: 99,
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
          priceSnapshot: 99,
          titleSnapshot: 'Populated Product'
        }
      ],
      total: 99,
      userEmail: 'user@example.com'
    })
    await order.save()

    const cookie = signinWithUser(userId, 'user@example.com')

    const response = await request(app)
      .get(`/api/orders/${order.id}`)
      .set('Cookie', cookie)
      .expect(200)

    expect(response.body.items).toHaveLength(1)
    expect(response.body.items[0].product).toBeDefined()
    expect(response.body.items[0].titleSnapshot).toEqual('Populated Product')
    expect(response.body.items[0].priceSnapshot).toEqual(99)
  })

  it('returns order with multiple items', async () => {
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

    const response = await request(app)
      .get(`/api/orders/${order.id}`)
      .set('Cookie', cookie)
      .expect(200)

    expect(response.body.items).toHaveLength(2)
    expect(response.body.total).toEqual(325)
  })

  it('returns order with correct status', async () => {
    const product = Product.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'Status Product',
      price: 120,
      quantity: 30
    })
    await product.save()

    const userId = new mongoose.Types.ObjectId().toHexString()

    // Test Complete status
    const completeOrder = Order.build({
      userId,
      status: OrderStatus.Complete,
      items: [{ product, quantity: 1, priceSnapshot: 120, titleSnapshot: 'Status Product' }],
      total: 120,
      userEmail: 'user@example.com'
    })
    await completeOrder.save()

    const cookie = signinWithUser(userId, 'user@example.com')

    const response1 = await request(app)
      .get(`/api/orders/${completeOrder.id}`)
      .set('Cookie', cookie)
      .expect(200)

    expect(response1.body.status).toEqual(OrderStatus.Complete)

    // Test Cancelled status
    const cancelledOrder = Order.build({
      userId,
      status: OrderStatus.Cancelled,
      items: [{ product, quantity: 1, priceSnapshot: 120, titleSnapshot: 'Status Product' }],
      total: 120,
      userEmail: 'user@example.com'
    })
    await cancelledOrder.save()

    const response2 = await request(app)
      .get(`/api/orders/${cancelledOrder.id}`)
      .set('Cookie', cookie)
      .expect(200)

    expect(response2.body.status).toEqual(OrderStatus.Cancelled)
  })

  it('returns correct order details including timestamps', async () => {
    const product = Product.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'Timestamp Product',
      price: 88,
      quantity: 25
    })
    await product.save()

    const userId = new mongoose.Types.ObjectId().toHexString()
    const order = Order.build({
      userId,
      status: OrderStatus.Created,
      items: [{ product, quantity: 1, priceSnapshot: 88, titleSnapshot: 'Timestamp Product' }],
      total: 88,
      userEmail: 'user@example.com'
    })
    await order.save()

    const cookie = signinWithUser(userId, 'user@example.com')

    const response = await request(app)
      .get(`/api/orders/${order.id}`)
      .set('Cookie', cookie)
      .expect(200)

    expect(response.body.createdAt).toBeDefined()
    expect(response.body.updatedAt).toBeDefined()
  })
})
