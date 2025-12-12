import 'dotenv/config'
import mongoose from 'mongoose'
import { app } from './app'
// Kafka (new)
import { kafkaWrapper } from './kafka-wrapper'
import { PaymentCreatedConsumer } from './events/consumers/payment-created-consumer'
import { ProductCreatedConsumer } from './events/consumers/product-created-consumer'
import { ProductUpdatedConsumer } from './events/consumers/product-updated-consumer'
// NATS (legacy)
// import { natsWrapper } from './nats-wrapper'
// import { ProductCreatedListener } from './events/listeners/product-created-listener'
// import { ProductUpdatedListener } from './events/listeners/product-updated-listener'
// import { PaymentCreatedListener } from './events/listeners/payment-created-listener'

const requireEnv = (key: string) => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`)
  }
  return value
}

const connectKafka = async (): Promise<void> => {
  try {
    const brokersEnv = requireEnv('KAFKA_BROKERS')
    const brokers = brokersEnv.split(',').map(b => b.trim())
    const clientId = process.env.KAFKA_CLIENT_ID || 'cart-service'

    await kafkaWrapper.connect(brokers, clientId)

    process.on('SIGINT', async () => {
      await kafkaWrapper.disconnect()
      process.exit()
    })
    process.on('SIGTERM', async () => {
      await kafkaWrapper.disconnect()
      process.exit()
    })

    const productCreatedConsumer = new ProductCreatedConsumer(
      kafkaWrapper.createConsumer('cart-product-created')
    )
    await productCreatedConsumer.listen()

    const productUpdatedConsumer = new ProductUpdatedConsumer(
      kafkaWrapper.createConsumer('cart-product-updated')
    )
    await productUpdatedConsumer.listen()

    const paymentCreatedListener = new PaymentCreatedConsumer(
      kafkaWrapper.createConsumer('cart-payment-created')
    )
    await paymentCreatedListener.listen()

    console.log('All Kafka consumers started')
  } catch (err) {
    console.error('❌ Kafka connection failed:', err)
    console.log('Retrying in 5 seconds...')
    await new Promise(resolve => setTimeout(resolve, 5000))
    return connectKafka()
  }
}

const connectMongo = async (): Promise<void> => {
  const mongoUri = `mongodb://${requireEnv('MONGO_USERNAME')}:${requireEnv('MONGO_PASSWORD')}@${requireEnv('MONGO_HOST')}:${requireEnv('MONGO_PORT')}/cart?authSource=admin`

  try {
    await mongoose.connect(mongoUri)
    console.log('Connected to MongoDB')

    // Run pending migrations
    const { runCartMigrations } = await import('./migrations')
    await runCartMigrations()
  } catch (err) {
    console.error('MongoDB connection failed:', err)
    console.log('Retrying in 5 seconds...')
    await new Promise(resolve => setTimeout(resolve, 5000))
    return connectMongo()
  }
}

const start = async () => {
  requireEnv('JWT_KEY')
  const PORT = requireEnv('PORT')

  await connectKafka()
  await connectMongo()

  app.listen(parseInt(PORT, 10), () => {
    console.log(`Cart service listening on port ${PORT}`)
  })
}

start()
