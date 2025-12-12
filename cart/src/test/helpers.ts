import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'

/**
 * Helper function to generate a mock cookie with a valid JWT token
 * Used for authenticated requests in tests
 */
export const getCookie = (userId?: string, email?: string, role: 'user' | 'admin' = 'user'): string[] => {
  // Generate a random user ID if not provided
  const id = userId || new mongoose.Types.ObjectId().toHexString()
  const userEmail = email || 'test@example.com'

  // Build JWT payload
  const payload = {
    id,
    email: userEmail,
    role
  }

  // Create JWT
  const token = jwt.sign(payload, process.env.JWT_KEY!)

  // Build session object
  const session = { jwt: token }

  // Convert to JSON
  const sessionJSON = JSON.stringify(session)

  // Encode to base64
  const base64 = Buffer.from(sessionJSON).toString('base64')

  // Return cookie array
  return [`session=${base64}`]
}

/**
 * Helper to create a product ID for testing
 */
export const createProductId = (): string => {
  return new mongoose.Types.ObjectId().toHexString()
}
