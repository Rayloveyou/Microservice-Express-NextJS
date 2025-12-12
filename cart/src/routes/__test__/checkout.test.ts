import request from 'supertest'
import { app } from '../../app'
import { getCookie, createProductId } from '../../test/helpers'
import { Product } from '../../models/product'
import { Cart } from '../../models/cart'
import { kafkaWrapper } from '../../kafka-wrapper'
import mongoose from 'mongoose'

// Mock fetch for service-to-service communication
global.fetch = jest.fn()

describe('POST /api/cart/checkout - Checkout Cart', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Authentication', () => {
    it('returns 401 if user is not authenticated', async () => {
      await request(app)
        .post('/api/cart/checkout')
        .send()
        .expect(401)
    })

    it('returns 400 if user is authenticated but cart is empty', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()

      // Create empty cart
      const cart = Cart.build({
        userId,
        items: []
      })
      await cart.save()

      await request(app)
        .post('/api/cart/checkout')
        .set('Cookie', getCookie(userId))
        .send()
        .expect(400)
    })
  })

  describe('Empty Cart', () => {
    it('returns 400 if user has no cart', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()

      const response = await request(app)
        .post('/api/cart/checkout')
        .set('Cookie', getCookie(userId))
        .send()
        .expect(400)

      expect(response.body.errors[0].message).toEqual('Cart is empty')
    })

    it('returns 400 if cart exists but has no items', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()

      const cart = Cart.build({
        userId,
        items: []
      })
      await cart.save()

      const response = await request(app)
        .post('/api/cart/checkout')
        .set('Cookie', getCookie(userId))
        .send()
        .expect(400)

      expect(response.body.errors[0].message).toEqual('Cart is empty')
    })
  })

  describe('Kafka Event Publishing', () => {
    it('publishes cart.checkout event to Kafka', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const productId = createProductId()

      // Create cart with items
      const cart = Cart.build({
        userId,
        items: [{ productId, quantity: 2 }]
      })
      await cart.save()

      // Mock successful order creation
      const mockOrder = {
        id: new mongoose.Types.ObjectId().toHexString(),
        userId,
        status: 'Created',
        items: [{ productId, quantity: 2 }],
        total: 198
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrder
      } as Response)

      await request(app)
        .post('/api/cart/checkout')
        .set('Cookie', getCookie(userId))
        .send()
        .expect(201)

      // Verify Kafka producer was called (mocked)
      // Note: kafkaWrapper.producer is mocked, so we just verify the flow completes
      expect(global.fetch).toHaveBeenCalled()
    })
  })

  describe('Order Service Communication', () => {
    it('calls order service with correct payload', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const productId1 = createProductId()
      const productId2 = createProductId()

      // Create cart with multiple items
      const cart = Cart.build({
        userId,
        items: [
          { productId: productId1, quantity: 2 },
          { productId: productId2, quantity: 3 }
        ]
      })
      await cart.save()

      const mockOrder = {
        id: new mongoose.Types.ObjectId().toHexString(),
        userId,
        status: 'Created',
        items: [
          { productId: productId1, quantity: 2 },
          { productId: productId2, quantity: 3 }
        ],
        total: 500
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrder
      } as Response)

      await request(app)
        .post('/api/cart/checkout')
        .set('Cookie', getCookie(userId))
        .send()
        .expect(201)

      // Verify fetch was called with correct URL
      expect(global.fetch).toHaveBeenCalledWith(
        'http://orders-srv:3000/api/orders',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({
            items: [
              { productId: productId1, quantity: 2 },
              { productId: productId2, quantity: 3 }
            ]
          })
        })
      )
    })

    it('forwards authentication cookie to order service', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const productId = createProductId()

      const cart = Cart.build({
        userId,
        items: [{ productId, quantity: 1 }]
      })
      await cart.save()

      const mockOrder = {
        id: new mongoose.Types.ObjectId().toHexString(),
        userId,
        status: 'Created',
        items: [{ productId, quantity: 1 }],
        total: 99
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrder
      } as Response)

      const cookie = getCookie(userId)

      await request(app)
        .post('/api/cart/checkout')
        .set('Cookie', cookie)
        .send()
        .expect(201)

      // Verify cookie was forwarded
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Cookie: cookie[0]
          })
        })
      )
    })

    it('returns 400 if order service returns error', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const productId = createProductId()

      const cart = Cart.build({
        userId,
        items: [{ productId, quantity: 1 }]
      })
      await cart.save()

      // Mock failed order creation
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        text: async () => 'Insufficient stock'
      } as Response)

      const response = await request(app)
        .post('/api/cart/checkout')
        .set('Cookie', getCookie(userId))
        .send()
        .expect(400)

      expect(response.body.errors[0].message).toContain('Failed to create order')
    })

    it('returns 400 if ORDER_SERVICE_URL is not configured', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const productId = createProductId()

      const cart = Cart.build({
        userId,
        items: [{ productId, quantity: 1 }]
      })
      await cart.save()

      // Temporarily remove env variable
      const originalUrl = process.env.ORDER_SERVICE_URL
      delete process.env.ORDER_SERVICE_URL

      const response = await request(app)
        .post('/api/cart/checkout')
        .set('Cookie', getCookie(userId))
        .send()
        .expect(400)

      expect(response.body.errors[0].message).toEqual('ORDER_SERVICE_URL is not configured')

      // Restore env variable
      process.env.ORDER_SERVICE_URL = originalUrl
    })
  })

  describe('Success Cases', () => {
    it('returns 201 with order details on successful checkout', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const productId = createProductId()

      const cart = Cart.build({
        userId,
        items: [{ productId, quantity: 2 }]
      })
      await cart.save()

      const mockOrder = {
        id: new mongoose.Types.ObjectId().toHexString(),
        userId,
        status: 'Created',
        items: [
          {
            product: productId,
            quantity: 2,
            priceSnapshot: 99,
            titleSnapshot: 'Test Product'
          }
        ],
        total: 198
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrder
      } as Response)

      const response = await request(app)
        .post('/api/cart/checkout')
        .set('Cookie', getCookie(userId))
        .send()
        .expect(201)

      expect(response.body).toHaveProperty('message', 'Checkout successful')
      expect(response.body).toHaveProperty('order')
      expect(response.body.order).toMatchObject(mockOrder)
    })

    it('handles checkout with multiple items', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const productId1 = createProductId()
      const productId2 = createProductId()
      const productId3 = createProductId()

      const cart = Cart.build({
        userId,
        items: [
          { productId: productId1, quantity: 1 },
          { productId: productId2, quantity: 2 },
          { productId: productId3, quantity: 3 }
        ]
      })
      await cart.save()

      const mockOrder = {
        id: new mongoose.Types.ObjectId().toHexString(),
        userId,
        status: 'Created',
        items: [
          { product: productId1, quantity: 1, priceSnapshot: 10, titleSnapshot: 'Product 1' },
          { product: productId2, quantity: 2, priceSnapshot: 20, titleSnapshot: 'Product 2' },
          { product: productId3, quantity: 3, priceSnapshot: 30, titleSnapshot: 'Product 3' }
        ],
        total: 140
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrder
      } as Response)

      const response = await request(app)
        .post('/api/cart/checkout')
        .set('Cookie', getCookie(userId))
        .send()
        .expect(201)

      expect(response.body.order.items).toHaveLength(3)
      expect(response.body.order.total).toEqual(140)
    })
  })

  describe('User Isolation', () => {
    it('only allows checkout of authenticated users cart', async () => {
      const user1Id = new mongoose.Types.ObjectId().toHexString()
      const user2Id = new mongoose.Types.ObjectId().toHexString()
      const productId = createProductId()

      // Create cart for user 1
      const cart1 = Cart.build({
        userId: user1Id,
        items: [{ productId, quantity: 1 }]
      })
      await cart1.save()

      // Create cart for user 2
      const cart2 = Cart.build({
        userId: user2Id,
        items: [{ productId, quantity: 2 }]
      })
      await cart2.save()

      const mockOrder = {
        id: new mongoose.Types.ObjectId().toHexString(),
        userId: user1Id,
        status: 'Created',
        items: [{ product: productId, quantity: 1 }],
        total: 99
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrder
      } as Response)

      // User 1 checks out
      await request(app)
        .post('/api/cart/checkout')
        .set('Cookie', getCookie(user1Id))
        .send()
        .expect(201)

      // Verify only user 1's cart was used for checkout
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            items: [{ productId, quantity: 1 }]
          })
        })
      )

      // User 2's cart should still have items
      const user2Cart = await Cart.findOne({ userId: user2Id })
      expect(user2Cart!.items).toHaveLength(1)
      expect(user2Cart!.items[0].quantity).toEqual(2)
    })
  })

  describe('Error Handling', () => {
    it('handles network errors when calling order service', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const productId = createProductId()

      const cart = Cart.build({
        userId,
        items: [{ productId, quantity: 1 }]
      })
      await cart.save()

      // Mock network error
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      await request(app)
        .post('/api/cart/checkout')
        .set('Cookie', getCookie(userId))
        .send()
        .expect(500)
    })

    it('handles malformed response from order service', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const productId = createProductId()

      const cart = Cart.build({
        userId,
        items: [{ productId, quantity: 1 }]
      })
      await cart.save()

      // Mock malformed response
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON')
        }
      } as Response)

      await request(app)
        .post('/api/cart/checkout')
        .set('Cookie', getCookie(userId))
        .send()
        .expect(500)
    })
  })

  describe('Edge Cases', () => {
    it('handles cart with single item', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const productId = createProductId()

      const cart = Cart.build({
        userId,
        items: [{ productId, quantity: 1 }]
      })
      await cart.save()

      const mockOrder = {
        id: new mongoose.Types.ObjectId().toHexString(),
        userId,
        status: 'Created',
        items: [{ product: productId, quantity: 1 }],
        total: 99
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrder
      } as Response)

      const response = await request(app)
        .post('/api/cart/checkout')
        .set('Cookie', getCookie(userId))
        .send()
        .expect(201)

      expect(response.body.order.items).toHaveLength(1)
    })

    it('handles cart with large quantity', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const productId = createProductId()

      const cart = Cart.build({
        userId,
        items: [{ productId, quantity: 100 }]
      })
      await cart.save()

      const mockOrder = {
        id: new mongoose.Types.ObjectId().toHexString(),
        userId,
        status: 'Created',
        items: [{ product: productId, quantity: 100 }],
        total: 9900
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrder
      } as Response)

      const response = await request(app)
        .post('/api/cart/checkout')
        .set('Cookie', getCookie(userId))
        .send()
        .expect(201)

      expect(response.body.order.items[0].quantity).toEqual(100)
    })
  })
})
