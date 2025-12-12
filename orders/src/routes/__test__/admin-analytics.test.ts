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

describe('GET /api/orders/admin/analytics', () => {
  it('returns 401 if user is not authenticated', async () => {
    await request(app).get('/api/orders/admin/analytics').expect(401)
  })

  it('returns 403 if user is not an admin', async () => {
    const cookie = signinWithRole(
      new mongoose.Types.ObjectId().toHexString(),
      'user@example.com',
      'user'
    )

    await request(app).get('/api/orders/admin/analytics').set('Cookie', cookie).expect(403)
  })

  it('returns analytics with zero metrics when no orders exist', async () => {
    const adminCookie = signinWithRole(
      new mongoose.Types.ObjectId().toHexString(),
      'admin@example.com',
      'admin'
    )

    const response = await request(app)
      .get('/api/orders/admin/analytics')
      .set('Cookie', adminCookie)
      .expect(200)

    expect(response.body.metrics).toBeDefined()
    expect(response.body.metrics.totalOrders).toEqual(0)
    expect(response.body.metrics.totalRevenue).toEqual(0)
    expect(response.body.metrics.todayOrders).toEqual(0)
    expect(response.body.metrics.todayRevenue).toEqual(0)
    expect(response.body.dailyOrders).toBeDefined()
    expect(response.body.topProducts).toEqual([])
    expect(response.body.recentOrders).toEqual([])
  })

  it('returns 400 for invalid date format', async () => {
    const adminCookie = signinWithRole(
      new mongoose.Types.ObjectId().toHexString(),
      'admin@example.com',
      'admin'
    )

    await request(app)
      .get('/api/orders/admin/analytics?startDate=invalid-date')
      .set('Cookie', adminCookie)
      .expect(400)

    await request(app)
      .get('/api/orders/admin/analytics?endDate=2025/01/01')
      .set('Cookie', adminCookie)
      .expect(400)
  })

  it('returns 400 when date range exceeds 90 days', async () => {
    const adminCookie = signinWithRole(
      new mongoose.Types.ObjectId().toHexString(),
      'admin@example.com',
      'admin'
    )

    const endDate = '2025-12-31'
    const startDate = '2025-01-01' // More than 90 days

    await request(app)
      .get(`/api/orders/admin/analytics?startDate=${startDate}&endDate=${endDate}`)
      .set('Cookie', adminCookie)
      .expect(400)
  })

  it('returns 400 when start date is after end date', async () => {
    const adminCookie = signinWithRole(
      new mongoose.Types.ObjectId().toHexString(),
      'admin@example.com',
      'admin'
    )

    const startDate = '2025-12-31'
    const endDate = '2025-01-01'

    await request(app)
      .get(`/api/orders/admin/analytics?startDate=${startDate}&endDate=${endDate}`)
      .set('Cookie', adminCookie)
      .expect(400)
  })

  it('returns correct metrics for completed orders', async () => {
    const product = Product.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'Metrics Product',
      price: 100,
      quantity: 50
    })
    await product.save()

    // Create completed orders
    await Order.build({
      userId: 'user1',
      status: OrderStatus.Complete,
      items: [{ product, quantity: 1, priceSnapshot: 100, titleSnapshot: 'Metrics Product' }],
      total: 100,
      userEmail: 'user1@example.com'
    }).save()

    await Order.build({
      userId: 'user2',
      status: OrderStatus.Complete,
      items: [{ product, quantity: 2, priceSnapshot: 100, titleSnapshot: 'Metrics Product' }],
      total: 200,
      userEmail: 'user2@example.com'
    }).save()

    // Create non-completed orders (should not be counted)
    await Order.build({
      userId: 'user3',
      status: OrderStatus.Created,
      items: [{ product, quantity: 1, priceSnapshot: 100, titleSnapshot: 'Metrics Product' }],
      total: 100,
      userEmail: 'user3@example.com'
    }).save()

    const adminCookie = signinWithRole(
      new mongoose.Types.ObjectId().toHexString(),
      'admin@example.com',
      'admin'
    )

    const response = await request(app)
      .get('/api/orders/admin/analytics')
      .set('Cookie', adminCookie)
      .expect(200)

    expect(response.body.metrics.totalOrders).toEqual(2)
    expect(response.body.metrics.totalRevenue).toEqual(300)
  })

  it('excludes cancelled and created orders from metrics', async () => {
    const product = Product.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'Exclude Product',
      price: 150,
      quantity: 100
    })
    await product.save()

    await Order.build({
      userId: 'user1',
      status: OrderStatus.Complete,
      items: [{ product, quantity: 1, priceSnapshot: 150, titleSnapshot: 'Exclude Product' }],
      total: 150,
      userEmail: 'user1@example.com'
    }).save()

    await Order.build({
      userId: 'user2',
      status: OrderStatus.Cancelled,
      items: [{ product, quantity: 1, priceSnapshot: 150, titleSnapshot: 'Exclude Product' }],
      total: 150,
      userEmail: 'user2@example.com'
    }).save()

    await Order.build({
      userId: 'user3',
      status: OrderStatus.Created,
      items: [{ product, quantity: 1, priceSnapshot: 150, titleSnapshot: 'Exclude Product' }],
      total: 150,
      userEmail: 'user3@example.com'
    }).save()

    const adminCookie = signinWithRole(
      new mongoose.Types.ObjectId().toHexString(),
      'admin@example.com',
      'admin'
    )

    const response = await request(app)
      .get('/api/orders/admin/analytics')
      .set('Cookie', adminCookie)
      .expect(200)

    // Only complete order should be counted
    expect(response.body.metrics.totalOrders).toEqual(1)
    expect(response.body.metrics.totalRevenue).toEqual(150)
  })

  it('returns daily orders within date range', async () => {
    const product = Product.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'Daily Product',
      price: 100,
      quantity: 100
    })
    await product.save()

    // Create orders with specific dates
    const order1 = Order.build({
      userId: 'user1',
      status: OrderStatus.Complete,
      items: [{ product, quantity: 1, priceSnapshot: 100, titleSnapshot: 'Daily Product' }],
      total: 100,
      userEmail: 'user1@example.com'
    })
    order1.createdAt = new Date('2025-01-15')
    await order1.save()

    const order2 = Order.build({
      userId: 'user2',
      status: OrderStatus.Complete,
      items: [{ product, quantity: 2, priceSnapshot: 100, titleSnapshot: 'Daily Product' }],
      total: 200,
      userEmail: 'user2@example.com'
    })
    order2.createdAt = new Date('2025-01-16')
    await order2.save()

    const adminCookie = signinWithRole(
      new mongoose.Types.ObjectId().toHexString(),
      'admin@example.com',
      'admin'
    )

    const response = await request(app)
      .get('/api/orders/admin/analytics?startDate=2025-01-15&endDate=2025-01-16')
      .set('Cookie', adminCookie)
      .expect(200)

    expect(response.body.dailyOrders).toBeDefined()
    expect(Array.isArray(response.body.dailyOrders)).toBe(true)
    expect(response.body.dailyOrders.length).toBeGreaterThan(0)
  })

  it('fills missing dates with zero values in daily orders', async () => {
    const product = Product.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'Gap Product',
      price: 100,
      quantity: 100
    })
    await product.save()

    // Create order only on one day
    const order = Order.build({
      userId: 'user1',
      status: OrderStatus.Complete,
      items: [{ product, quantity: 1, priceSnapshot: 100, titleSnapshot: 'Gap Product' }],
      total: 100,
      userEmail: 'user1@example.com'
    })
    order.createdAt = new Date('2025-01-15')
    await order.save()

    const adminCookie = signinWithRole(
      new mongoose.Types.ObjectId().toHexString(),
      'admin@example.com',
      'admin'
    )

    const response = await request(app)
      .get('/api/orders/admin/analytics?startDate=2025-01-15&endDate=2025-01-17')
      .set('Cookie', adminCookie)
      .expect(200)

    // Should have data for all 3 days (15, 16, 17)
    expect(response.body.dailyOrders.length).toEqual(3)

    // Check that dates without orders have zero values
    const zeroDay = response.body.dailyOrders.find((d: any) => d.date === '2025-01-16')
    expect(zeroDay).toBeDefined()
    expect(zeroDay.count).toEqual(0)
    expect(zeroDay.revenue).toEqual(0)
  })

  it('returns top products sorted by sales count', async () => {
    const product1 = Product.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'Top Product 1',
      price: 50,
      quantity: 100
    })
    await product1.save()

    const product2 = Product.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'Top Product 2',
      price: 100,
      quantity: 100
    })
    await product2.save()

    // Product 2 sold more
    await Order.build({
      userId: 'user1',
      status: OrderStatus.Complete,
      items: [{ product: product2, quantity: 5, priceSnapshot: 100, titleSnapshot: 'Top Product 2' }],
      total: 500,
      userEmail: 'user1@example.com'
    }).save()

    // Product 1 sold less
    await Order.build({
      userId: 'user2',
      status: OrderStatus.Complete,
      items: [{ product: product1, quantity: 2, priceSnapshot: 50, titleSnapshot: 'Top Product 1' }],
      total: 100,
      userEmail: 'user2@example.com'
    }).save()

    const adminCookie = signinWithRole(
      new mongoose.Types.ObjectId().toHexString(),
      'admin@example.com',
      'admin'
    )

    const response = await request(app)
      .get('/api/orders/admin/analytics')
      .set('Cookie', adminCookie)
      .expect(200)

    expect(response.body.topProducts).toBeDefined()
    expect(response.body.topProducts.length).toBeGreaterThan(0)

    // Product 2 should be first (more sales)
    if (response.body.topProducts.length >= 2) {
      expect(response.body.topProducts[0].salesCount).toBeGreaterThanOrEqual(
        response.body.topProducts[1].salesCount
      )
    }
  })

  it('limits top products to 5 items', async () => {
    // Create 7 products
    const products = []
    for (let i = 0; i < 7; i++) {
      const product = Product.build({
        id: new mongoose.Types.ObjectId().toHexString(),
        title: `Limit Product ${i}`,
        price: 100,
        quantity: 100
      })
      await product.save()
      products.push(product)
    }

    // Create orders for all products
    for (let i = 0; i < 7; i++) {
      await Order.build({
        userId: `user${i}`,
        status: OrderStatus.Complete,
        items: [
          {
            product: products[i],
            quantity: i + 1,
            priceSnapshot: 100,
            titleSnapshot: `Limit Product ${i}`
          }
        ],
        total: 100 * (i + 1),
        userEmail: `user${i}@example.com`
      }).save()
    }

    const adminCookie = signinWithRole(
      new mongoose.Types.ObjectId().toHexString(),
      'admin@example.com',
      'admin'
    )

    const response = await request(app)
      .get('/api/orders/admin/analytics')
      .set('Cookie', adminCookie)
      .expect(200)

    // Should only return top 5
    expect(response.body.topProducts.length).toBeLessThanOrEqual(5)
  })

  it('returns recent orders limited to 10', async () => {
    const product = Product.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'Recent Product',
      price: 100,
      quantity: 200
    })
    await product.save()

    // Create 15 orders
    for (let i = 0; i < 15; i++) {
      await Order.build({
        userId: `user${i}`,
        status: OrderStatus.Complete,
        items: [{ product, quantity: 1, priceSnapshot: 100, titleSnapshot: 'Recent Product' }],
        total: 100,
        userEmail: `user${i}@example.com`
      }).save()
    }

    const adminCookie = signinWithRole(
      new mongoose.Types.ObjectId().toHexString(),
      'admin@example.com',
      'admin'
    )

    const response = await request(app)
      .get('/api/orders/admin/analytics')
      .set('Cookie', adminCookie)
      .expect(200)

    // Should only return 10 most recent
    expect(response.body.recentOrders.length).toEqual(10)
  })

  it('returns recent orders sorted by creation date (newest first)', async () => {
    const product = Product.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'Sort Product',
      price: 100,
      quantity: 100
    })
    await product.save()

    // Create orders with different timestamps
    const order1 = Order.build({
      userId: 'user1',
      status: OrderStatus.Complete,
      items: [{ product, quantity: 1, priceSnapshot: 100, titleSnapshot: 'Sort Product' }],
      total: 100,
      userEmail: 'user1@example.com'
    })
    order1.createdAt = new Date('2025-01-10')
    await order1.save()

    const order2 = Order.build({
      userId: 'user2',
      status: OrderStatus.Complete,
      items: [{ product, quantity: 1, priceSnapshot: 100, titleSnapshot: 'Sort Product' }],
      total: 100,
      userEmail: 'user2@example.com'
    })
    order2.createdAt = new Date('2025-01-12')
    await order2.save()

    const adminCookie = signinWithRole(
      new mongoose.Types.ObjectId().toHexString(),
      'admin@example.com',
      'admin'
    )

    const response = await request(app)
      .get('/api/orders/admin/analytics')
      .set('Cookie', adminCookie)
      .expect(200)

    expect(response.body.recentOrders.length).toEqual(2)

    // First order should be newer
    const firstOrderDate = new Date(response.body.recentOrders[0].createdAt)
    const secondOrderDate = new Date(response.body.recentOrders[1].createdAt)
    expect(firstOrderDate.getTime()).toBeGreaterThanOrEqual(secondOrderDate.getTime())
  })

  it('returns today orders and revenue correctly', async () => {
    const product = Product.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'Today Product',
      price: 100,
      quantity: 100
    })
    await product.save()

    // Create order with today's date
    const todayOrder = Order.build({
      userId: 'user1',
      status: OrderStatus.Complete,
      items: [{ product, quantity: 2, priceSnapshot: 100, titleSnapshot: 'Today Product' }],
      total: 200,
      userEmail: 'user1@example.com'
    })
    todayOrder.createdAt = new Date() // Today
    await todayOrder.save()

    // Create order from yesterday
    const yesterdayOrder = Order.build({
      userId: 'user2',
      status: OrderStatus.Complete,
      items: [{ product, quantity: 1, priceSnapshot: 100, titleSnapshot: 'Today Product' }],
      total: 100,
      userEmail: 'user2@example.com'
    })
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterdayOrder.createdAt = yesterday
    await yesterdayOrder.save()

    const adminCookie = signinWithRole(
      new mongoose.Types.ObjectId().toHexString(),
      'admin@example.com',
      'admin'
    )

    const response = await request(app)
      .get('/api/orders/admin/analytics')
      .set('Cookie', adminCookie)
      .expect(200)

    // Today metrics should only count today's order
    expect(response.body.metrics.todayOrders).toBeGreaterThanOrEqual(1)
    expect(response.body.metrics.todayRevenue).toBeGreaterThanOrEqual(200)

    // Total metrics should count both
    expect(response.body.metrics.totalOrders).toEqual(2)
    expect(response.body.metrics.totalRevenue).toEqual(300)
  })

  it('handles internal errors gracefully', async () => {
    const adminCookie = signinWithRole(
      new mongoose.Types.ObjectId().toHexString(),
      'admin@example.com',
      'admin'
    )

    // Mock Order.aggregate to throw error
    jest.spyOn(Order, 'aggregate').mockRejectedValueOnce(new Error('Database error'))

    const response = await request(app)
      .get('/api/orders/admin/analytics')
      .set('Cookie', adminCookie)
      .expect(500)

    expect(response.body.errors).toBeDefined()
    expect(response.body.errors[0].message).toEqual('Failed to fetch analytics')

    // Restore original implementation
    jest.restoreAllMocks()
  })

  it('returns correct structure for all response fields', async () => {
    const adminCookie = signinWithRole(
      new mongoose.Types.ObjectId().toHexString(),
      'admin@example.com',
      'admin'
    )

    const response = await request(app)
      .get('/api/orders/admin/analytics')
      .set('Cookie', adminCookie)
      .expect(200)

    // Check structure
    expect(response.body).toHaveProperty('dailyOrders')
    expect(response.body).toHaveProperty('metrics')
    expect(response.body).toHaveProperty('topProducts')
    expect(response.body).toHaveProperty('recentOrders')

    expect(response.body.metrics).toHaveProperty('totalOrders')
    expect(response.body.metrics).toHaveProperty('totalRevenue')
    expect(response.body.metrics).toHaveProperty('todayOrders')
    expect(response.body.metrics).toHaveProperty('todayRevenue')

    expect(Array.isArray(response.body.dailyOrders)).toBe(true)
    expect(Array.isArray(response.body.topProducts)).toBe(true)
    expect(Array.isArray(response.body.recentOrders)).toBe(true)
  })
})
