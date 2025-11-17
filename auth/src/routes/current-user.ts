import express from 'express'
import { currentUser } from '@datnxecommerce/common'
import { requireAuth } from '@datnxecommerce/common'

const router = express.Router() // Create a router instance

router.get('/api/users/currentuser', currentUser, (req, res) => {
  // Trả về currentUser (nếu có) hoặc null
  res.send({ currentUser: req.currentUser || null })
  
})

export { router as currentUserRouter } // Export the router