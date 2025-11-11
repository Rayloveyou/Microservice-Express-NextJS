import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { app } from '../app'
import request from 'supertest'


declare global {
  var signin: (email?: string, password?: string) => Promise<string[]>
  var signup: (email?: string, password?: string) => Promise<string[]>
}

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


// Helper to create a user (signup) and return session cookie
global.signup = async (email = 'testemail@example.com', password = 'password123') => {
  const res = await request(app)
    .post('/api/users/signup')
    .send({ email, password })

  // 201 created is expected; if duplicate email happens across tests, 400 is acceptable
  if (res.status !== 201 && res.status !== 400) {
    throw new Error(`Signup failed with status ${res.status}`)
  }

  const cookie = res.get('Set-Cookie')
  return cookie || []
}

// Helper to sign in a user and return session cookie
global.signin = async (email = 'testemail@example.com', password = 'password123') => {
  // Try sign in first
  let res = await request(app)
    .post('/api/users/signin')
    .send({ email, password })

  if (res.status !== 200) {
    // If user doesn't exist, create then sign in
    await global.signup(email, password)
    res = await request(app)
      .post('/api/users/signin')
      .send({ email, password })
  }

  if (res.status !== 200) {
    throw new Error(`Signin failed with status ${res.status}`)
  }

  const cookie = res.get('Set-Cookie')
  return cookie || []
}