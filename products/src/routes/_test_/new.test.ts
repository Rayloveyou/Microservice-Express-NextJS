import request from 'supertest'
import { app } from '../../app'
import { Product } from '../../models/product'
import { natsWrapper } from '../../nats-wrapper'

it('has a route handler listening to /api/products for post requests', async () => {
  const response = await request(app).post('/api/products').send({})

  expect(response.status).not.toEqual(404)
})

it('can only be accessed if the user is signed in', async () => {
  await request(app).post('/api/products').send({}).expect(401)
})

it('returns a status other than 401 if the user is signed in', async () => {
  const response = await request(app)
    .post('/api/products')
    .set('Cookie', global.signin()) // giả lập user đã signin
    .send({})

  expect(response.status).not.toEqual(401)
})

it('returns an error if an invalid title is provided', async () => {
  await request(app)
    .post('/api/products')
    .set('Cookie', global.signin())
    .send({
      title: '',
      price: 10,
      quantity: 5
    })
    .expect(400)
})

it('returns an error if an invalid price is provided', async () => {
  await request(app)
    .post('/api/products')
    .set('Cookie', global.signin())
    .send({
      title: 'Valid Title',
      price: -10,
      quantity: 5
    })
    .expect(400)
})

it('creates a product with valid inputs', async () => {
  // Add in a check to make sure a product was saved
  let products = await Product.find({}) // Truy vấn tất cả products trong DB
  expect(products.length).toEqual(0) // Đảm bảo chưa có product nào trong DB

  await request(app)
    .post('/api/products')
    .set('Cookie', global.signin())
    .send({
      title: 'Valid Title',
      price: 20,
      quantity: 10
    })
    .expect(201)

  products = await Product.find({}) // Truy vấn lại products trong DB
  expect(products.length).toEqual(1) // Đảm bảo đã có 1 product được tạo
  expect(products[0]!.title).toEqual('Valid Title') // Kiểm tra title của product vừa tạo
  expect(products[0]!.price).toEqual(20) // Kiểm tra giá trị price của product vừa tạo
  expect(products[0]!.quantity).toEqual(10) // Kiểm tra số lượng của product vừa tạo
})

it('returns the created product in the response body', async () => {
  const title = 'Product From Response'
  const price = 55
  const quantity = 15

  const response = await request(app)
    .post('/api/products')
    .set('Cookie', global.signin())
    .send({ title, price, quantity })
    .expect(201)

  expect(response.body).toBeDefined()
  expect(response.body.id).toBeDefined()
  expect(response.body.title).toEqual(title)
  expect(response.body.price).toEqual(price)
  expect(response.body.quantity).toEqual(quantity)
  expect(response.body.userId).toBeDefined()
})

it('publishes an event', async () => {
  const title = 'Product From Response'
  const price = 55
  const quantity = 20

  await request(app)
    .post('/api/products')
    .set('Cookie', global.signin())
    .send({ title, price, quantity })
    .expect(201)

  expect(natsWrapper.client.publish).toHaveBeenCalled()
})
