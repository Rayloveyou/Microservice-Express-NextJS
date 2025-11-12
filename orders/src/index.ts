// Load environment variables from .env when running locally
import 'dotenv/config'
import mongoose from 'mongoose'
import { app } from './app'
import { natsWrapper } from './nats-wrapper'
import { ProductCreatedListener } from './events/listeners/product-created-listener'
import { ProductUpdatedListener } from './events/listeners/product-updated-listener'
import { ExpirationCompleteListener } from './events/listeners/expiration-complete-listener'
const requireEnv = (key: string) => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`)
  }
  return value
}


const connectNats = async (): Promise<void> => {
  try {
    await natsWrapper.connect(
      requireEnv('NATS_CLUSTER_ID'),
      requireEnv('NATS_CLIENT_ID'),
      requireEnv('NATS_URL')
    )

    natsWrapper.client.on('close', () => {
      console.log('NATS connection closed!')
      process.exit()
    })

    process.on('SIGINT', () => natsWrapper.client.close())
    process.on('SIGTERM', () => natsWrapper.client.close())
    
    // Initialize instance of the listener and Listen to events
    new ProductCreatedListener(natsWrapper.client).listen()
    new ProductUpdatedListener(natsWrapper.client).listen()
    new ExpirationCompleteListener(natsWrapper.client).listen()

  } catch (err) {
    console.error('NATS connection failed:', err)
    console.log('Retrying in 5 seconds...')
    await new Promise(resolve => setTimeout(resolve, 5000))
    return connectNats() // Retry recursively
  }
}

const connectMongo = async (): Promise<void> => {
  const mongoUri = `mongodb://${requireEnv('MONGO_USERNAME')}:${requireEnv('MONGO_PASSWORD')}@${requireEnv('MONGO_HOST')}:${requireEnv('MONGO_PORT')}/auth?authSource=admin`

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

  await connectNats()
  await connectMongo()

  app.listen(3000, () => {
    console.log('Product service listening on port 3000!!!!');
  })
}

start()
