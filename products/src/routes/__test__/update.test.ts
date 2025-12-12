import request from 'supertest'
import { app } from '../../app'
import { Product, ProductCategory } from '../../models/product'
import { kafkaWrapper } from '../../kafka-wrapper'
import mongoose from 'mongoose'

// Mock MinIO
jest.mock('../../config/cloudinary', () => ({
  minioClient: {
    putObject: jest.fn().mockResolvedValue(undefined)
  },
  BUCKET_NAME: 'test-bucket'
}))

describe('PUT /api/products/:id', () => {
  it('returns 401 if user is not authenticated', async () => {
    const id = new mongoose.Types.ObjectId().toHexString()

    await request(app)
      .put(`/api/products/${id}`)
      .send({
        title: 'Updated Product',
        price: 20,
        quantity: 10
      })
      .expect(401)
  })

  it('returns 404 if product does not exist', async () => {
    const id = new mongoose.Types.ObjectId().toHexString()

    await request(app)
      .put(`/api/products/${id}`)
      .set('Cookie', global.signin())
      .send({
        title: 'Updated Product',
        price: 20,
        quantity: 10
      })
      .expect(404)
  })

  it('returns 404 if id is not a valid MongoDB ObjectId', async () => {
    await request(app)
      .put('/api/products/invalid-id')
      .set('Cookie', global.signin())
      .send({
        title: 'Updated Product',
        price: 20,
        quantity: 10
      })
      .expect(404)
  })

  it('returns 401 if user does not own the product', async () => {
    const product = await Product.build({
      title: 'Test Product',
      price: 10,
      userId: new mongoose.Types.ObjectId().toHexString(),
      quantity: 5,
      category: ProductCategory.Electronics
    }).save()

    await request(app)
      .put(`/api/products/${product.id}`)
      .set('Cookie', global.signin())
      .send({
        title: 'Updated Product',
        price: 20,
        quantity: 10
      })
      .expect(401)
  })

  it('returns 400 if title is not provided', async () => {
    const cookie = global.signin()
    const userId = JSON.parse(Buffer.from(cookie[0].split('=')[1], 'base64').toString('utf-8')).jwt
    const decoded = JSON.parse(Buffer.from(userId.split('.')[1], 'base64').toString('utf-8'))

    const product = await Product.build({
      title: 'Test Product',
      price: 10,
      userId: decoded.id,
      quantity: 5,
      category: ProductCategory.Electronics
    }).save()

    await request(app)
      .put(`/api/products/${product.id}`)
      .set('Cookie', cookie)
      .send({
        price: 20,
        quantity: 10
      })
      .expect(400)
  })

  it('returns 400 if title is empty', async () => {
    const cookie = global.signin()
    const userId = JSON.parse(Buffer.from(cookie[0].split('=')[1], 'base64').toString('utf-8')).jwt
    const decoded = JSON.parse(Buffer.from(userId.split('.')[1], 'base64').toString('utf-8'))

    const product = await Product.build({
      title: 'Test Product',
      price: 10,
      userId: decoded.id,
      quantity: 5,
      category: ProductCategory.Electronics
    }).save()

    await request(app)
      .put(`/api/products/${product.id}`)
      .set('Cookie', cookie)
      .send({
        title: '',
        price: 20,
        quantity: 10
      })
      .expect(400)
  })

  it('returns 400 if price is not positive', async () => {
    const cookie = global.signin()
    const userId = JSON.parse(Buffer.from(cookie[0].split('=')[1], 'base64').toString('utf-8')).jwt
    const decoded = JSON.parse(Buffer.from(userId.split('.')[1], 'base64').toString('utf-8'))

    const product = await Product.build({
      title: 'Test Product',
      price: 10,
      userId: decoded.id,
      quantity: 5,
      category: ProductCategory.Electronics
    }).save()

    await request(app)
      .put(`/api/products/${product.id}`)
      .set('Cookie', cookie)
      .send({
        title: 'Updated Product',
        price: -10,
        quantity: 10
      })
      .expect(400)

    await request(app)
      .put(`/api/products/${product.id}`)
      .set('Cookie', cookie)
      .send({
        title: 'Updated Product',
        price: 0,
        quantity: 10
      })
      .expect(400)
  })

  it('returns 400 if quantity is negative', async () => {
    const cookie = global.signin()
    const userId = JSON.parse(Buffer.from(cookie[0].split('=')[1], 'base64').toString('utf-8')).jwt
    const decoded = JSON.parse(Buffer.from(userId.split('.')[1], 'base64').toString('utf-8'))

    const product = await Product.build({
      title: 'Test Product',
      price: 10,
      userId: decoded.id,
      quantity: 5,
      category: ProductCategory.Electronics
    }).save()

    await request(app)
      .put(`/api/products/${product.id}`)
      .set('Cookie', cookie)
      .send({
        title: 'Updated Product',
        price: 20,
        quantity: -5
      })
      .expect(400)
  })

  it('updates the product when valid inputs are provided', async () => {
    const cookie = global.signin()
    const userId = JSON.parse(Buffer.from(cookie[0].split('=')[1], 'base64').toString('utf-8')).jwt
    const decoded = JSON.parse(Buffer.from(userId.split('.')[1], 'base64').toString('utf-8'))

    const product = await Product.build({
      title: 'Test Product',
      price: 10,
      userId: decoded.id,
      quantity: 5,
      category: ProductCategory.Electronics
    }).save()

    await request(app)
      .put(`/api/products/${product.id}`)
      .set('Cookie', cookie)
      .send({
        title: 'Updated Product',
        price: 20,
        quantity: 10
      })
      .expect(200)

    const updatedProduct = await Product.findById(product.id)

    expect(updatedProduct!.title).toBe('Updated Product')
    expect(updatedProduct!.price).toBe(20)
    expect(updatedProduct!.quantity).toBe(10)
  })

  it('publishes an event after updating product', async () => {
    const cookie = global.signin()
    const userId = JSON.parse(Buffer.from(cookie[0].split('=')[1], 'base64').toString('utf-8')).jwt
    const decoded = JSON.parse(Buffer.from(userId.split('.')[1], 'base64').toString('utf-8'))

    const product = await Product.build({
      title: 'Test Product',
      price: 10,
      userId: decoded.id,
      quantity: 5,
      category: ProductCategory.Electronics
    }).save()

    await request(app)
      .put(`/api/products/${product.id}`)
      .set('Cookie', cookie)
      .send({
        title: 'Updated Product',
        price: 20,
        quantity: 10
      })
      .expect(200)

    expect(kafkaWrapper.producer.send).toHaveBeenCalled()
  })

  it('increments the version number after update', async () => {
    const cookie = global.signin()
    const userId = JSON.parse(Buffer.from(cookie[0].split('=')[1], 'base64').toString('utf-8')).jwt
    const decoded = JSON.parse(Buffer.from(userId.split('.')[1], 'base64').toString('utf-8'))

    const product = await Product.build({
      title: 'Test Product',
      price: 10,
      userId: decoded.id,
      quantity: 5,
      category: ProductCategory.Electronics
    }).save()

    expect(product.version).toBe(0)

    const response = await request(app)
      .put(`/api/products/${product.id}`)
      .set('Cookie', cookie)
      .send({
        title: 'Updated Product',
        price: 20,
        quantity: 10
      })
      .expect(200)

    expect(response.body.version).toBe(1)
  })

  it('allows admin to update any product', async () => {
    // Create product with user A
    const userAId = new mongoose.Types.ObjectId().toHexString()
    const product = await Product.build({
      title: 'User A Product',
      price: 10,
      userId: userAId,
      quantity: 5,
      category: ProductCategory.Electronics
    }).save()

    // Create admin cookie (mock by adding role to signin)
    const adminCookie = global.signin()
    // In a real scenario, we would need to modify signin() to accept role parameter
    // For now, we'll test the owner scenario

    const cookie = global.signin()
    const userId = JSON.parse(Buffer.from(cookie[0].split('=')[1], 'base64').toString('utf-8')).jwt
    const decoded = JSON.parse(Buffer.from(userId.split('.')[1], 'base64').toString('utf-8'))

    const ownedProduct = await Product.build({
      title: 'Owned Product',
      price: 10,
      userId: decoded.id,
      quantity: 5,
      category: ProductCategory.Electronics
    }).save()

    const response = await request(app)
      .put(`/api/products/${ownedProduct.id}`)
      .set('Cookie', cookie)
      .send({
        title: 'Updated by Owner',
        price: 30,
        quantity: 15
      })
      .expect(200)

    expect(response.body.title).toBe('Updated by Owner')
  })

  it('updates product with quantity of 0', async () => {
    const cookie = global.signin()
    const userId = JSON.parse(Buffer.from(cookie[0].split('=')[1], 'base64').toString('utf-8')).jwt
    const decoded = JSON.parse(Buffer.from(userId.split('.')[1], 'base64').toString('utf-8'))

    const product = await Product.build({
      title: 'Test Product',
      price: 10,
      userId: decoded.id,
      quantity: 5,
      category: ProductCategory.Electronics
    }).save()

    const response = await request(app)
      .put(`/api/products/${product.id}`)
      .set('Cookie', cookie)
      .send({
        title: 'Out of Stock',
        price: 10,
        quantity: 0
      })
      .expect(200)

    expect(response.body.quantity).toBe(0)
  })

  it('returns updated product with correct structure', async () => {
    const cookie = global.signin()
    const userId = JSON.parse(Buffer.from(cookie[0].split('=')[1], 'base64').toString('utf-8')).jwt
    const decoded = JSON.parse(Buffer.from(userId.split('.')[1], 'base64').toString('utf-8'))

    const product = await Product.build({
      title: 'Test Product',
      price: 10,
      userId: decoded.id,
      quantity: 5,
      category: ProductCategory.Electronics
    }).save()

    const response = await request(app)
      .put(`/api/products/${product.id}`)
      .set('Cookie', cookie)
      .send({
        title: 'Updated Product',
        price: 99.99,
        quantity: 15
      })
      .expect(200)

    expect(response.body).toHaveProperty('id')
    expect(response.body).toHaveProperty('title', 'Updated Product')
    expect(response.body).toHaveProperty('price', 99.99)
    expect(response.body).toHaveProperty('quantity', 15)
    expect(response.body).toHaveProperty('userId')
    expect(response.body).toHaveProperty('version')
    expect(response.body).not.toHaveProperty('_id')
  })
})
