import request from 'supertest'
import { app } from '../../app'
import { getCookie, createProductId } from '../../test/helpers'
import { Product } from '../../models/product'
import { Cart } from '../../models/cart'
import mongoose from 'mongoose'

describe('POST /api/cart - Add to Cart', () => {
  describe('Authentication', () => {
    it('returns 401 if user is not authenticated', async () => {
      await request(app)
        .post('/api/cart')
        .send({
          productId: createProductId(),
          quantity: 1
        })
        .expect(401)
    })

    it('returns 201 if user is authenticated', async () => {
      const productId = createProductId()

      // Create a product in the database
      const product = Product.build({
        id: productId,
        title: 'Test Product',
        price: 99,
        quantity: 10
      })
      await product.save()

      await request(app)
        .post('/api/cart')
        .set('Cookie', getCookie())
        .send({
          productId,
          quantity: 1
        })
        .expect(201)
    })
  })

  describe('Validation', () => {
    it('returns 400 if productId is missing', async () => {
      await request(app)
        .post('/api/cart')
        .set('Cookie', getCookie())
        .send({
          quantity: 1
        })
        .expect(400)
    })

    it('returns 400 if productId is empty', async () => {
      await request(app)
        .post('/api/cart')
        .set('Cookie', getCookie())
        .send({
          productId: '',
          quantity: 1
        })
        .expect(400)
    })

    it('returns 400 if quantity is missing', async () => {
      await request(app)
        .post('/api/cart')
        .set('Cookie', getCookie())
        .send({
          productId: createProductId()
        })
        .expect(400)
    })

    it('returns 400 if quantity is less than 1', async () => {
      await request(app)
        .post('/api/cart')
        .set('Cookie', getCookie())
        .send({
          productId: createProductId(),
          quantity: 0
        })
        .expect(400)
    })

    it('returns 400 if quantity is not an integer', async () => {
      await request(app)
        .post('/api/cart')
        .set('Cookie', getCookie())
        .send({
          productId: createProductId(),
          quantity: 1.5
        })
        .expect(400)
    })

    it('returns 400 if quantity is negative', async () => {
      await request(app)
        .post('/api/cart')
        .set('Cookie', getCookie())
        .send({
          productId: createProductId(),
          quantity: -1
        })
        .expect(400)
    })
  })

  describe('Product Existence', () => {
    it('returns 404 if product does not exist', async () => {
      const productId = createProductId()

      await request(app)
        .post('/api/cart')
        .set('Cookie', getCookie())
        .send({
          productId,
          quantity: 1
        })
        .expect(404)
    })

    it('successfully adds product if it exists', async () => {
      const productId = createProductId()

      const product = Product.build({
        id: productId,
        title: 'Test Product',
        price: 99,
        quantity: 10
      })
      await product.save()

      const response = await request(app)
        .post('/api/cart')
        .set('Cookie', getCookie())
        .send({
          productId,
          quantity: 2
        })
        .expect(201)

      expect(response.body.items).toHaveLength(1)
      expect(response.body.items[0].productId).toEqual(productId)
      expect(response.body.items[0].quantity).toEqual(2)
    })
  })

  describe('Cart Creation', () => {
    it('creates a new cart if user does not have one', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const productId = createProductId()

      const product = Product.build({
        id: productId,
        title: 'Test Product',
        price: 99,
        quantity: 10
      })
      await product.save()

      // Verify no cart exists
      let cart = await Cart.findOne({ userId })
      expect(cart).toBeNull()

      await request(app)
        .post('/api/cart')
        .set('Cookie', getCookie(userId))
        .send({
          productId,
          quantity: 1
        })
        .expect(201)

      // Verify cart was created
      cart = await Cart.findOne({ userId })
      expect(cart).toBeDefined()
      expect(cart!.items).toHaveLength(1)
    })

    it('uses existing cart if user already has one', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const productId1 = createProductId()
      const productId2 = createProductId()

      const product1 = Product.build({
        id: productId1,
        title: 'Product 1',
        price: 99,
        quantity: 10
      })
      await product1.save()

      const product2 = Product.build({
        id: productId2,
        title: 'Product 2',
        price: 199,
        quantity: 5
      })
      await product2.save()

      // Add first product
      await request(app)
        .post('/api/cart')
        .set('Cookie', getCookie(userId))
        .send({
          productId: productId1,
          quantity: 1
        })
        .expect(201)

      // Add second product
      const response = await request(app)
        .post('/api/cart')
        .set('Cookie', getCookie(userId))
        .send({
          productId: productId2,
          quantity: 2
        })
        .expect(201)

      // Verify cart has both items
      expect(response.body.items).toHaveLength(2)

      // Verify only one cart exists in database
      const carts = await Cart.find({ userId })
      expect(carts).toHaveLength(1)
    })
  })

  describe('Cart Item Updates', () => {
    it('adds new item to cart if product is not already in cart', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const productId = createProductId()

      const product = Product.build({
        id: productId,
        title: 'Test Product',
        price: 99,
        quantity: 10
      })
      await product.save()

      const response = await request(app)
        .post('/api/cart')
        .set('Cookie', getCookie(userId))
        .send({
          productId,
          quantity: 3
        })
        .expect(201)

      expect(response.body.items).toHaveLength(1)
      expect(response.body.items[0].productId).toEqual(productId)
      expect(response.body.items[0].quantity).toEqual(3)
    })

    it('updates quantity if product is already in cart', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const productId = createProductId()

      const product = Product.build({
        id: productId,
        title: 'Test Product',
        price: 99,
        quantity: 10
      })
      await product.save()

      // Add product first time
      await request(app)
        .post('/api/cart')
        .set('Cookie', getCookie(userId))
        .send({
          productId,
          quantity: 2
        })
        .expect(201)

      // Update quantity
      const response = await request(app)
        .post('/api/cart')
        .set('Cookie', getCookie(userId))
        .send({
          productId,
          quantity: 5
        })
        .expect(201)

      expect(response.body.items).toHaveLength(1)
      expect(response.body.items[0].productId).toEqual(productId)
      expect(response.body.items[0].quantity).toEqual(5) // Updated, not added
    })

    it('can reduce quantity of existing item', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const productId = createProductId()

      const product = Product.build({
        id: productId,
        title: 'Test Product',
        price: 99,
        quantity: 10
      })
      await product.save()

      // Add product with quantity 5
      await request(app)
        .post('/api/cart')
        .set('Cookie', getCookie(userId))
        .send({
          productId,
          quantity: 5
        })
        .expect(201)

      // Reduce quantity to 2
      const response = await request(app)
        .post('/api/cart')
        .set('Cookie', getCookie(userId))
        .send({
          productId,
          quantity: 2
        })
        .expect(201)

      expect(response.body.items).toHaveLength(1)
      expect(response.body.items[0].quantity).toEqual(2)
    })
  })

  describe('Response Format', () => {
    it('returns cart with correct structure', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const productId = createProductId()

      const product = Product.build({
        id: productId,
        title: 'Test Product',
        price: 99,
        quantity: 10
      })
      await product.save()

      const response = await request(app)
        .post('/api/cart')
        .set('Cookie', getCookie(userId))
        .send({
          productId,
          quantity: 1
        })
        .expect(201)

      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('userId', userId)
      expect(response.body).toHaveProperty('items')
      expect(response.body).toHaveProperty('version')
      expect(response.body.items[0]).toHaveProperty('productId')
      expect(response.body.items[0]).toHaveProperty('quantity')
    })
  })

  describe('User Isolation', () => {
    it('creates separate carts for different users', async () => {
      const user1Id = new mongoose.Types.ObjectId().toHexString()
      const user2Id = new mongoose.Types.ObjectId().toHexString()
      const productId = createProductId()

      const product = Product.build({
        id: productId,
        title: 'Test Product',
        price: 99,
        quantity: 10
      })
      await product.save()

      // User 1 adds to cart
      await request(app)
        .post('/api/cart')
        .set('Cookie', getCookie(user1Id))
        .send({
          productId,
          quantity: 2
        })
        .expect(201)

      // User 2 adds to cart
      await request(app)
        .post('/api/cart')
        .set('Cookie', getCookie(user2Id))
        .send({
          productId,
          quantity: 3
        })
        .expect(201)

      // Verify two separate carts exist
      const carts = await Cart.find({})
      expect(carts).toHaveLength(2)

      const user1Cart = await Cart.findOne({ userId: user1Id })
      const user2Cart = await Cart.findOne({ userId: user2Id })

      expect(user1Cart!.items[0].quantity).toEqual(2)
      expect(user2Cart!.items[0].quantity).toEqual(3)
    })
  })
})
