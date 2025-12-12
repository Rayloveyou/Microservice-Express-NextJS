import request from 'supertest'
import { app } from '../../app'
import mongoose from 'mongoose'
import { Order } from '../../models/order'
import { OrderStatus } from '@datnxecommerce/common'
import { stripe } from '../../stripe'
import { Payment } from '../../models/payment'
import axios from 'axios'

// Mock axios for product service calls
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

// Increase timeout for all tests since Redis connection attempts may slow things down
jest.setTimeout(10000)

describe('POST /api/payments', () => {
  beforeEach(() => {
    // Default mock: product service reserve succeeds
    mockedAxios.post.mockResolvedValue({ data: { success: true } })
  })

  describe('Authentication', () => {
    it('returns 401 if user is not authenticated', async () => {
      const orderId = new mongoose.Types.ObjectId().toHexString()

      await request(app)
        .post('/api/payments')
        .send({
          token: 'tok_visa',
          orderId
        })
        .expect(401)
    })
  })

  describe('Validation', () => {
    it('returns 400 if token is missing', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const orderId = new mongoose.Types.ObjectId().toHexString()

      await request(app)
        .post('/api/payments')
        .set('Cookie', global.signin(userId))
        .send({
          orderId
        })
        .expect(400)
    })

    it('returns 400 if orderId is missing', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()

      await request(app)
        .post('/api/payments')
        .set('Cookie', global.signin(userId))
        .send({
          token: 'tok_visa'
        })
        .expect(400)
    })

    it('returns 400 if both token and orderId are missing', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()

      await request(app)
        .post('/api/payments')
        .set('Cookie', global.signin(userId))
        .send({})
        .expect(400)
    })

    it('returns 400 if token is empty string', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const orderId = new mongoose.Types.ObjectId().toHexString()

      await request(app)
        .post('/api/payments')
        .set('Cookie', global.signin(userId))
        .send({
          token: '',
          orderId
        })
        .expect(400)
    })

    it('returns 400 if orderId is empty string', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()

      await request(app)
        .post('/api/payments')
        .set('Cookie', global.signin(userId))
        .send({
          token: 'tok_visa',
          orderId: ''
        })
        .expect(400)
    })
  })

  describe('Order Not Found', () => {
    it('returns 404 when purchasing an order that does not exist', async () => {
      await request(app)
        .post('/api/payments')
        .set('Cookie', global.signin())
        .send({
          token: 'tok_visa',
          orderId: new mongoose.Types.ObjectId().toHexString()
        })
        .expect(404)
    })
  })

  describe('Authorization', () => {
    it('returns 401 when purchasing an order that belongs to a different user', async () => {
      const ownerUserId = new mongoose.Types.ObjectId().toHexString()
      const differentUserId = new mongoose.Types.ObjectId().toHexString()

      const order = Order.build({
        id: new mongoose.Types.ObjectId().toHexString(),
        userId: ownerUserId,
        version: 0,
        total: 20,
        status: OrderStatus.Created,
        items: [
          {
            productId: new mongoose.Types.ObjectId().toHexString(),
            quantity: 1,
            price: 20,
            title: 'Test Product'
          }
        ]
      })
      await order.save()

      await request(app)
        .post('/api/payments')
        .set('Cookie', global.signin(differentUserId))
        .send({
          token: 'tok_visa',
          orderId: order.id
        })
        .expect(401)
    })
  })

  describe('Order Status Validation', () => {
    it('returns 400 when purchasing a cancelled order', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()

      const order = Order.build({
        id: new mongoose.Types.ObjectId().toHexString(),
        userId: userId,
        version: 0,
        total: 20,
        status: OrderStatus.Cancelled,
        items: [
          {
            productId: new mongoose.Types.ObjectId().toHexString(),
            quantity: 1,
            price: 20,
            title: 'Test Product'
          }
        ]
      })
      await order.save()

      await request(app)
        .post('/api/payments')
        .set('Cookie', global.signin(userId))
        .send({
          token: 'tok_visa',
          orderId: order.id
        })
        .expect(400)
    })

    it('returns error message when order is cancelled', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()

      const order = Order.build({
        id: new mongoose.Types.ObjectId().toHexString(),
        userId: userId,
        version: 0,
        total: 20,
        status: OrderStatus.Cancelled,
        items: [
          {
            productId: new mongoose.Types.ObjectId().toHexString(),
            quantity: 1,
            price: 20,
            title: 'Test Product'
          }
        ]
      })
      await order.save()

      const response = await request(app)
        .post('/api/payments')
        .set('Cookie', global.signin(userId))
        .send({
          token: 'tok_visa',
          orderId: order.id
        })
        .expect(400)

      expect(response.body.errors[0].message).toEqual('Cannot pay for a cancelled order')
    })
  })

  describe('Product Service Integration', () => {
    it('returns 400 if PRODUCT_SERVICE_URL is not configured', async () => {
      const originalUrl = process.env.PRODUCT_SERVICE_URL
      delete process.env.PRODUCT_SERVICE_URL

      const userId = new mongoose.Types.ObjectId().toHexString()
      const order = Order.build({
        id: new mongoose.Types.ObjectId().toHexString(),
        userId: userId,
        version: 0,
        total: 20,
        status: OrderStatus.Created,
        items: [
          {
            productId: new mongoose.Types.ObjectId().toHexString(),
            quantity: 1,
            price: 20,
            title: 'Test Product'
          }
        ]
      })
      await order.save()

      await request(app)
        .post('/api/payments')
        .set('Cookie', global.signin(userId))
        .send({
          token: 'tok_visa',
          orderId: order.id
        })
        .expect(400)

      // Restore env var
      process.env.PRODUCT_SERVICE_URL = originalUrl
    })

    it('returns 400 when product service reserve fails due to insufficient stock', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const order = Order.build({
        id: new mongoose.Types.ObjectId().toHexString(),
        userId: userId,
        version: 0,
        total: 20,
        status: OrderStatus.Created,
        items: [
          {
            productId: new mongoose.Types.ObjectId().toHexString(),
            quantity: 1,
            price: 20,
            title: 'Test Product'
          }
        ]
      })
      await order.save()

      // Mock product service rejecting due to insufficient stock
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          data: {
            errors: [{ message: 'Insufficient stock for product' }]
          }
        }
      })

      const response = await request(app)
        .post('/api/payments')
        .set('Cookie', global.signin(userId))
        .send({
          token: 'tok_visa',
          orderId: order.id
        })
        .expect(400)

      expect(response.body.errors[0].message).toEqual('Insufficient stock for product')
    })

    it('returns 400 with generic message when product service fails without error details', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const order = Order.build({
        id: new mongoose.Types.ObjectId().toHexString(),
        userId: userId,
        version: 0,
        total: 20,
        status: OrderStatus.Created,
        items: [
          {
            productId: new mongoose.Types.ObjectId().toHexString(),
            quantity: 1,
            price: 20,
            title: 'Test Product'
          }
        ]
      })
      await order.save()

      // Mock product service failure without specific error
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'))

      const response = await request(app)
        .post('/api/payments')
        .set('Cookie', global.signin(userId))
        .send({
          token: 'tok_visa',
          orderId: order.id
        })
        .expect(400)

      expect(response.body.errors[0].message).toEqual('Not enough stock to complete this order')
    })

    it('calls product service reserve endpoint with correct data', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const productId1 = new mongoose.Types.ObjectId().toHexString()
      const productId2 = new mongoose.Types.ObjectId().toHexString()

      const order = Order.build({
        id: new mongoose.Types.ObjectId().toHexString(),
        userId: userId,
        version: 0,
        total: 50,
        status: OrderStatus.Created,
        items: [
          {
            productId: productId1,
            quantity: 2,
            price: 20,
            title: 'Product 1'
          },
          {
            productId: productId2,
            quantity: 1,
            price: 10,
            title: 'Product 2'
          }
        ]
      })
      await order.save()

      await request(app)
        .post('/api/payments')
        .set('Cookie', global.signin(userId))
        .send({
          token: 'tok_visa',
          orderId: order.id
        })
        .expect(201)

      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${process.env.PRODUCT_SERVICE_URL}/api/products/reserve`,
        {
          items: [
            { productId: productId1, quantity: 2 },
            { productId: productId2, quantity: 1 }
          ]
        }
      )
    })
  })

  describe('Stripe Integration', () => {
    it('creates a stripe charge with correct amount', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const price = 25.99

      const order = Order.build({
        id: new mongoose.Types.ObjectId().toHexString(),
        userId: userId,
        version: 0,
        total: price,
        status: OrderStatus.Created,
        items: [
          {
            productId: new mongoose.Types.ObjectId().toHexString(),
            quantity: 1,
            price: price,
            title: 'Test Product'
          }
        ]
      })
      await order.save()

      await request(app)
        .post('/api/payments')
        .set('Cookie', global.signin(userId))
        .send({
          token: 'tok_visa',
          orderId: order.id
        })
        .expect(201)

      const stripeCharges = await stripe.charges.list({ limit: 50 })
      const stripeCharge = stripeCharges.data.find(charge => {
        return charge.amount === Math.round(price * 100)
      })

      expect(stripeCharge).toBeDefined()
      expect(stripeCharge!.currency).toEqual('usd')
      expect(stripeCharge!.amount).toEqual(2599) // 25.99 * 100
    })

    it('rounds amount correctly to avoid stripe decimal errors', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const price = 19.999 // Test rounding

      const order = Order.build({
        id: new mongoose.Types.ObjectId().toHexString(),
        userId: userId,
        version: 0,
        total: price,
        status: OrderStatus.Created,
        items: [
          {
            productId: new mongoose.Types.ObjectId().toHexString(),
            quantity: 1,
            price: price,
            title: 'Test Product'
          }
        ]
      })
      await order.save()

      await request(app)
        .post('/api/payments')
        .set('Cookie', global.signin(userId))
        .send({
          token: 'tok_visa',
          orderId: order.id
        })
        .expect(201)

      const stripeCharges = await stripe.charges.list({ limit: 50 })
      const stripeCharge = stripeCharges.data.find(charge => {
        return charge.amount === 2000 // Should round to 20.00
      })

      expect(stripeCharge).toBeDefined()
    })
  })

  describe('Payment Record Creation', () => {
    it('saves payment record to database', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const price = 30

      const order = Order.build({
        id: new mongoose.Types.ObjectId().toHexString(),
        userId: userId,
        version: 0,
        total: price,
        status: OrderStatus.Created,
        items: [
          {
            productId: new mongoose.Types.ObjectId().toHexString(),
            quantity: 1,
            price: price,
            title: 'Test Product'
          }
        ]
      })
      await order.save()

      await request(app)
        .post('/api/payments')
        .set('Cookie', global.signin(userId))
        .send({
          token: 'tok_visa',
          orderId: order.id
        })
        .expect(201)

      const payment = await Payment.findOne({
        orderId: order.id
      })

      expect(payment).not.toBeNull()
      expect(payment!.orderId).toEqual(order.id)
      expect(payment!.stripeId).toBeDefined()
    })

    it('links payment to correct stripe charge', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const price = Math.floor(Math.random() * 100000)

      const order = Order.build({
        id: new mongoose.Types.ObjectId().toHexString(),
        userId: userId,
        version: 0,
        total: price,
        status: OrderStatus.Created,
        items: [
          {
            productId: new mongoose.Types.ObjectId().toHexString(),
            quantity: 1,
            price: price,
            title: 'Test Product'
          }
        ]
      })
      await order.save()

      await request(app)
        .post('/api/payments')
        .set('Cookie', global.signin(userId))
        .send({
          token: 'tok_visa',
          orderId: order.id
        })
        .expect(201)

      const stripeCharges = await stripe.charges.list({ limit: 50 })
      const stripeCharge = stripeCharges.data.find(charge => {
        return charge.amount === price * 100
      })

      const payment = await Payment.findOne({
        orderId: order.id,
        stripeId: stripeCharge!.id
      })

      expect(payment).not.toBeNull()
    })
  })

  describe('Successful Payment Flow', () => {
    it('returns 201 with valid inputs', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const price = 99.99

      const order = Order.build({
        id: new mongoose.Types.ObjectId().toHexString(),
        userId: userId,
        version: 0,
        total: price,
        status: OrderStatus.Created,
        items: [
          {
            productId: new mongoose.Types.ObjectId().toHexString(),
            quantity: 1,
            price: price,
            title: 'Test Product'
          }
        ]
      })
      await order.save()

      const response = await request(app)
        .post('/api/payments')
        .set('Cookie', global.signin(userId))
        .send({
          token: 'tok_visa',
          orderId: order.id
        })
        .expect(201)

      expect(response.body.id).toBeDefined()
    })

    it('returns stripe charge id in response', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const price = 50

      const order = Order.build({
        id: new mongoose.Types.ObjectId().toHexString(),
        userId: userId,
        version: 0,
        total: price,
        status: OrderStatus.Created,
        items: [
          {
            productId: new mongoose.Types.ObjectId().toHexString(),
            quantity: 1,
            price: price,
            title: 'Test Product'
          }
        ]
      })
      await order.save()

      const response = await request(app)
        .post('/api/payments')
        .set('Cookie', global.signin(userId))
        .send({
          token: 'tok_visa',
          orderId: order.id
        })
        .expect(201)

      const stripeCharges = await stripe.charges.list({ limit: 50 })
      const stripeCharge = stripeCharges.data.find(charge => {
        return charge.amount === price * 100
      })

      expect(response.body.id).toEqual(stripeCharge!.id)
    })

    it('processes payment for order with multiple items', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()

      const order = Order.build({
        id: new mongoose.Types.ObjectId().toHexString(),
        userId: userId,
        version: 0,
        total: 150,
        status: OrderStatus.Created,
        items: [
          {
            productId: new mongoose.Types.ObjectId().toHexString(),
            quantity: 2,
            price: 50,
            title: 'Product 1'
          },
          {
            productId: new mongoose.Types.ObjectId().toHexString(),
            quantity: 1,
            price: 50,
            title: 'Product 2'
          }
        ]
      })
      await order.save()

      const response = await request(app)
        .post('/api/payments')
        .set('Cookie', global.signin(userId))
        .send({
          token: 'tok_visa',
          orderId: order.id
        })
        .expect(201)

      expect(response.body.id).toBeDefined()

      const payment = await Payment.findOne({ orderId: order.id })
      expect(payment).not.toBeNull()
    })
  })

  describe('Edge Cases', () => {
    it('handles zero dollar orders', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()

      const order = Order.build({
        id: new mongoose.Types.ObjectId().toHexString(),
        userId: userId,
        version: 0,
        total: 0,
        status: OrderStatus.Created,
        items: [
          {
            productId: new mongoose.Types.ObjectId().toHexString(),
            quantity: 1,
            price: 0,
            title: 'Free Product'
          }
        ]
      })
      await order.save()

      const response = await request(app)
        .post('/api/payments')
        .set('Cookie', global.signin(userId))
        .send({
          token: 'tok_visa',
          orderId: order.id
        })
        .expect(201)

      expect(response.body.id).toBeDefined()
    })

    it('handles very large order amounts', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const largeAmount = 999999.99

      const order = Order.build({
        id: new mongoose.Types.ObjectId().toHexString(),
        userId: userId,
        version: 0,
        total: largeAmount,
        status: OrderStatus.Created,
        items: [
          {
            productId: new mongoose.Types.ObjectId().toHexString(),
            quantity: 1,
            price: largeAmount,
            title: 'Expensive Product'
          }
        ]
      })
      await order.save()

      const response = await request(app)
        .post('/api/payments')
        .set('Cookie', global.signin(userId))
        .send({
          token: 'tok_visa',
          orderId: order.id
        })
        .expect(201)

      const stripeCharges = await stripe.charges.list({ limit: 50 })
      const stripeCharge = stripeCharges.data.find(charge => {
        return charge.amount === Math.round(largeAmount * 100)
      })

      expect(stripeCharge).toBeDefined()
    })

    it('handles order with items but no price/title (optional fields)', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()

      const order = Order.build({
        id: new mongoose.Types.ObjectId().toHexString(),
        userId: userId,
        version: 0,
        total: 20,
        status: OrderStatus.Created,
        items: [
          {
            productId: new mongoose.Types.ObjectId().toHexString(),
            quantity: 1
          }
        ]
      })
      await order.save()

      await request(app)
        .post('/api/payments')
        .set('Cookie', global.signin(userId))
        .send({
          token: 'tok_visa',
          orderId: order.id
        })
        .expect(201)
    })
  })
})
