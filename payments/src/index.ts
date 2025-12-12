// Load environment variables from .env when running locally
import 'dotenv/config'
import mongoose from 'mongoose'
import { app } from './app'
// Kafka (new)
import { kafkaWrapper } from './kafka-wrapper'
import { OrderCreatedConsumer } from './events/consumers/order-created-consumer'
import { OrderCancelledConsumer } from './events/consumers/order-cancelled-consumer'
// NATS (legacy)
// import { natsWrapper } from './nats-wrapper'
// import { OrderCreatedListener } from './events/listeners/order-created-listener'
// import { OrderCancelledListener } from './events/listeners/order-cancelled-listener'

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
    const clientId = requireEnv('KAFKA_CLIENT_ID')

    await kafkaWrapper.connect(brokers, clientId)

    process.on('SIGINT', async () => {
      await kafkaWrapper.disconnect()
      process.exit()
    })
    process.on('SIGTERM', async () => {
      await kafkaWrapper.disconnect()
      process.exit()
    })

    const orderCreatedConsumer = new OrderCreatedConsumer(
      kafkaWrapper.createConsumer('payments-order-created')
    )
    await orderCreatedConsumer.listen()

    const orderCancelledConsumer = new OrderCancelledConsumer(
      kafkaWrapper.createConsumer('payments-order-cancelled')
    )
    await orderCancelledConsumer.listen()

    console.log('All Kafka consumers started')
  } catch (err) {
    console.error('❌ Kafka connection failed:', err)
    console.log('Retrying in 5 seconds...')
    await new Promise(resolve => setTimeout(resolve, 5000))
    return connectKafka()
  }
}

const connectMongo = async (): Promise<void> => {
  // Connect to payments database
  const mongoUri = `mongodb://${requireEnv('MONGO_USERNAME')}:${requireEnv('MONGO_PASSWORD')}@${requireEnv('MONGO_HOST')}:${requireEnv('MONGO_PORT')}/payments?authSource=admin`

  try {
    await mongoose.connect(mongoUri)
    console.log('Connected to MongoDB')

    // Run pending migrations
    const { runPaymentsMigrations } = await import('./migrations')
    await runPaymentsMigrations()
  } catch (err) {
    console.error('MongoDB connection failed:', err)
    console.log('Retrying in 5 seconds...')
    await new Promise(resolve => setTimeout(resolve, 5000))
    return connectMongo() // Retry recursively
  }
}

const start = async () => {
  requireEnv('JWT_KEY')
  requireEnv('STRIPE_SECRET_KEY')
  const PORT = requireEnv('PORT')
  await connectKafka()
  await connectMongo()

  app.listen(parseInt(PORT, 10), () => {
    const sk = process.env.STRIPE_SECRET_KEY || ''
    console.log(
      `✅ Payments service listening on port ${PORT}. Stripe key loaded:`,
      sk ? `sk_${sk.slice(3, 7)}...` : 'MISSING'
    )
  })
}

start()
