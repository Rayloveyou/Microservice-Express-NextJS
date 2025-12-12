import request from 'supertest'
import { app } from '../../app'
import { Product, ProductCategory } from '../../models/product'
import mongoose from 'mongoose'

describe('POST /api/products/reserve', () => {
  it('returns 400 if items array is not provided', async () => {
    await request(app).post('/api/products/reserve').send({}).expect(400)
  })

  it('returns 400 if items array is empty', async () => {
    await request(app)
      .post('/api/products/reserve')
      .send({
        items: []
      })
      .expect(400)
  })

  it('returns 400 if items array contains invalid payload', async () => {
    await request(app)
      .post('/api/products/reserve')
      .send({
        items: [{ productId: 'invalid' }]
      })
      .expect(400)
  })

  it('returns 400 if quantity is not positive', async () => {
    const productId = new mongoose.Types.ObjectId().toHexString()

    await request(app)
      .post('/api/products/reserve')
      .send({
        items: [{ productId, quantity: 0 }]
      })
      .expect(400)

    await request(app)
      .post('/api/products/reserve')
      .send({
        items: [{ productId, quantity: -5 }]
      })
      .expect(400)
  })

  it('returns 400 if productId is missing', async () => {
    await request(app)
      .post('/api/products/reserve')
      .send({
        items: [{ quantity: 5 }]
      })
      .expect(400)
  })

  it('returns 400 if not enough stock for a product', async () => {
    const product = await Product.build({
      title: 'Test Product',
      price: 10,
      userId: new mongoose.Types.ObjectId().toHexString(),
      quantity: 5,
      category: ProductCategory.Electronics
    }).save()

    await request(app)
      .post('/api/products/reserve')
      .send({
        items: [{ productId: product.id, quantity: 10 }]
      })
      .expect(400)

    const updatedProduct = await Product.findById(product.id)
    expect(updatedProduct!.quantity).toBe(5)
  })

  it('successfully reserves stock for a single product', async () => {
    const product = await Product.build({
      title: 'Test Product',
      price: 10,
      userId: new mongoose.Types.ObjectId().toHexString(),
      quantity: 10,
      category: ProductCategory.Electronics
    }).save()

    await request(app)
      .post('/api/products/reserve')
      .send({
        items: [{ productId: product.id, quantity: 3 }]
      })
      .expect(204)

    const updatedProduct = await Product.findById(product.id)
    expect(updatedProduct!.quantity).toBe(7)
  })

  it('successfully reserves stock for multiple products', async () => {
    const product1 = await Product.build({
      title: 'Product 1',
      price: 10,
      userId: new mongoose.Types.ObjectId().toHexString(),
      quantity: 10,
      category: ProductCategory.Electronics
    }).save()

    const product2 = await Product.build({
      title: 'Product 2',
      price: 20,
      userId: new mongoose.Types.ObjectId().toHexString(),
      quantity: 15,
      category: ProductCategory.Computers
    }).save()

    await request(app)
      .post('/api/products/reserve')
      .send({
        items: [
          { productId: product1.id, quantity: 3 },
          { productId: product2.id, quantity: 5 }
        ]
      })
      .expect(204)

    const updatedProduct1 = await Product.findById(product1.id)
    const updatedProduct2 = await Product.findById(product2.id)

    expect(updatedProduct1!.quantity).toBe(7)
    expect(updatedProduct2!.quantity).toBe(10)
  })

  it('rolls back all reservations if one product has insufficient stock', async () => {
    const product1 = await Product.build({
      title: 'Product 1',
      price: 10,
      userId: new mongoose.Types.ObjectId().toHexString(),
      quantity: 10,
      category: ProductCategory.Electronics
    }).save()

    const product2 = await Product.build({
      title: 'Product 2',
      price: 20,
      userId: new mongoose.Types.ObjectId().toHexString(),
      quantity: 5,
      category: ProductCategory.Computers
    }).save()

    await request(app)
      .post('/api/products/reserve')
      .send({
        items: [
          { productId: product1.id, quantity: 5 },
          { productId: product2.id, quantity: 10 } // This should fail
        ]
      })
      .expect(400)

    const updatedProduct1 = await Product.findById(product1.id)
    const updatedProduct2 = await Product.findById(product2.id)

    // Both should remain unchanged due to rollback
    expect(updatedProduct1!.quantity).toBe(10)
    expect(updatedProduct2!.quantity).toBe(5)
  })

  it('reserves exact stock available', async () => {
    const product = await Product.build({
      title: 'Test Product',
      price: 10,
      userId: new mongoose.Types.ObjectId().toHexString(),
      quantity: 5,
      category: ProductCategory.Electronics
    }).save()

    await request(app)
      .post('/api/products/reserve')
      .send({
        items: [{ productId: product.id, quantity: 5 }]
      })
      .expect(204)

    const updatedProduct = await Product.findById(product.id)
    expect(updatedProduct!.quantity).toBe(0)
  })

  it('returns 400 if product does not exist', async () => {
    const nonExistentId = new mongoose.Types.ObjectId().toHexString()

    await request(app)
      .post('/api/products/reserve')
      .send({
        items: [{ productId: nonExistentId, quantity: 5 }]
      })
      .expect(400)
  })

  it('handles multiple reservations of the same product correctly', async () => {
    const product = await Product.build({
      title: 'Test Product',
      price: 10,
      userId: new mongoose.Types.ObjectId().toHexString(),
      quantity: 20,
      category: ProductCategory.Electronics
    }).save()

    await request(app)
      .post('/api/products/reserve')
      .send({
        items: [
          { productId: product.id, quantity: 3 },
          { productId: product.id, quantity: 5 }
        ]
      })
      .expect(204)

    const updatedProduct = await Product.findById(product.id)
    expect(updatedProduct!.quantity).toBe(12)
  })

  it('rolls back properly when second product of same type fails', async () => {
    const product = await Product.build({
      title: 'Test Product',
      price: 10,
      userId: new mongoose.Types.ObjectId().toHexString(),
      quantity: 10,
      category: ProductCategory.Electronics
    }).save()

    await request(app)
      .post('/api/products/reserve')
      .send({
        items: [
          { productId: product.id, quantity: 8 },
          { productId: product.id, quantity: 5 } // Total 13 > 10 available
        ]
      })
      .expect(400)

    const updatedProduct = await Product.findById(product.id)
    expect(updatedProduct!.quantity).toBe(10)
  })

  it('returns 400 with appropriate error message for insufficient stock', async () => {
    const product = await Product.build({
      title: 'Test Product',
      price: 10,
      userId: new mongoose.Types.ObjectId().toHexString(),
      quantity: 5,
      category: ProductCategory.Electronics
    }).save()

    const response = await request(app)
      .post('/api/products/reserve')
      .send({
        items: [{ productId: product.id, quantity: 10 }]
      })
      .expect(400)

    expect(response.body.errors).toBeDefined()
    expect(response.body.errors[0].message).toBe('Not enough stock for one or more products')
  })

  it('returns 400 with appropriate error message for invalid payload', async () => {
    const response = await request(app)
      .post('/api/products/reserve')
      .send({
        items: [{ productId: 'invalid' }]
      })
      .expect(400)

    expect(response.body.errors).toBeDefined()
    expect(response.body.errors[0].message).toBe('Invalid item payload')
  })

  it('does not require authentication for internal endpoint', async () => {
    const product = await Product.build({
      title: 'Test Product',
      price: 10,
      userId: new mongoose.Types.ObjectId().toHexString(),
      quantity: 10,
      category: ProductCategory.Electronics
    }).save()

    // No authentication cookie provided
    await request(app)
      .post('/api/products/reserve')
      .send({
        items: [{ productId: product.id, quantity: 3 }]
      })
      .expect(204)

    const updatedProduct = await Product.findById(product.id)
    expect(updatedProduct!.quantity).toBe(7)
  })
})
