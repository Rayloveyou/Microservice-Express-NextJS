import express, { Request, Response } from 'express'
import { requireAuth } from '@datnxecommerce/common'
import { User } from '../models/user'

const router = express.Router()

// Get current user's full profile
router.get('/api/users/profile', requireAuth, async (req: Request, res: Response) => {
  const user = await User.findById(req.currentUser!.id)
  if (!user) {
    return res.status(404).send({ errors: [{ message: 'User not found' }] })
  }
  res.send(user)
})

// Update current user's profile (name, phone, address)
router.put('/api/users/profile', requireAuth, async (req: Request, res: Response) => {
  const user = await User.findById(req.currentUser!.id)
  if (!user) {
    return res.status(404).send({ errors: [{ message: 'User not found' }] })
  }

  const { name, phone, address } = req.body as { name?: string; phone?: string; address?: string }

  user.set({
    ...(name !== undefined ? { name } : {}),
    ...(phone !== undefined ? { phone } : {}),
    ...(address !== undefined ? { address } : {})
  })

  await user.save()

  res.send(user)
})

export { router as profileRouter }
