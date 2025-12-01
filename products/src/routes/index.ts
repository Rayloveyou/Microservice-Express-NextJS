import express, { Request, Response } from 'express'
import { Product, ProductCategory } from '../models/product'

const router = express.Router()

router.get('/api/products', async (req: Request, res: Response) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 12
    const skip = (page - 1) * limit

    // Search and filter parameters
    const search = req.query.search as string
    const category = req.query.category as string

    // Build query
    const query: any = {}

    // Add search condition (search in title)
    if (search) {
      query.title = { $regex: search, $options: 'i' }
    }

    // Add category filter
    if (category && Object.values(ProductCategory).includes(category as ProductCategory)) {
      query.category = category
    }

    // Get total count for pagination
    const total = await Product.countDocuments(query)

    // Get products with pagination
    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit)
    const hasNext = page < totalPages
    const hasPrev = page > 1

    res.send({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev
      }
    })
  } catch (error) {
    console.error('Error fetching products:', error)
    res.status(500).send({ errors: [{ message: 'Failed to fetch products' }] })
  }
})

export { router as indexProductRouter }
