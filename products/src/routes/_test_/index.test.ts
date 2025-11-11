import request from 'supertest'
import { app } from '../../app'

const createProduct = (title: string, price: number) => {
    return request(app)
        .post('/api/products')
        .set('Cookie', global.signin())
        .send({
            title: title,
            price: price
        })
}

it('can fetch a list of products', async () => {
    
    await createProduct('Ticket 1', 20)
    await createProduct('Ticket 2', 30)
    await createProduct('Ticket 3', 40)

    await request(app)
    const response = await request(app)
        .get('/api/products')
        .send()
        .expect(200)

    expect(response.body.length).toEqual(3)
})
