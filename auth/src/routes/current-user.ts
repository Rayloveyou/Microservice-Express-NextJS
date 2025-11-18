import express from 'express'
import { currentUser } from '@datnxecommerce/common'
import { User } from '../models/user'

const router = express.Router() // Create a router instance

router.get('/api/users/currentuser', currentUser, async (req, res) => {
  if (!req.currentUser) {
    return res.send({ currentUser: null })
  }

  const existingUser = await User.findById(req.currentUser.id)

  if (!existingUser) {
    req.session = null
    return res.send({ currentUser: null })
  }

  res.send({
    currentUser: {
      id: existingUser.id,
      email: existingUser.email
    }
  })
})

export { router as currentUserRouter } // Export the router