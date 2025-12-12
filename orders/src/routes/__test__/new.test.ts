import request from 'supertest'
import { app } from '../../app'
import { Order } from '../../models/order'
import { Product } from '../../models/product'
import { OrderStatus } from '@datnxecommerce/common'
import mongoose from 'mongoose'
import { kafkaWrapper } from '../../kafka-wrapper'

// Mock kafkaWrapper
jest.mock('../../kafka-wrapper')

describe('POST /api/orders', () => {
  it('returns 401 if user is not authenticated', async () => {
    await request(app)
      .post('/api/orders')
      .send({
        items: [{ productId: new mongoose.Types.ObjectId().toHexString(), quantity: 1 }]
      })
      .expect(401)
  })

  it('returns 400 if items array is empty', async () => {
    await request(app)
      .post('/api/orders')
      .set('Cookie', global.signin())
      .send({ items: [] })
      .expect(400)
  })

  it('returns 400 if items array is missing', async () => {
    await request(app)
      .post('/api/orders')
      .set('Cookie', global.signin())
      .send({})
      .expect(400)
  })

  it('returns 400 if productId is invalid', async () => {
    await request(app)
      .post('/api/orders')
      .set('Cookie', global.signin())
      .send({
        items: [{ productId: 'invalid-id', quantity: 1 }]
      })
      .expect(400)
  })

  it('returns 400 if quantity is less than 1', async () => {
    const productId = new mongoose.Types.ObjectId().toHexString()

    await request(app)
      .post('/api/orders')
      .set('Cookie', global.signin())
      .send({
        items: [{ productId, quantity: 0 }]
      })
      .expect(400)

    await request(app)
      .post('/api/orders')
      .set('Cookie', global.signin())
      .send({
        items: [{ productId, quantity: -1 }]
      })
      .expect(400)
  })

  it('returns 400 if quantity is not an integer', async () => {
    const productId = new mongoose.Types.ObjectId().toHexString()

    await request(app)
      .post('/api/orders')
      .set('Cookie', global.signin())
      .send({
        items: [{ productId, quantity: 1.5 }]
      })
      .expect(400)
  })

  it('returns 404 if product does not exist', async () => {
    const productId = new mongoose.Types.ObjectId().toHexString()

    await request(app)
      .post('/api/orders')
      .set('Cookie', global.signin())
      .send({
        items: [{ productId, quantity: 1 }]
      })
      .expect(404)
  })

  it('returns 400 if product does not have enough stock', async () => {
    const product = Product.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'Low Stock Product',
      price: 100,
      quantity: 5
    })
    await product.save()

    await request(app)
      .post('/api/orders')
      .set('Cookie', global.signin())
      .send({
        items: [{ productId: product.id, quantity: 10 }]
      })
      .expect(400)
  })

  it('creates an order successfully with valid data', async () => {
    const product = Product.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'Valid Product',
      price: 200,
      quantity: 20
    })
    await product.save()

    const response = await request(app)
      .post('/api/orders')
      .set('Cookie', global.signin())
      .send({
        items: [{ productId: product.id, quantity: 2 }]
      })
      .expect(201)

    expect(response.body.id).toBeDefined()
    expect(response.body.status).toEqual(OrderStatus.Created)
    expect(response.body.items).toHaveLength(1)
    expect(response.body.items[0].quantity).toEqual(2)
    expect(response.body.items[0].priceSnapshot).toEqual(200)
    expect(response.body.items[0].titleSnapshot).toEqual('Valid Product')
    expect(response.body.total).toEqual(400)
  })

  it('saves order to database', async () => {
    const product = Product.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'DB Product',
      price: 150,
      quantity: 15
    })
    await product.save()

    const ordersBefore = await Order.find({})
    expect(ordersBefore.length).toEqual(0)

    await request(app)
      .post('/api/orders')
      .set('Cookie', global.signin())
      .send({
        items: [{ productId: product.id, quantity: 1 }]
      })
      .expect(201)

    const ordersAfter = await Order.find({})
    expect(ordersAfter.length).toEqual(1)
    expect(ordersAfter[0].total).toEqual(150)
  })

  it('creates order with multiple items', async () => {
    const product1 = Product.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'Product 1',
      price: 100,
      quantity: 10
    })
    await product1.save()

    const product2 = Product.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'Product 2',
      price: 50,
      quantity: 20
    })
    await product2.save()

    const response = await request(app)
      .post('/api/orders')
      .set('Cookie', global.signin())
      .send({
        items: [
          { productId: product1.id, quantity: 2 },
          { productId: product2.id, quantity: 3 }
        ]
      })
      .expect(201)

    expect(response.body.items).toHaveLength(2)
    expect(response.body.total).toEqual(350) // (100*2) + (50*3)
  })

  it('publishes an order created event to Kafka', async () => {
    const product = Product.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'Event Product',
      price: 75,
      quantity: 30
    })
    await product.save()

    await request(app)
      .post('/api/orders')
      .set('Cookie', global.signin())
      .send({
        items: [{ productId: product.id, quantity: 1 }]
      })
      .expect(201)

    // Verify Kafka producer was called
    expect(kafkaWrapper.producer.send).toHaveBeenCalled()
  })

  it('calculates total correctly for order', async () => {
    const product = Product.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'Calculation Product',
      price: 99.99,
      quantity: 100
    })
    await product.save()

    const response = await request(app)
      .post('/api/orders')
      .set('Cookie', global.signin())
      .send({
        items: [{ productId: product.id, quantity: 3 }]
      })
      .expect(201)

    expect(response.body.total).toBeCloseTo(299.97, 2)
  })

  it('stores product snapshot at order creation time', async () => {
    const product = Product.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'Original Title',
      price: 100,
      quantity: 50
    })
    await product.save()

    const response = await request(app)
      .post('/api/orders')
      .set('Cookie', global.signin())
      .send({
        items: [{ productId: product.id, quantity: 1 }]
      })
      .expect(201)

    // Update product after order creation
    product.set({ title: 'Updated Title', price: 200 })
    await product.save()

    // Order should still have original snapshot
    const order = await Order.findById(response.body.id)
    expect(order!.items[0].titleSnapshot).toEqual('Original Title')
    expect(order!.items[0].priceSnapshot).toEqual(100)
  })

  it('returns 400 when one of multiple products is out of stock', async () => {
    const product1 = Product.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'In Stock',
      price: 100,
      quantity: 10
    })
    await product1.save()

    const product2 = Product.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'Out of Stock',
      price: 50,
      quantity: 2
    })
    await product2.save()

    await request(app)
      .post('/api/orders')
      .set('Cookie', global.signin())
      .send({
        items: [
          { productId: product1.id, quantity: 5 },
          { productId: product2.id, quantity: 5 } // Exceeds stock
        ]
      })
      .expect(400)

    // No order should be created
    const orders = await Order.find({})
    expect(orders.length).toEqual(0)
  })

  it('assigns userId to order from current user', async () => {
    const product = Product.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'User Product',
      price: 120,
      quantity: 25
    })
    await product.save()

    const response = await request(app)
      .post('/api/orders')
      .set('Cookie', global.signin())
      .send({
        items: [{ productId: product.id, quantity: 1 }]
      })
      .expect(201)

    expect(response.body.userId).toBeDefined()
  })

  it('sets order status to Created initially', async () => {
    const product = Product.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'Status Product',
      price: 80,
      quantity: 40
    })
    await product.save()

    const response = await request(app)
      .post('/api/orders')
      .set('Cookie', global.signin())
      .send({
        items: [{ productId: product.id, quantity: 1 }]
      })
      .expect(201)

    expect(response.body.status).toEqual(OrderStatus.Created)
  })
})
