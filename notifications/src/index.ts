import 'dotenv/config'
import express from 'express'
import http from 'http'
import { IncomingMessage } from 'http'
import { Server as WebSocketServer } from 'ws'
import { kafkaWrapper } from './kafka-wrapper'
import { WebsocketManager } from './websocket-manager'
import { ProductCreatedConsumer } from './events/consumers/product-created-consumer'
import { OrderCreatedConsumer } from './events/consumers/order-created-consumer'
import { PaymentCreatedConsumer } from './events/consumers/payment-created-consumer'

const requireEnv = (key: string) => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`)
  }
  return value
}

const start = async () => {
  const app = express()
  const server = http.createServer(app)
  const wsManager = new WebsocketManager()

  // WebSocket server in noServer mode so we can bind to a specific path
  const wss = new WebSocketServer({ noServer: true })

  // Simple health endpoint
  app.get('/api/notifications/health', (_req, res) => {
    res.send({ status: 'ok' })
  })

  // Handle WebSocket upgrade only for /ws/notifications
  server.on('upgrade', (req: IncomingMessage, socket, head) => {
    const { url } = req
    if (url !== '/ws/notifications') {
      socket.destroy()
      return
    }

    wss.handleUpgrade(req, socket, head, ws => {
      wsManager.addClient(ws)
    })
  })

  // Kafka setup
  const brokersEnv = requireEnv('KAFKA_BROKERS')
  const brokers = brokersEnv.split(',').map(b => b.trim())
  const clientId = requireEnv('KAFKA_CLIENT_ID')

  await kafkaWrapper.connect(brokers, clientId)

  process.on('SIGINT', async () => {
    await kafkaWrapper.disconnect()
    server.close(() => process.exit())
  })
  process.on('SIGTERM', async () => {
    await kafkaWrapper.disconnect()
    server.close(() => process.exit())
  })

  // Start Kafka consumers
  const productCreatedConsumer = new ProductCreatedConsumer(
    kafkaWrapper.createConsumer('notifications-product-created'),
    wsManager
  )
  await productCreatedConsumer.listen()

  const orderCreatedConsumer = new OrderCreatedConsumer(
    kafkaWrapper.createConsumer('notifications-order-created'),
    wsManager
  )
  await orderCreatedConsumer.listen()

  const paymentCreatedConsumer = new PaymentCreatedConsumer(
    kafkaWrapper.createConsumer('notifications-payment-created'),
    wsManager
  )
  await paymentCreatedConsumer.listen()

  const port = parseInt(requireEnv('PORT'), 10)
  server.listen(port, () => {
    console.log(`Notifications service listening on port ${port}`)
  })
}

start().catch(err => {
  console.error('Failed to start notifications service', err)
})
