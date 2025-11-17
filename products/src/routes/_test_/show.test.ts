import request from 'supertest'
import { app } from '../../app'
import { Product } from '../../models/product'


it('return a 404 if the product is not found', async () => {
    const response = await request(app)
        .get('/api/products/nonexistentid')
        .send()
        .expect(404)
})

it('returns the product if found', async () => {

    const title = 'Test Product'
    const price = 100
    const quantity = 10
    // Tạo product trước
    const createResponse = await request(app)
        .post('/api/products')
        .set('Cookie', global.signin())
        .send({
            title: title,
            price: price,
            quantity: quantity
        })
        .expect(201)

    const productId = createResponse.body.id

    // Lấy product vừa tạo
    const getResponse = await request(app)
        .get(`/api/products/${productId}`)
        .send()
        .expect(200)

    expect(getResponse.body.title).toEqual(title)
    expect(getResponse.body.price).toEqual(price)
    expect(getResponse.body.quantity).toEqual(quantity)
})