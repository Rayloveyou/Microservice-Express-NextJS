import request from 'supertest'
import { app } from '../../app'

const createProduct = (title: string, price: number, quantity: number) => {
  return request(app).post('/api/products').set('Cookie', global.signin()).send({
    title: title,
    price: price,
    quantity: quantity
  })
}

it('can fetch a list of products', async () => {
  await createProduct('Ticket 1', 20, 10)
  await createProduct('Ticket 2', 30, 5)
  await createProduct('Ticket 3', 40, 2)

  await request(app)
  const response = await request(app).get('/api/products').send().expect(200)

  expect(response.body.length).toEqual(3)
})
