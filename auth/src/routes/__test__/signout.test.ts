import request from 'supertest'
import { app } from '../../app'

it('clears the cookie after signing out', async () => {
    // First, sign up to set the cookie
    await request(app)
        .post('/api/users/signup')
        .send({
            email: 'testemail@example.com',
            password: 'password123'
        })
        .expect(201)
    
    // Then, sign out
    const response = await request(app)
        .post('/api/users/signout')
        .send({})
        .expect(200)
    // Check that the cookie is cleared
    expect(response.get('Set-Cookie')?.[0]).toEqual('session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; httponly')
})