import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'

let mongo: MongoMemoryServer

// Mock Kafka wrapper to prevent actual Kafka connections during tests
jest.mock('../kafka-wrapper')

// Mock Redis revocation service to prevent Redis connections during tests
jest.mock('@datnxecommerce/common', () => {
  const actual = jest.requireActual('@datnxecommerce/common')
  return {
    ...actual,
    isUserRevoked: jest.fn().mockResolvedValue(false),
    revokeUser: jest.fn().mockResolvedValue(undefined),
    unrevokeUser: jest.fn().mockResolvedValue(undefined)
  }
})

// Create MongoMemoryServer and connect Mongoose
beforeAll(async () => {
  process.env.JWT_KEY = 'test'
  process.env.ORDER_SERVICE_URL = 'http://orders-srv:3000'

  mongo = await MongoMemoryServer.create()
  const mongoUri = mongo.getUri()

  await mongoose.connect(mongoUri)
})

// Clear all data in collections before each test
beforeEach(async () => {
  jest.clearAllMocks()

  const collections = await mongoose.connection.db?.collections()

  if (collections) {
    for (let collection of collections) {
      await collection.deleteMany({})
    }
  }
})

// Stop MongoMemoryServer and close Mongoose connection
afterAll(async () => {
  if (mongo) {
    await mongo.stop()
  }
  await mongoose.connection.close()
})
