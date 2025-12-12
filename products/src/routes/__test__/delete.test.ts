import request from 'supertest'
import { app } from '../../app'
import { Product, ProductCategory } from '../../models/product'
import mongoose from 'mongoose'

describe('DELETE /api/products/:id', () => {
  it('returns 401 if user is not authenticated', async () => {
    const id = new mongoose.Types.ObjectId().toHexString()

    await request(app).delete(`/api/products/${id}`).expect(401)
  })

  it('returns 404 if product does not exist', async () => {
    const id = new mongoose.Types.ObjectId().toHexString()

    await request(app)
      .delete(`/api/products/${id}`)
      .set('Cookie', global.signin())
      .expect(404)
  })

  it('returns 404 if id is not a valid MongoDB ObjectId', async () => {
    await request(app)
      .delete('/api/products/invalid-id')
      .set('Cookie', global.signin())
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
      .delete(`/api/products/${product.id}`)
      .set('Cookie', global.signin())
      .expect(401)
  })

  it('deletes the product if user owns it', async () => {
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
      .delete(`/api/products/${product.id}`)
      .set('Cookie', cookie)
      .expect(204)

    const deletedProduct = await Product.findById(product.id)
    expect(deletedProduct).toBeNull()
  })

  it('returns 204 status code on successful deletion', async () => {
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
      .delete(`/api/products/${product.id}`)
      .set('Cookie', cookie)
      .expect(204)

    expect(response.body).toEqual({})
  })

  it('removes product from database', async () => {
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

    let products = await Product.find({})
    expect(products).toHaveLength(1)

    await request(app)
      .delete(`/api/products/${product.id}`)
      .set('Cookie', cookie)
      .expect(204)

    products = await Product.find({})
    expect(products).toHaveLength(0)
  })

  it('allows admin to delete any product', async () => {
    // Create product with user A
    const userAId = new mongoose.Types.ObjectId().toHexString()
    const product = await Product.build({
      title: 'User A Product',
      price: 10,
      userId: userAId,
      quantity: 5,
      category: ProductCategory.Electronics
    }).save()

    // Test owner deletion
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

    await request(app)
      .delete(`/api/products/${ownedProduct.id}`)
      .set('Cookie', cookie)
      .expect(204)

    const deletedProduct = await Product.findById(ownedProduct.id)
    expect(deletedProduct).toBeNull()
  })

  it('can delete product with image', async () => {
    const cookie = global.signin()
    const userId = JSON.parse(Buffer.from(cookie[0].split('=')[1], 'base64').toString('utf-8')).jwt
    const decoded = JSON.parse(Buffer.from(userId.split('.')[1], 'base64').toString('utf-8'))

    const product = await Product.build({
      title: 'Product with Image',
      price: 100,
      userId: decoded.id,
      quantity: 5,
      category: ProductCategory.Gaming,
      imageUrl: 'https://minio.local/products/image123.jpg'
    }).save()

    await request(app)
      .delete(`/api/products/${product.id}`)
      .set('Cookie', cookie)
      .expect(204)

    const deletedProduct = await Product.findById(product.id)
    expect(deletedProduct).toBeNull()
  })

  it('deletes only the specified product', async () => {
    const cookie = global.signin()
    const userId = JSON.parse(Buffer.from(cookie[0].split('=')[1], 'base64').toString('utf-8')).jwt
    const decoded = JSON.parse(Buffer.from(userId.split('.')[1], 'base64').toString('utf-8'))

    const product1 = await Product.build({
      title: 'Product 1',
      price: 10,
      userId: decoded.id,
      quantity: 5,
      category: ProductCategory.Electronics
    }).save()

    const product2 = await Product.build({
      title: 'Product 2',
      price: 20,
      userId: decoded.id,
      quantity: 10,
      category: ProductCategory.Computers
    }).save()

    const product3 = await Product.build({
      title: 'Product 3',
      price: 30,
      userId: decoded.id,
      quantity: 15,
      category: ProductCategory.Mobile
    }).save()

    let products = await Product.find({})
    expect(products).toHaveLength(3)

    await request(app)
      .delete(`/api/products/${product2.id}`)
      .set('Cookie', cookie)
      .expect(204)

    products = await Product.find({})
    expect(products).toHaveLength(2)

    const remaining1 = await Product.findById(product1.id)
    const deleted = await Product.findById(product2.id)
    const remaining3 = await Product.findById(product3.id)

    expect(remaining1).not.toBeNull()
    expect(deleted).toBeNull()
    expect(remaining3).not.toBeNull()
  })

  it('cannot delete the same product twice', async () => {
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
      .delete(`/api/products/${product.id}`)
      .set('Cookie', cookie)
      .expect(204)

    await request(app)
      .delete(`/api/products/${product.id}`)
      .set('Cookie', cookie)
      .expect(404)
  })
})
