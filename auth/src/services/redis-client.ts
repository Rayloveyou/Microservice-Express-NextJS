import { createClient } from 'redis'

const host = process.env.REDIS_HOST || 'redis-svc'
const port = process.env.REDIS_PORT || '6379'
const url = process.env.REDIS_URL || `redis://${host}:${port}`

export const redisClient = createClient({
  url
})

let connecting = false

export const ensureRedisConnection = async () => {
  if (redisClient.isOpen || connecting) {
    return
  }

  try {
    connecting = true
    await redisClient.connect()
    // eslint-disable-next-line no-console
    console.log('Connected to Redis at', url)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Redis connection error:', err)
  } finally {
    connecting = false
  }
}

redisClient.on('error', err => {
  // eslint-disable-next-line no-console
  console.error('Redis client error:', err)
})
