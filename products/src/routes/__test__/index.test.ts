import request from 'supertest'
import { app } from '../../app'
import { Product, ProductCategory } from '../../models/product'
import mongoose from 'mongoose'

describe('GET /api/products', () => {
  it('returns a list of products', async () => {
    // Create test products
    await Product.build({
      title: 'Product 1',
      price: 10,
      userId: new mongoose.Types.ObjectId().toHexString(),
      quantity: 5,
      category: ProductCategory.Electronics
    }).save()

    await Product.build({
      title: 'Product 2',
      price: 20,
      userId: new mongoose.Types.ObjectId().toHexString(),
      quantity: 10,
      category: ProductCategory.Computers
    }).save()

    const response = await request(app).get('/api/products').expect(200)

    expect(response.body.products).toHaveLength(2)
    expect(response.body.pagination).toBeDefined()
    expect(response.body.pagination.total).toBe(2)
  })

  it('returns an empty list when no products exist', async () => {
    const response = await request(app).get('/api/products').expect(200)

    expect(response.body.products).toHaveLength(0)
    expect(response.body.pagination.total).toBe(0)
  })

  it('supports pagination with page and limit', async () => {
    // Create 15 products
    for (let i = 0; i < 15; i++) {
      await Product.build({
        title: `Product ${i}`,
        price: 10 + i,
        userId: new mongoose.Types.ObjectId().toHexString(),
        quantity: 5,
        category: ProductCategory.Electronics
      }).save()
    }

    const response = await request(app)
      .get('/api/products')
      .query({ page: 2, limit: 10 })
      .expect(200)

    expect(response.body.products).toHaveLength(5)
    expect(response.body.pagination.page).toBe(2)
    expect(response.body.pagination.limit).toBe(10)
    expect(response.body.pagination.total).toBe(15)
    expect(response.body.pagination.totalPages).toBe(2)
    expect(response.body.pagination.hasNext).toBe(false)
    expect(response.body.pagination.hasPrev).toBe(true)
  })

  it('filters products by search query', async () => {
    await Product.build({
      title: 'iPhone 15 Pro',
      price: 999,
      userId: new mongoose.Types.ObjectId().toHexString(),
      quantity: 5,
      category: ProductCategory.Mobile
    }).save()

    await Product.build({
      title: 'Samsung Galaxy',
      price: 899,
      userId: new mongoose.Types.ObjectId().toHexString(),
      quantity: 10,
      category: ProductCategory.Mobile
    }).save()

    const response = await request(app)
      .get('/api/products')
      .query({ search: 'iPhone' })
      .expect(200)

    expect(response.body.products).toHaveLength(1)
    expect(response.body.products[0].title).toBe('iPhone 15 Pro')
  })

  it('filters products by category', async () => {
    await Product.build({
      title: 'Laptop',
      price: 1200,
      userId: new mongoose.Types.ObjectId().toHexString(),
      quantity: 3,
      category: ProductCategory.Computers
    }).save()

    await Product.build({
      title: 'Smartphone',
      price: 800,
      userId: new mongoose.Types.ObjectId().toHexString(),
      quantity: 5,
      category: ProductCategory.Mobile
    }).save()

    await Product.build({
      title: 'Headphones',
      price: 150,
      userId: new mongoose.Types.ObjectId().toHexString(),
      quantity: 10,
      category: ProductCategory.Audio
    }).save()

    const response = await request(app)
      .get('/api/products')
      .query({ category: ProductCategory.Mobile })
      .expect(200)

    expect(response.body.products).toHaveLength(1)
    expect(response.body.products[0].category).toBe(ProductCategory.Mobile)
  })

  it('filters products by search and category combined', async () => {
    await Product.build({
      title: 'iPhone 15',
      price: 999,
      userId: new mongoose.Types.ObjectId().toHexString(),
      quantity: 5,
      category: ProductCategory.Mobile
    }).save()

    await Product.build({
      title: 'iPhone Case',
      price: 29,
      userId: new mongoose.Types.ObjectId().toHexString(),
      quantity: 20,
      category: ProductCategory.Accessories
    }).save()

    const response = await request(app)
      .get('/api/products')
      .query({ search: 'iPhone', category: ProductCategory.Mobile })
      .expect(200)

    expect(response.body.products).toHaveLength(1)
    expect(response.body.products[0].title).toBe('iPhone 15')
    expect(response.body.products[0].category).toBe(ProductCategory.Mobile)
  })

  it('ignores invalid category values', async () => {
    await Product.build({
      title: 'Product 1',
      price: 10,
      userId: new mongoose.Types.ObjectId().toHexString(),
      quantity: 5,
      category: ProductCategory.Electronics
    }).save()

    const response = await request(app)
      .get('/api/products')
      .query({ category: 'invalid-category' })
      .expect(200)

    expect(response.body.products).toHaveLength(1)
  })

  it('returns products sorted by createdAt descending', async () => {
    const product1 = await Product.build({
      title: 'First Product',
      price: 10,
      userId: new mongoose.Types.ObjectId().toHexString(),
      quantity: 5,
      category: ProductCategory.Electronics
    }).save()

    // Wait a bit to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 10))

    const product2 = await Product.build({
      title: 'Second Product',
      price: 20,
      userId: new mongoose.Types.ObjectId().toHexString(),
      quantity: 10,
      category: ProductCategory.Computers
    }).save()

    const response = await request(app).get('/api/products').expect(200)

    expect(response.body.products).toHaveLength(2)
    expect(response.body.products[0].title).toBe('Second Product')
    expect(response.body.products[1].title).toBe('First Product')
  })

  it('uses default pagination values when not provided', async () => {
    const response = await request(app).get('/api/products').expect(200)

    expect(response.body.pagination.page).toBe(1)
    expect(response.body.pagination.limit).toBe(12)
  })
})
