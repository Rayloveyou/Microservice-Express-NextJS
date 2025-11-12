// Load environment variables from .env when running locally
import 'dotenv/config'
import { natsWrapper } from './nats-wrapper'
import { OrderCreatedListener } from './events/listeners/order-created-listener'


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
    new OrderCreatedListener(natsWrapper.client).listen()

  } catch (err) {
    console.error('NATS connection failed:', err)
    console.log('Retrying in 5 seconds...')
    await new Promise(resolve => setTimeout(resolve, 5000))
    return connectNats() // Retry recursively
  }
}



const start = async () => {

  await connectNats()

}

start()
