import request from 'supertest'
import { app } from '../../app'
import { Product, ProductCategory } from '../../models/product'
import { kafkaWrapper } from '../../kafka-wrapper'

// Mock MinIO
jest.mock('../../config/cloudinary', () => ({
  minioClient: {
    putObject: jest.fn().mockResolvedValue(undefined)
  },
  BUCKET_NAME: 'test-bucket'
}))

describe('POST /api/products', () => {
  it('has a route handler listening to /api/products for post requests', async () => {
    const response = await request(app).post('/api/products').send({})

    expect(response.status).not.toBe(404)
  })

  it('returns 401 if user is not authenticated', async () => {
    await request(app)
      .post('/api/products')
      .send({
        title: 'Test Product',
        price: 10,
        quantity: 5,
        category: ProductCategory.Electronics
      })
      .expect(401)
  })

  it('returns 400 if title is not provided', async () => {
    await request(app)
      .post('/api/products')
      .set('Cookie', global.signin())
      .send({
        price: 10,
        quantity: 5,
        category: ProductCategory.Electronics
      })
      .expect(400)
  })

  it('returns 400 if title is empty', async () => {
    await request(app)
      .post('/api/products')
      .set('Cookie', global.signin())
      .send({
        title: '',
        price: 10,
        quantity: 5,
        category: ProductCategory.Electronics
      })
      .expect(400)
  })

  it('returns 400 if price is not provided', async () => {
    await request(app)
      .post('/api/products')
      .set('Cookie', global.signin())
      .send({
        title: 'Test Product',
        quantity: 5,
        category: ProductCategory.Electronics
      })
      .expect(400)
  })

  it('returns 400 if price is not positive', async () => {
    await request(app)
      .post('/api/products')
      .set('Cookie', global.signin())
      .send({
        title: 'Test Product',
        price: -10,
        quantity: 5,
        category: ProductCategory.Electronics
      })
      .expect(400)

    await request(app)
      .post('/api/products')
      .set('Cookie', global.signin())
      .send({
        title: 'Test Product',
        price: 0,
        quantity: 5,
        category: ProductCategory.Electronics
      })
      .expect(400)
  })

  it('returns 400 if quantity is not provided', async () => {
    await request(app)
      .post('/api/products')
      .set('Cookie', global.signin())
      .send({
        title: 'Test Product',
        price: 10,
        category: ProductCategory.Electronics
      })
      .expect(400)
  })

  it('returns 400 if quantity is negative', async () => {
    await request(app)
      .post('/api/products')
      .set('Cookie', global.signin())
      .send({
        title: 'Test Product',
        price: 10,
        quantity: -5,
        category: ProductCategory.Electronics
      })
      .expect(400)
  })

  it('returns 400 if category is not provided', async () => {
    await request(app)
      .post('/api/products')
      .set('Cookie', global.signin())
      .send({
        title: 'Test Product',
        price: 10,
        quantity: 5
      })
      .expect(400)
  })

  it('returns 400 if category is invalid', async () => {
    await request(app)
      .post('/api/products')
      .set('Cookie', global.signin())
      .send({
        title: 'Test Product',
        price: 10,
        quantity: 5,
        category: 'invalid-category'
      })
      .expect(400)
  })

  it('creates a product with valid inputs', async () => {
    let products = await Product.find({})
    expect(products).toHaveLength(0)

    const response = await request(app)
      .post('/api/products')
      .set('Cookie', global.signin())
      .send({
        title: 'Test Product',
        price: 10,
        quantity: 5,
        category: ProductCategory.Electronics
      })
      .expect(201)

    products = await Product.find({})
    expect(products).toHaveLength(1)
    expect(products[0].title).toBe('Test Product')
    expect(products[0].price).toBe(10)
    expect(products[0].quantity).toBe(5)
    expect(products[0].category).toBe(ProductCategory.Electronics)
  })

  it('publishes an event after creating a product', async () => {
    await request(app)
      .post('/api/products')
      .set('Cookie', global.signin())
      .send({
        title: 'Test Product',
        price: 10,
        quantity: 5,
        category: ProductCategory.Electronics
      })
      .expect(201)

    expect(kafkaWrapper.producer.send).toHaveBeenCalled()
  })

  it('creates product with all valid categories', async () => {
    const categories = Object.values(ProductCategory)

    for (const category of categories) {
      const response = await request(app)
        .post('/api/products')
        .set('Cookie', global.signin())
        .send({
          title: `Product ${category}`,
          price: 10,
          quantity: 5,
          category
        })
        .expect(201)

      expect(response.body.category).toBe(category)
    }

    const products = await Product.find({})
    expect(products).toHaveLength(categories.length)
  })

  it('returns the created product with correct structure', async () => {
    const response = await request(app)
      .post('/api/products')
      .set('Cookie', global.signin())
      .send({
        title: 'Test Product',
        price: 99.99,
        quantity: 10,
        category: ProductCategory.Gaming
      })
      .expect(201)

    expect(response.body).toHaveProperty('id')
    expect(response.body).toHaveProperty('title', 'Test Product')
    expect(response.body).toHaveProperty('price', 99.99)
    expect(response.body).toHaveProperty('quantity', 10)
    expect(response.body).toHaveProperty('category', ProductCategory.Gaming)
    expect(response.body).toHaveProperty('userId')
    expect(response.body).toHaveProperty('version')
    expect(response.body).not.toHaveProperty('_id')
  })

  it('allows creating product with quantity of 0', async () => {
    const response = await request(app)
      .post('/api/products')
      .set('Cookie', global.signin())
      .send({
        title: 'Out of Stock Product',
        price: 10,
        quantity: 0,
        category: ProductCategory.Electronics
      })
      .expect(201)

    expect(response.body.quantity).toBe(0)
  })

  it('assigns the userId from the authenticated user', async () => {
    const cookie = global.signin()

    const response = await request(app)
      .post('/api/products')
      .set('Cookie', cookie)
      .send({
        title: 'Test Product',
        price: 10,
        quantity: 5,
        category: ProductCategory.Electronics
      })
      .expect(201)

    expect(response.body.userId).toBeDefined()
  })

  it('sets version to 0 for newly created product', async () => {
    const response = await request(app)
      .post('/api/products')
      .set('Cookie', global.signin())
      .send({
        title: 'Test Product',
        price: 10,
        quantity: 5,
        category: ProductCategory.Electronics
      })
      .expect(201)

    expect(response.body.version).toBe(0)
  })
})
