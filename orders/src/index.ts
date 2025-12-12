// Load environment variables from .env when running locally
import 'dotenv/config'
import mongoose from 'mongoose'
import { app } from './app'
// Kafka (new event-driven architecture)
import { kafkaWrapper } from './kafka-wrapper'
import { PaymentCreatedConsumer } from './events/consumers/payment-created-consumer'
import { ProductCreatedConsumer } from './events/consumers/product-created-consumer'
import { ProductUpdatedConsumer } from './events/consumers/product-updated-consumer'
// NATS (legacy - có thể remove sau khi migration hoàn tất)
// import { natsWrapper } from './nats-wrapper'
// import { ProductCreatedListener } from './events/listeners/product-created-listener'
// import { ProductUpdatedListener } from './events/listeners/product-updated-listener'
// import { PaymentCreatedListener } from './events/listeners/payment-created-listener'
// import { CartCheckoutListener } from './events/listeners/cart-checkout-listener'

const requireEnv = (key: string) => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`)
  }
  return value
}

/**
 * Connect to Kafka broker(s)
 */
const connectKafka = async (): Promise<void> => {
  try {
    const brokersEnv = requireEnv('KAFKA_BROKERS')
    const brokers = brokersEnv.split(',').map(b => b.trim())
    const clientId = requireEnv('KAFKA_CLIENT_ID')

    await kafkaWrapper.connect(brokers, clientId)

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

    // Initialize và start consumers
    const productCreatedConsumer = new ProductCreatedConsumer(
      kafkaWrapper.createConsumer('orders-product-created')
    )
    await productCreatedConsumer.listen()

    const productUpdatedConsumer = new ProductUpdatedConsumer(
      kafkaWrapper.createConsumer('orders-product-updated')
    )
    await productUpdatedConsumer.listen()

    const paymentCreatedListener = new PaymentCreatedConsumer(
      kafkaWrapper.createConsumer('orders-service')
    )
    await paymentCreatedListener.listen()

    console.log('All Kafka consumers started')
  } catch (err) {
    console.error('Kafka connection failed:', err)
    console.log('Retrying in 5 seconds...')
    await new Promise(resolve => setTimeout(resolve, 5000))
    return connectKafka()
  }
}

const connectMongo = async (): Promise<void> => {
  // Connect to orders database
  const mongoUri = `mongodb://${requireEnv('MONGO_USERNAME')}:${requireEnv('MONGO_PASSWORD')}@${requireEnv('MONGO_HOST')}:${requireEnv('MONGO_PORT')}/orders?authSource=admin`

  try {
    await mongoose.connect(mongoUri)
    console.log('Connected to MongoDB')

    // Run pending migrations
    const { runOrdersMigrations } = await import('./migrations')
    await runOrdersMigrations()
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

  const PORT = process.env.PORT

  app.listen(PORT, () => {
    console.log(`Orders service listening on port ${PORT}`)
  })
}

start()
