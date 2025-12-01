import express, { Request, Response } from 'express'
import { body } from 'express-validator'
import {
  requireAuth,
  validateRequest,
  NotFoundError,
  NotAuthorizedError
} from '@datnxecommerce/common'
import { Product } from '../models/product'
import mongoose from 'mongoose'
// Kafka publisher (new)
import { ProductUpdatedProducer } from '../events/producers/product-updated-producer'
import { kafkaWrapper } from '../kafka-wrapper'
import { upload } from '../middlewares/upload'
import { minioClient, BUCKET_NAME } from '../config/cloudinary'
import { v4 as uuidv4 } from 'uuid'

const router = express.Router()

router.put(
  '/api/products/:id',
  requireAuth,
  upload.single('image'),
  [
    body('title').not().isEmpty().withMessage('Title is required'),
    body('price').isFloat({ gt: 0 }).withMessage('Price must be a positive number'),
    body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
    body('imageUrl').optional().isURL().withMessage('Image URL must be valid')
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    // Validate if id is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id!)) {
      throw new NotFoundError()
    }
    // Find product by id
    const product = await Product.findById(req.params.id)

    if (!product) {
      throw new NotFoundError()
    }

    // Check if the user is the owner of the product
    if (product.userId !== req.currentUser!.id && req.currentUser!.role !== 'admin') {
      throw new NotAuthorizedError()
    }

    let imageUrl = req.body.imageUrl as string | undefined

    const file = (req as any).file as Express.Multer.File | undefined
    if (file) {
      const fileExtension = file.originalname.split('.').pop()
      const fileName = `${uuidv4()}.${fileExtension}`

      await minioClient.putObject(BUCKET_NAME, fileName, file.buffer, file.size, {
        'Content-Type': file.mimetype
      })

      const publicBase =
        process.env.MINIO_PUBLIC_BASE_URL ||
        `http://${process.env.MINIO_ENDPOINT || 'localhost'}:${process.env.MINIO_PORT || '9000'}`
      imageUrl = `${publicBase}/${BUCKET_NAME}/${fileName}`
    }

    // Update product
    product.set({
      title: req.body.title,
      price: req.body.price,
      quantity: req.body.quantity,
      ...(imageUrl && { imageUrl })
    })

    // Save product
    await product.save()

    // Publish ProductUpdated event to Kafka topic 'product:updated'
    // Dùng product.id làm message key để đảm bảo ordering
    await new ProductUpdatedProducer(kafkaWrapper.producer).publish(
      {
        id: product.id,
        title: product.title,
        price: product.price,
        userId: product.userId,
        version: product.version, // version key from Mongoose (+1)
        quantity: product.quantity,
        ...(product.imageUrl && { imageUrl: product.imageUrl })
      },
      product.id
    ) // Message key = product.id

    // Send response
    res.send(product)
  }
)

export { router as updateProductRouter }
