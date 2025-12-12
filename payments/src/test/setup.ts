import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { app } from '../app'
import request from 'supertest'
import jwt from 'jsonwebtoken'

declare global {
  var signin: (id?: string) => string[]
}

// Mock kafka-wrapper before any imports that use it
jest.mock('../kafka-wrapper')

process.env.STRIPE_SECRET_KEY = '< stripe secret key >'
process.env.PRODUCT_SERVICE_URL = 'http://products-srv:3000'
process.env.SKIP_REDIS_CHECK = 'true' // Skip Redis connection in tests

let mongo: MongoMemoryServer

// Tạo MongoMemoryServer → kết nối Mongoose
beforeAll(async () => {
  process.env.JWT_KEY = 'test'
  mongo = await MongoMemoryServer.create()
  const mongoUri = mongo.getUri()

  await mongoose.connect(mongoUri)
})

// Xóa tất cả data trong collections
beforeEach(async () => {
  // Clear mocks
  jest.clearAllMocks()

  const collections = await mongoose.connection.db?.collections()

  if (collections) {
    for (let collection of collections) {
      await collection.deleteMany({}) // Xóa tất cả dữ liệu trong mỗi collection
    }
  }
})

// Stop MongoMemoryServer → đóng Mongoose connection
afterAll(async () => {
  if (mongo) {
    await mongo.stop()
  }
  await mongoose.connection.close()
})

// Helper to sign in a user and return session cookie
global.signin = (id?: string) => {
  // id is an optional parameter
  // Build a JWT payload.  { id, email }
  const payload = {
    id: id || new mongoose.Types.ObjectId().toHexString(), // if id is not provided, generate a random id
    email: 'testemail@example.com'
  }

  // Create the JWT
  const token = jwt.sign(payload, process.env.JWT_KEY!)

  // Build session object {jwt: MY_JWT}
  const session = { jwt: token }

  // Turn that session into JSON
  const sessionJSON = JSON.stringify(session)

  // Take JSON and encode it as base64
  const base64 = Buffer.from(sessionJSON).toString('base64')

  // Return a string that's the cookie with the encoded data
  return [`session=${base64}`]
}
