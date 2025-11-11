import request from 'supertest'
import { app } from '../../app'
import { natsWrapper } from '../../nats-wrapper'
import { Order, OrderStatus} from '../../models/order'
import { Product } from '../../models/product'
import mongoose from 'mongoose'


it('return an error if product does not exist', async () => {
    const productId = new mongoose.Types.ObjectId()
    await request(app)
        .post('/api/orders')
        .set('Cookie', global.signin())
        .send({
            productId
        })
        .expect(404)
})

it('return an error if product is already reserved', async () => {

    // create a product
    const product = Product.build({
        id: new mongoose.Types.ObjectId().toHexString(),
        title: 'Test Product',
        price: 100
    })
    await product.save()

    // create an order
    const order = Order.build({
        userId: new mongoose.Types.ObjectId().toHexString(),
        status: OrderStatus.Created,
        expiresAt: new Date(),
        product
    })
    await order.save()

    // make a request to build an order which should fail
    await request(app)
        .post('/api/orders')
        .set('Cookie', global.signin())
        .send({
            productId: product.id
        })
        .expect(400)
})

it('reserve a product', async () => {
    const product = Product.build({
        id: new mongoose.Types.ObjectId().toHexString(),
        title: 'Test Product',
        price: 100
    })
    await product.save()

    await request(app)
        .post('/api/orders')
        .set('Cookie', global.signin())
        .send({
            productId: product.id
        })
        .expect(201)
})

it('emit an order created event', async () => {
    const product = Product.build({
        id: new mongoose.Types.ObjectId().toHexString(),
        title: 'Test Product',
        price: 100
    })
    await product.save()

    await request(app)
        .post('/api/orders')
        .set('Cookie', global.signin())
        .send({
            productId: product.id
        })
        .expect(201)

    expect(natsWrapper.client.publish).toHaveBeenCalled()
})


