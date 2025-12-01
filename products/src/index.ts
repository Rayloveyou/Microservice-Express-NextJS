import 'dotenv/config'
import mongoose from 'mongoose'
import { app } from './app'
import { kafkaWrapper } from './kafka-wrapper'
import { PaymentCreatedConsumer } from './events/consumers/payment-created-consumer'
import { initializeBucket } from './config/cloudinary'

const requireEnv = (key: string) => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`)
  }
  return value
}

/**
 * Connect to Kafka broker(s)
 *
 * Kafka connection flow:
 * 1. Connect producer (dùng để publish events)
 * 2. Create và connect consumers cho từng listener
 * 3. Subscribe to topics và start consuming
 */
const connectKafka = async (): Promise<void> => {
  try {
    // Parse Kafka brokers từ env (format: "kafka-1:9092,kafka-2:9092" hoặc single "kafka-svc:9092")
    const brokersEnv = requireEnv('KAFKA_BROKERS')
    const brokers = brokersEnv.split(',').map(b => b.trim())
    const clientId = requireEnv('KAFKA_CLIENT_ID')

    // Connect Kafka producer
    await kafkaWrapper.connect(brokers, clientId)

    // Setup graceful shutdown
    process.on('SIGINT', async () => {
      console.log('SIGINT received, disconnecting Kafka...')
      await kafkaWrapper.disconnect()
      process.exit()
    })
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, disconnecting Kafka...')
      await kafkaWrapper.disconnect()
      process.exit()
    })

    // Initialize và start listeners
    // Mỗi listener sẽ tạo consumer riêng với consumer group riêng
    const paymentCreatedConsumer = new PaymentCreatedConsumer(
      kafkaWrapper.createConsumer('products-service')
    )
    await paymentCreatedConsumer.listen()

    console.log('All Kafka consumers started')
  } catch (err) {
    console.error('Kafka connection failed:', err)
    await new Promise(resolve => setTimeout(resolve, 5000))
    return connectKafka() // Retry recursively
  }
}

const connectMongo = async (): Promise<void> => {
  // Connect to products database
  const mongoUri = `mongodb://${requireEnv('MONGO_USERNAME')}:${requireEnv('MONGO_PASSWORD')}@${requireEnv('MONGO_HOST')}:${requireEnv('MONGO_PORT')}/products?authSource=admin`

  try {
    await mongoose.connect(mongoUri)
    console.log('Connected to MongoDB')
  } catch (err) {
    console.error('MongoDB connection failed:', err)
    console.log('Retrying in 5 seconds...')
    await new Promise(resolve => setTimeout(resolve, 5000))
    return connectMongo() // Retry recursively
  }
}

const start = async () => {
  requireEnv('JWT_KEY')

  await connectKafka()
  await connectMongo()
  await initializeBucket()

  const PORT = process.env.PORT

  // Start Express server
  app.listen(PORT, () => {
    console.log(`Product service listening on port ${PORT}`)
  })
}

start()
