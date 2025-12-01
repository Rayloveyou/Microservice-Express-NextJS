import request from 'supertest'
import { app } from '../../app'
import { sign } from 'jsonwebtoken'

it('responds with details about the current user', async () => {
  // First, sign up to get the cookie
  const cookie = await global.signup()

  // Then, get the current user
  const response = await request(app)
    .get('/api/users/currentuser')
    .set('Cookie', cookie || []) // Set the cookie from the signup response , if it exists
    .send({})
    .expect(200)

  expect(response.body.currentUser.email).toEqual('testemail@example.com') // Verify the email matches the signed-up user
})

it('responds with null if not authenticated', async () => {
  const response = await request(app).get('/api/users/currentuser').send({}).expect(401) // Expect 401 Unauthorized when no cookie is provided
})
