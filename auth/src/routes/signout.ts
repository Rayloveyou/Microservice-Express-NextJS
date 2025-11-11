import express from 'express'

const router = express.Router() // Create a router instance

router.post('/api/users/signout', (req, res) => {
  req.session = null // Clear the session
  res.send({}) // Send empty object as response
})

export { router as signoutRouter } // Export the router