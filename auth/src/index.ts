// Load environment variables from .env when running locally
import 'dotenv/config'
import mongoose from 'mongoose'
import { app } from './app'
import { runAuthMigrations } from './migrations'

const start = async () => {
  if (!process.env.JWT_KEY) {
    throw new Error('JWT_KEY must be defined')
  }

  // Build MongoDB connection string with authentication
  const username = process.env.MONGO_USERNAME
  const password = process.env.MONGO_PASSWORD
  const host = process.env.MONGO_HOST
  const port = process.env.MONGO_PORT

  // If credentials exist, use authenticated connection
  const mongoUri = `mongodb://${username}:${password}@${host}:${port}/auth?authSource=admin`

  try {
    await mongoose.connect(mongoUri) // Connect to MongoDB
    console.log('Connected to MongoDB')

    // Run pending migrations after successful connection
    // Migrations chạy tự động khi service khởi động
    // Chỉ chạy những migrations chưa được thực thi
    await runAuthMigrations()
  } catch (err) {
    console.error('MongoDB connection failed:', err)
    console.log('Retrying in 5 seconds...')
    setTimeout(start, 5000) // Retry after 5 seconds
    return
  }

  app.listen(3000, () => {
    console.log('Auth service listening on port 3000!!!!')
  })
}

start()
