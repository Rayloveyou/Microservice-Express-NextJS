import { ensureRedisConnection, redisClient } from './redis-client'

const REVOKED_SET_KEY = 'revoked-users'

export const isUserRevoked = async (userId: string): Promise<boolean> => {
  try {
    await ensureRedisConnection()
    const result = await redisClient.sIsMember(REVOKED_SET_KEY, userId)
    return result
  } catch (err) {
    console.error('[common] isUserRevoked error: ', err)
    return false
  }
}
