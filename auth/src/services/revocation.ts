import { ensureRedisConnection, redisClient } from './redis-client'

const REVOKED_SET_KEY = 'revoked-users'

export const isUserRevoked = async (userId: string): Promise<boolean> => {
  try {
    await ensureRedisConnection()
    const result = await redisClient.sIsMember(REVOKED_SET_KEY, userId)
    return result
  } catch (err) {
    // Nếu Redis lỗi, không block user để tránh làm chết hệ thống
    // eslint-disable-next-line no-console
    console.error('isUserRevoked error :', err)
    return false
  }
}

export const blockUser = async (userId: string): Promise<void> => {
  try {
    await ensureRedisConnection()
    await redisClient.sAdd(REVOKED_SET_KEY, userId)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('blockUser (redis) error:', err)
  }
}

export const unblockUser = async (userId: string): Promise<void> => {
  try {
    await ensureRedisConnection()
    await redisClient.sRem(REVOKED_SET_KEY, userId)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('unblockUser (redis) error:', err)
  }
}
