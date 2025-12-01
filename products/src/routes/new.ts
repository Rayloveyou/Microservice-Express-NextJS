import express, { Request, Response } from 'express'
import { body } from 'express-validator'
import { requireAuth, validateRequest } from '@datnxecommerce/common'
import { Product, ProductCategory } from '../models/product'
// Kafka publisher (new)
import { ProductCreatedProducer } from '../events/producers/product-created-producer'
import { kafkaWrapper } from '../kafka-wrapper'
// NATS publisher (legacy - có thể remove sau)
// import { ProductCreatedPublisher} from '../events/publishers/product-created-publisher'
// import { natsWrapper } from '../nats-wrapper'
import { upload } from '../middlewares/upload'
import { minioClient, BUCKET_NAME } from '../config/cloudinary'
import { v4 as uuidv4 } from 'uuid'

const router = express.Router()

// Route tạo product
router.post(
  '/api/products',
  requireAuth,
  upload.single('image'),
  [
    body('title').not().isEmpty().withMessage('Title is required'),
    body('price').isFloat({ gt: 0 }).withMessage('Price must be a positive number'),
    body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
    body('category')
      .isIn(Object.values(ProductCategory))
      .withMessage('Category must be a valid category')
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const { title, price, quantity, category } = req.body

    let imageUrl: string | undefined

    // Upload image to MinIO if provided
    const file = (req as any).file as Express.Multer.File | undefined
    if (file) {
      const fileExtension = file.originalname.split('.').pop()
      const fileName = `${uuidv4()}.${fileExtension}`

      await minioClient.putObject(BUCKET_NAME, fileName, file.buffer, file.size, {
        'Content-Type': file.mimetype
      })

      // Generate public URL - accessible from browser via ingress
      const publicBase =
        process.env.MINIO_PUBLIC_BASE_URL ||
        `http://${process.env.MINIO_ENDPOINT || 'localhost'}:${process.env.MINIO_PORT || '9000'}`
      imageUrl = `${publicBase}/${BUCKET_NAME}/${fileName}`
    }

    const productAttrs: any = {
      title,
      price,
      userId: req.currentUser!.id,
      quantity,
      category
    }
    if (imageUrl) {
      productAttrs.imageUrl = imageUrl
    }

    const product = Product.build(productAttrs)
    await product.save()

    // Publish ProductCreated event to Kafka topic 'product:created'
    // Dùng product.id làm message key để đảm bảo events của cùng product vào cùng partition
    await new ProductCreatedProducer(kafkaWrapper.producer).publish(
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

    res.status(201).send(product)
  }
)

export { router as createProductRouter }
