import request from 'supertest'
import { app } from '../../app'
import { getCookie, createProductId } from '../../test/helpers'
import { Product } from '../../models/product'
import { Cart } from '../../models/cart'
import mongoose from 'mongoose'

describe('GET /api/cart - View Cart', () => {
  describe('Authentication', () => {
    it('returns 401 if user is not authenticated', async () => {
      await request(app)
        .get('/api/cart')
        .send()
        .expect(401)
    })

    it('returns 200 if user is authenticated', async () => {
      await request(app)
        .get('/api/cart')
        .set('Cookie', getCookie())
        .send()
        .expect(200)
    })
  })

  describe('Empty Cart', () => {
    it('returns empty items array if user has no cart', async () => {
      const response = await request(app)
        .get('/api/cart')
        .set('Cookie', getCookie())
        .send()
        .expect(200)

      expect(response.body).toEqual({ items: [] })
    })

    it('returns empty items array if cart exists but has no items', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()

      // Create empty cart
      const cart = Cart.build({
        userId,
        items: []
      })
      await cart.save()

      const response = await request(app)
        .get('/api/cart')
        .set('Cookie', getCookie(userId))
        .send()
        .expect(200)

      expect(response.body).toEqual({ items: [] })
    })
  })

  describe('Cart with Items', () => {
    it('returns cart with product details', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const productId = createProductId()

      // Create product
      const product = Product.build({
        id: productId,
        title: 'Test Product',
        price: 99.99,
        quantity: 10,
        imageUrl: 'https://example.com/image.jpg'
      })
      await product.save()

      // Create cart with item
      const cart = Cart.build({
        userId,
        items: [{ productId, quantity: 2 }]
      })
      await cart.save()

      const response = await request(app)
        .get('/api/cart')
        .set('Cookie', getCookie(userId))
        .send()
        .expect(200)

      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('userId', userId)
      expect(response.body).toHaveProperty('version')
      expect(response.body.items).toHaveLength(1)
      expect(response.body.items[0]).toMatchObject({
        productId,
        quantity: 2,
        outOfStock: false,
        insufficientStock: false
      })
      expect(response.body.items[0].product).toMatchObject({
        id: productId,
        title: 'Test Product',
        price: 99.99,
        availableQuantity: 10
      })
    })

    it('returns cart with multiple items', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const productId1 = createProductId()
      const productId2 = createProductId()
      const productId3 = createProductId()

      // Create products
      const product1 = Product.build({
        id: productId1,
        title: 'Product 1',
        price: 10,
        quantity: 5
      })
      await product1.save()

      const product2 = Product.build({
        id: productId2,
        title: 'Product 2',
        price: 20,
        quantity: 3
      })
      await product2.save()

      const product3 = Product.build({
        id: productId3,
        title: 'Product 3',
        price: 30,
        quantity: 7
      })
      await product3.save()

      // Create cart with multiple items
      const cart = Cart.build({
        userId,
        items: [
          { productId: productId1, quantity: 1 },
          { productId: productId2, quantity: 2 },
          { productId: productId3, quantity: 3 }
        ]
      })
      await cart.save()

      const response = await request(app)
        .get('/api/cart')
        .set('Cookie', getCookie(userId))
        .send()
        .expect(200)

      expect(response.body.items).toHaveLength(3)
      expect(response.body.items[0].product.title).toEqual('Product 1')
      expect(response.body.items[1].product.title).toEqual('Product 2')
      expect(response.body.items[2].product.title).toEqual('Product 3')
    })
  })

  describe('Stock Status', () => {
    it('indicates out of stock when product quantity is 0', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const productId = createProductId()

      // Create product with 0 quantity
      const product = Product.build({
        id: productId,
        title: 'Out of Stock Product',
        price: 99,
        quantity: 0
      })
      await product.save()

      // Create cart with item
      const cart = Cart.build({
        userId,
        items: [{ productId, quantity: 1 }]
      })
      await cart.save()

      const response = await request(app)
        .get('/api/cart')
        .set('Cookie', getCookie(userId))
        .send()
        .expect(200)

      expect(response.body.items[0].outOfStock).toBe(true)
      expect(response.body.items[0].insufficientStock).toBe(false)
    })

    it('indicates insufficient stock when cart quantity exceeds available quantity', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const productId = createProductId()

      // Create product with limited quantity
      const product = Product.build({
        id: productId,
        title: 'Limited Stock Product',
        price: 99,
        quantity: 3
      })
      await product.save()

      // Create cart with item quantity greater than available
      const cart = Cart.build({
        userId,
        items: [{ productId, quantity: 5 }]
      })
      await cart.save()

      const response = await request(app)
        .get('/api/cart')
        .set('Cookie', getCookie(userId))
        .send()
        .expect(200)

      expect(response.body.items[0].outOfStock).toBe(false)
      expect(response.body.items[0].insufficientStock).toBe(true)
      expect(response.body.items[0].product.availableQuantity).toEqual(3)
    })

    it('shows no stock issues when quantity matches exactly', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const productId = createProductId()

      // Create product
      const product = Product.build({
        id: productId,
        title: 'Test Product',
        price: 99,
        quantity: 5
      })
      await product.save()

      // Create cart with exact quantity
      const cart = Cart.build({
        userId,
        items: [{ productId, quantity: 5 }]
      })
      await cart.save()

      const response = await request(app)
        .get('/api/cart')
        .set('Cookie', getCookie(userId))
        .send()
        .expect(200)

      expect(response.body.items[0].outOfStock).toBe(false)
      expect(response.body.items[0].insufficientStock).toBe(false)
    })

    it('shows no stock issues when quantity is less than available', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const productId = createProductId()

      // Create product
      const product = Product.build({
        id: productId,
        title: 'Test Product',
        price: 99,
        quantity: 10
      })
      await product.save()

      // Create cart with less quantity
      const cart = Cart.build({
        userId,
        items: [{ productId, quantity: 3 }]
      })
      await cart.save()

      const response = await request(app)
        .get('/api/cart')
        .set('Cookie', getCookie(userId))
        .send()
        .expect(200)

      expect(response.body.items[0].outOfStock).toBe(false)
      expect(response.body.items[0].insufficientStock).toBe(false)
    })
  })

  describe('Product Not Found', () => {
    it('indicates when product is not found in database', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const productId = createProductId()

      // Create cart with item but no corresponding product
      const cart = Cart.build({
        userId,
        items: [{ productId, quantity: 1 }]
      })
      await cart.save()

      const response = await request(app)
        .get('/api/cart')
        .set('Cookie', getCookie(userId))
        .send()
        .expect(200)

      expect(response.body.items[0]).toMatchObject({
        productId,
        quantity: 1,
        outOfStock: true,
        productNotFound: true
      })
      expect(response.body.items[0].product).toBeUndefined()
    })

    it('handles mix of found and not found products', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const productId1 = createProductId()
      const productId2 = createProductId()

      // Create only one product
      const product1 = Product.build({
        id: productId1,
        title: 'Existing Product',
        price: 99,
        quantity: 10
      })
      await product1.save()

      // Create cart with both products
      const cart = Cart.build({
        userId,
        items: [
          { productId: productId1, quantity: 1 },
          { productId: productId2, quantity: 2 }
        ]
      })
      await cart.save()

      const response = await request(app)
        .get('/api/cart')
        .set('Cookie', getCookie(userId))
        .send()
        .expect(200)

      expect(response.body.items).toHaveLength(2)

      // First item should have product details
      expect(response.body.items[0].product).toBeDefined()
      expect(response.body.items[0].productNotFound).toBeUndefined()

      // Second item should be marked as not found
      expect(response.body.items[1].productNotFound).toBe(true)
      expect(response.body.items[1].product).toBeUndefined()
    })
  })

  describe('User Isolation', () => {
    it('returns only the authenticated users cart', async () => {
      const user1Id = new mongoose.Types.ObjectId().toHexString()
      const user2Id = new mongoose.Types.ObjectId().toHexString()
      const productId1 = createProductId()
      const productId2 = createProductId()

      // Create products
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

      // Create cart for user 1
      const cart1 = Cart.build({
        userId: user1Id,
        items: [{ productId: productId1, quantity: 2 }]
      })
      await cart1.save()

      // Create cart for user 2
      const cart2 = Cart.build({
        userId: user2Id,
        items: [{ productId: productId2, quantity: 3 }]
      })
      await cart2.save()

      // User 1 views cart
      const response1 = await request(app)
        .get('/api/cart')
        .set('Cookie', getCookie(user1Id))
        .send()
        .expect(200)

      expect(response1.body.userId).toEqual(user1Id)
      expect(response1.body.items).toHaveLength(1)
      expect(response1.body.items[0].productId).toEqual(productId1)

      // User 2 views cart
      const response2 = await request(app)
        .get('/api/cart')
        .set('Cookie', getCookie(user2Id))
        .send()
        .expect(200)

      expect(response2.body.userId).toEqual(user2Id)
      expect(response2.body.items).toHaveLength(1)
      expect(response2.body.items[0].productId).toEqual(productId2)
    })
  })

  describe('Response Format', () => {
    it('returns all required fields in response', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const productId = createProductId()

      const product = Product.build({
        id: productId,
        title: 'Test Product',
        price: 99,
        quantity: 10
      })
      await product.save()

      const cart = Cart.build({
        userId,
        items: [{ productId, quantity: 1 }]
      })
      await cart.save()

      const response = await request(app)
        .get('/api/cart')
        .set('Cookie', getCookie(userId))
        .send()
        .expect(200)

      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('userId')
      expect(response.body).toHaveProperty('items')
      expect(response.body).toHaveProperty('version')

      const item = response.body.items[0]
      expect(item).toHaveProperty('productId')
      expect(item).toHaveProperty('quantity')
      expect(item).toHaveProperty('outOfStock')
      expect(item).toHaveProperty('insufficientStock')
      expect(item).toHaveProperty('product')

      const product_data = item.product
      expect(product_data).toHaveProperty('id')
      expect(product_data).toHaveProperty('title')
      expect(product_data).toHaveProperty('price')
      expect(product_data).toHaveProperty('availableQuantity')
    })
  })
})
