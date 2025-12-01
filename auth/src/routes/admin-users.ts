import express, { Request, Response, NextFunction } from 'express'
import { requireAuth, NotAuthorizedError, UserRole } from '@datnxecommerce/common'
import { User } from '../models/user'
import {
  blockUser as redisBlockUser,
  unblockUser as redisUnblockUser
} from '../services/revocation'

const router = express.Router()

// Simple admin guard
const requireAdmin = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.currentUser || req.currentUser.role !== UserRole.Admin) {
    throw new NotAuthorizedError()
  }
  next()
}

// List all users (admin only)
router.get('/api/admin/users', requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  const users = await User.find({})
  res.send(users)
})

// Get single user detail (admin only)
router.get(
  '/api/admin/users/:id',
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response) => {
    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).send({ errors: [{ message: 'User not found' }] })
    }
    res.send(user)
  }
)

// Block a user (set isBlocked = true)
router.post(
  '/api/admin/users/:id/block',
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response) => {
    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).send({ errors: [{ message: 'User not found' }] })
    }

    user.isBlocked = true
    await user.save()
    await redisBlockUser(user.id)

    res.send(user)
  }
)

// Unblock a user (set isBlocked = false)
router.post(
  '/api/admin/users/:id/unblock',
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response) => {
    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).send({ errors: [{ message: 'User not found' }] })
    }

    user.isBlocked = false
    await user.save()
    await redisUnblockUser(user.id)

    res.send(user)
  }
)

export { router as adminUsersRouter }
