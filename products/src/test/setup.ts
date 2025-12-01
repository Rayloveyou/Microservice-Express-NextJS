import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { app } from '../app'
import request from 'supertest'
import jwt from 'jsonwebtoken'

declare global {
  var signin: () => string[]
}

// Mock natsWrapper để test
jest.mock('../nats-wrapper')

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
global.signin = () => {
  // Build a JWT payload.  { id, email }
  const payload = {
    id: new mongoose.Types.ObjectId().toHexString(),
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
