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
const signinWithRole = (
  userId: string = new mongoose.Types.ObjectId().toHexString(),
  email: string = 'test@example.com',
  role: string = 'user'
) => {
  const payload = { id: userId, email, role }
  const token = jwt.sign(payload, process.env.JWT_KEY!)
  const session = { jwt: token }
  const sessionJSON = JSON.stringify(session)
  const base64 = Buffer.from(sessionJSON).toString('base64')
  return [`session=${base64}`]
}

describe('GET /api/admin/orders', () => {
  it('returns 401 if user is not authenticated', async () => {
    await request(app).get('/api/admin/orders').expect(401)
  })

  it('returns 403 if user is not an admin', async () => {
    const cookie = signinWithRole(
      new mongoose.Types.ObjectId().toHexString(),
      'user@example.com',
      'user'
    )

    await request(app).get('/api/admin/orders').set('Cookie', cookie).expect(403)
  })

  it('returns empty array when no orders exist', async () => {
    const adminCookie = signinWithRole(
      new mongoose.Types.ObjectId().toHexString(),
      'admin@example.com',
      'admin'
    )

    const response = await request(app)
      .get('/api/admin/orders')
      .set('Cookie', adminCookie)
      .expect(200)

    expect(response.body).toEqual([])
  })

  it('returns all orders for admin user', async () => {
    // Create a product
    const product = Product.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'Admin Product',
      price: 100,
      quantity: 50
    })
    await product.save()

    // Create multiple orders from different users with different statuses
    const user1Id = new mongoose.Types.ObjectId().toHexString()
    const user2Id = new mongoose.Types.ObjectId().toHexString()

    const order1 = Order.build({
      userId: user1Id,
      status: OrderStatus.Created,
      items: [{ product, quantity: 1, priceSnapshot: 100, titleSnapshot: 'Admin Product' }],
      total: 100,
      userEmail: 'user1@example.com'
    })
    await order1.save()

    const order2 = Order.build({
      userId: user2Id,
      status: OrderStatus.Complete,
      items: [{ product, quantity: 2, priceSnapshot: 100, titleSnapshot: 'Admin Product' }],
      total: 200,
      userEmail: 'user2@example.com'
    })
    await order2.save()

    const order3 = Order.build({
      userId: user1Id,
      status: OrderStatus.Cancelled,
      items: [{ product, quantity: 1, priceSnapshot: 100, titleSnapshot: 'Admin Product' }],
      total: 100,
      userEmail: 'user1@example.com'
    })
    await order3.save()

    const adminCookie = signinWithRole(
      new mongoose.Types.ObjectId().toHexString(),
      'admin@example.com',
      'admin'
    )

    const response = await request(app)
      .get('/api/admin/orders')
      .set('Cookie', adminCookie)
      .expect(200)

    // Admin should see all 3 orders
    expect(response.body).toHaveLength(3)
  })

  it('returns orders from all users regardless of status', async () => {
    const product = Product.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'All Status Product',
      price: 150,
      quantity: 100
    })
    await product.save()

    // Create one order of each status
    await Order.build({
      userId: 'user1',
      status: OrderStatus.Created,
      items: [{ product, quantity: 1, priceSnapshot: 150, titleSnapshot: 'All Status Product' }],
      total: 150,
      userEmail: 'user1@example.com'
    }).save()

    await Order.build({
      userId: 'user2',
      status: OrderStatus.Complete,
      items: [{ product, quantity: 1, priceSnapshot: 150, titleSnapshot: 'All Status Product' }],
      total: 150,
      userEmail: 'user2@example.com'
    }).save()

    await Order.build({
      userId: 'user3',
      status: OrderStatus.Cancelled,
      items: [{ product, quantity: 1, priceSnapshot: 150, titleSnapshot: 'All Status Product' }],
      total: 150,
      userEmail: 'user3@example.com'
    }).save()

    const adminCookie = signinWithRole(
      new mongoose.Types.ObjectId().toHexString(),
      'admin@example.com',
      'admin'
    )

    const response = await request(app)
      .get('/api/admin/orders')
      .set('Cookie', adminCookie)
      .expect(200)

    expect(response.body).toHaveLength(3)

    const statuses = response.body.map((order: any) => order.status)
    expect(statuses).toContain(OrderStatus.Created)
    expect(statuses).toContain(OrderStatus.Complete)
    expect(statuses).toContain(OrderStatus.Cancelled)
  })

  it('populates product details in order items', async () => {
    const product = Product.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'Populated Admin Product',
      price: 200,
      quantity: 30
    })
    await product.save()

    await Order.build({
      userId: 'user1',
      status: OrderStatus.Complete,
      items: [
        { product, quantity: 1, priceSnapshot: 200, titleSnapshot: 'Populated Admin Product' }
      ],
      total: 200,
      userEmail: 'user1@example.com'
    }).save()

    const adminCookie = signinWithRole(
      new mongoose.Types.ObjectId().toHexString(),
      'admin@example.com',
      'admin'
    )

    const response = await request(app)
      .get('/api/admin/orders')
      .set('Cookie', adminCookie)
      .expect(200)

    expect(response.body).toHaveLength(1)
    expect(response.body[0].items).toBeDefined()
    expect(response.body[0].items[0].product).toBeDefined()
  })

  it('returns orders with multiple items correctly', async () => {
    const product1 = Product.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'Multi Product 1',
      price: 75,
      quantity: 40
    })
    await product1.save()

    const product2 = Product.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'Multi Product 2',
      price: 125,
      quantity: 60
    })
    await product2.save()

    await Order.build({
      userId: 'multiuser',
      status: OrderStatus.Complete,
      items: [
        { product: product1, quantity: 2, priceSnapshot: 75, titleSnapshot: 'Multi Product 1' },
        { product: product2, quantity: 3, priceSnapshot: 125, titleSnapshot: 'Multi Product 2' }
      ],
      total: 525,
      userEmail: 'multiuser@example.com'
    }).save()

    const adminCookie = signinWithRole(
      new mongoose.Types.ObjectId().toHexString(),
      'admin@example.com',
      'admin'
    )

    const response = await request(app)
      .get('/api/admin/orders')
      .set('Cookie', adminCookie)
      .expect(200)

    expect(response.body).toHaveLength(1)
    expect(response.body[0].items).toHaveLength(2)
    expect(response.body[0].total).toEqual(525)
  })

  it('returns order details including userId and userEmail', async () => {
    const product = Product.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'Detail Product',
      price: 99,
      quantity: 25
    })
    await product.save()

    const userId = new mongoose.Types.ObjectId().toHexString()
    await Order.build({
      userId,
      status: OrderStatus.Complete,
      items: [{ product, quantity: 1, priceSnapshot: 99, titleSnapshot: 'Detail Product' }],
      total: 99,
      userEmail: 'detail@example.com'
    }).save()

    const adminCookie = signinWithRole(
      new mongoose.Types.ObjectId().toHexString(),
      'admin@example.com',
      'admin'
    )

    const response = await request(app)
      .get('/api/admin/orders')
      .set('Cookie', adminCookie)
      .expect(200)

    expect(response.body).toHaveLength(1)
    expect(response.body[0].userId).toEqual(userId)
    expect(response.body[0].userEmail).toEqual('detail@example.com')
  })

  it('returns orders with timestamps', async () => {
    const product = Product.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'Timestamp Product',
      price: 88,
      quantity: 15
    })
    await product.save()

    await Order.build({
      userId: 'timeuser',
      status: OrderStatus.Complete,
      items: [{ product, quantity: 1, priceSnapshot: 88, titleSnapshot: 'Timestamp Product' }],
      total: 88,
      userEmail: 'timeuser@example.com'
    }).save()

    const adminCookie = signinWithRole(
      new mongoose.Types.ObjectId().toHexString(),
      'admin@example.com',
      'admin'
    )

    const response = await request(app)
      .get('/api/admin/orders')
      .set('Cookie', adminCookie)
      .expect(200)

    expect(response.body).toHaveLength(1)
    expect(response.body[0].createdAt).toBeDefined()
    expect(response.body[0].updatedAt).toBeDefined()
  })

  it('handles large number of orders efficiently', async () => {
    const product = Product.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'Bulk Product',
      price: 50,
      quantity: 1000
    })
    await product.save()

    // Create 20 orders
    const orderPromises = []
    for (let i = 0; i < 20; i++) {
      const order = Order.build({
        userId: `user${i}`,
        status: i % 3 === 0 ? OrderStatus.Complete : i % 3 === 1 ? OrderStatus.Created : OrderStatus.Cancelled,
        items: [{ product, quantity: 1, priceSnapshot: 50, titleSnapshot: 'Bulk Product' }],
        total: 50,
        userEmail: `user${i}@example.com`
      })
      orderPromises.push(order.save())
    }
    await Promise.all(orderPromises)

    const adminCookie = signinWithRole(
      new mongoose.Types.ObjectId().toHexString(),
      'admin@example.com',
      'admin'
    )

    const response = await request(app)
      .get('/api/admin/orders')
      .set('Cookie', adminCookie)
      .expect(200)

    expect(response.body).toHaveLength(20)
  })

  it('does not allow regular users with admin email in env to access', async () => {
    // Set admin email env
    process.env.ADMIN_EMAIL = 'admin@gmail.com'

    // Try with regular user (not admin role)
    const regularCookie = signinWithRole(
      new mongoose.Types.ObjectId().toHexString(),
      'user@example.com',
      'user'
    )

    await request(app).get('/api/admin/orders').set('Cookie', regularCookie).expect(403)

    // Clean up
    delete process.env.ADMIN_EMAIL
  })
})
