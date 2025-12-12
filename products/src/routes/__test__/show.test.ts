import request from 'supertest'
import { app } from '../../app'
import { Product, ProductCategory } from '../../models/product'
import mongoose from 'mongoose'

describe('GET /api/products/:id', () => {
  it('returns 404 if product is not found', async () => {
    const id = new mongoose.Types.ObjectId().toHexString()

    await request(app).get(`/api/products/${id}`).expect(404)
  })

  it('returns 404 if id is not a valid MongoDB ObjectId', async () => {
    await request(app).get('/api/products/invalid-id').expect(404)
  })

  it('returns the product if product is found', async () => {
    const product = await Product.build({
      title: 'Test Product',
      price: 20,
      userId: new mongoose.Types.ObjectId().toHexString(),
      quantity: 10,
      category: ProductCategory.Electronics
    }).save()

    const response = await request(app).get(`/api/products/${product.id}`).expect(200)

    expect(response.body.title).toBe('Test Product')
    expect(response.body.price).toBe(20)
    expect(response.body.quantity).toBe(10)
    expect(response.body.category).toBe(ProductCategory.Electronics)
  })

  it('returns product with correct structure', async () => {
    const product = await Product.build({
      title: 'Detailed Product',
      price: 99.99,
      userId: new mongoose.Types.ObjectId().toHexString(),
      quantity: 5,
      category: ProductCategory.Computers,
      imageUrl: 'https://example.com/image.jpg'
    }).save()

    const response = await request(app).get(`/api/products/${product.id}`).expect(200)

    expect(response.body).toHaveProperty('id')
    expect(response.body).toHaveProperty('title', 'Detailed Product')
    expect(response.body).toHaveProperty('price', 99.99)
    expect(response.body).toHaveProperty('quantity', 5)
    expect(response.body).toHaveProperty('category', ProductCategory.Computers)
    expect(response.body).toHaveProperty('imageUrl', 'https://example.com/image.jpg')
    expect(response.body).toHaveProperty('userId')
    expect(response.body).toHaveProperty('version')
    expect(response.body).not.toHaveProperty('_id')
    expect(response.body).not.toHaveProperty('__v')
  })

  it('can fetch product without authentication', async () => {
    const product = await Product.build({
      title: 'Public Product',
      price: 50,
      userId: new mongoose.Types.ObjectId().toHexString(),
      quantity: 15,
      category: ProductCategory.Mobile
    }).save()

    // No cookie/auth header provided
    const response = await request(app).get(`/api/products/${product.id}`).expect(200)

    expect(response.body.title).toBe('Public Product')
  })

  it('returns product with imageUrl if present', async () => {
    const product = await Product.build({
      title: 'Product with Image',
      price: 100,
      userId: new mongoose.Types.ObjectId().toHexString(),
      quantity: 5,
      category: ProductCategory.Gaming,
      imageUrl: 'https://minio.local/products/image123.jpg'
    }).save()

    const response = await request(app).get(`/api/products/${product.id}`).expect(200)

    expect(response.body.imageUrl).toBe('https://minio.local/products/image123.jpg')
  })

  it('returns product without imageUrl if not present', async () => {
    const product = await Product.build({
      title: 'Product without Image',
      price: 50,
      userId: new mongoose.Types.ObjectId().toHexString(),
      quantity: 5,
      category: ProductCategory.Accessories
    }).save()

    const response = await request(app).get(`/api/products/${product.id}`).expect(200)

    expect(response.body.imageUrl).toBeUndefined()
  })

  it('returns product with correct version', async () => {
    const product = await Product.build({
      title: 'Versioned Product',
      price: 25,
      userId: new mongoose.Types.ObjectId().toHexString(),
      quantity: 3,
      category: ProductCategory.Audio
    }).save()

    const response = await request(app).get(`/api/products/${product.id}`).expect(200)

    expect(response.body.version).toBe(0)
  })

  it('returns different products when different ids are provided', async () => {
    const product1 = await Product.build({
      title: 'Product 1',
      price: 10,
      userId: new mongoose.Types.ObjectId().toHexString(),
      quantity: 5,
      category: ProductCategory.Electronics
    }).save()

    const product2 = await Product.build({
      title: 'Product 2',
      price: 20,
      userId: new mongoose.Types.ObjectId().toHexString(),
      quantity: 10,
      category: ProductCategory.Computers
    }).save()

    const response1 = await request(app).get(`/api/products/${product1.id}`).expect(200)
    const response2 = await request(app).get(`/api/products/${product2.id}`).expect(200)

    expect(response1.body.title).toBe('Product 1')
    expect(response1.body.price).toBe(10)

    expect(response2.body.title).toBe('Product 2')
    expect(response2.body.price).toBe(20)
  })
})
