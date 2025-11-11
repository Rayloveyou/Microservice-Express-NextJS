import request from 'supertest'
import { app } from '../../app'
import mongoose from 'mongoose'
import { natsWrapper } from '../../nats-wrapper'

it('returns a 404 if not found', async () => {

    // Tạo 1 id random
    const id = new mongoose.Types.ObjectId().toHexString()
    
    await request(app)
        .put(`/api/products/${id}`)
        .set('Cookie', global.signin())
        .send({
            title: 'Test Product',
            price: 100
        })
        .expect(404)
})

it('returns a 401 if the user is not authenticated', async () => {
    const id = new mongoose.Types.ObjectId().toHexString()
    await request(app)
        .put(`/api/products/${id}`)
        .send({
            title: 'Test Product',
            price: 100
        })
        .expect(401)
})

it('returns 401 if user does not own the product', async () => {
    const response =  await request(app)
        .post('/api/products')
        .set('Cookie', global.signin())
        .send({
            title: 'Test Product',
            price: 100
        })

    await request(app)
        .put(`/api/products/${response.body.id}`)
        .set('Cookie', global.signin())
        .send({
            title: 'Test Product updated',
            price: 1000
        })
        .expect(401)
})

it('returns a 400 if the user provides an invalid title or price', async () => {
    const cookie = global.signin() 
    const response =  await request(app)
        .post('/api/products')
        .set('Cookie',cookie )
        .send({
            title: 'Test Product',
            price: 100
        })

    await request(app)
        .put(`/api/products/${response.body.id}`)
        .set('Cookie', cookie)
        .send({
            title: '',
            price: 1000
        })
        .expect(400)

    await request(app)
        .put(`/api/products/${response.body.id}`)
        .set('Cookie', cookie)
        .send({
            title: '',
            price: -1000
        })
        .expect(400)
})

it('updates the product provided valid inputs', async () => {
    const cookie = global.signin() 
    const response =  await request(app)
        .post('/api/products')
        .set('Cookie',cookie )
        .send({
            title: 'Test Product',
            price: 100
        })

    await request(app)
        .put(`/api/products/${response.body.id}`)
        .set('Cookie', cookie)
        .send({
            title: 'Test Product updated',
            price: 1000
        })
        .expect(200)

    const productResponse = await request(app)
        .get(`/api/products/${response.body.id}`)
        .send()
        .expect(200)

    expect(productResponse.body.title).toEqual('Test Product updated')
    expect(productResponse.body.price).toEqual(1000)
})

it('publishes an event', async () => {
    const cookie = global.signin() 
    const response =  await request(app)
        .post('/api/products')
        .set('Cookie',cookie )
        .send({
            title: 'Test Product',
            price: 100
        })

    await request(app)
        .put(`/api/products/${response.body.id}`)
        .set('Cookie', cookie)
        .send({
            title: 'Test Product updated',
            price: 1000
        })
        .expect(200)

    expect(natsWrapper.client.publish).toHaveBeenCalled()
})