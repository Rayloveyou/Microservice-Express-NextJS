import request from 'supertest'
import { app } from '../../app'

// Test case: Successful signup returns 201
it('returns a 201 on successful signup', async () => {
  return request(app)
    .post('/api/users/signup')
    .send({
      email: 'testemail@example.com',
      password: 'password123'
    })
    .expect(201)
})

it('returns a 400 with an invalid email', async () => {
  return request(app)
    .post('/api/users/signup')
    .send({
      email: 'invalidemail', // invalid email format
      password: 'password123'
    })
    .expect(400)
})

it('returns a 400 with an invalid password', async () => {
  return request(app)
    .post('/api/users/signup')
    .send({
      email: 'testemail@example.com',
      password: 'p' // invalid password format
    })
    .expect(400)
})

it('returns a 400 with missing email and password', async () => {
  await request(app)
    .post('/api/users/signup')
    .send({
      email: '',
      password: ''
    })
    .expect(400)
})

it('disallows duplicate emails', async () => {
  await request(app)
    .post('/api/users/signup')
    .send({
      email: 'testemail@example.com',
      password: 'password123'
    })
    .expect(201)

  await request(app)
    .post('/api/users/signup')
    .send({
      email: 'testemail@example.com',
      password: 'password123'
    })
    .expect(400)
})

it('sets a cookie after successful signup', async () => {
  const response = await request(app)
    .post('/api/users/signup')
    .send({
      email: 'testemail@example.com',
      password: 'password123'
    })
    .expect(201)

  expect(response.get('Set-Cookie')).toBeDefined()
})
