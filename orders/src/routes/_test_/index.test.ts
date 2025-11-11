import request from 'supertest'
import { app } from '../../app'
import { natsWrapper } from '../../nats-wrapper'
import { Order, OrderStatus} from '../../models/order'
import { Product } from '../../models/product'
import mongoose from 'mongoose'


const buildTicket = async (number: number) => {
    const product = Product.build({
        id: new mongoose.Types.ObjectId().toHexString(),
        title: `Test Product ${number}`,
        price: 100
    })
    await product.save()
    return product
}

it('fetches the orders for a particular user', async () => {
    // Create 3 products
    const product1 = await buildTicket(1)
    const product2 = await buildTicket(2)
    const product3 = await buildTicket(3)

    const user1Cookie = global.signin()
    const user2Cookie = global.signin()

    // Create one order as User #1
    await request(app)
        .post('/api/orders')
        .set('Cookie', user1Cookie)
        .send({
            productId: product1.id
        })
        .expect(201)

    // Create two orders as User #2
    const { body: order1 } = await request(app)
        .post('/api/orders')
        .set('Cookie', user2Cookie)
        .send({
            productId: product2.id
        })
        .expect(201)
    const { body: order2 } = await request(app)
        .post('/api/orders')
        .set('Cookie', user2Cookie)
        .send({
            productId: product3.id
        })
        .expect(201)

    // Make request to get orders for User #2 (DÙNG CÙNG COOKIE!)
    const response = await request(app)
        .get('/api/orders')
        .set('Cookie', user2Cookie)
        .expect(200)

    expect(response.body.length).toEqual(2)
    expect(response.body[0].id).toEqual(order1.id)
    expect(response.body[1].id).toEqual(order2.id)
})