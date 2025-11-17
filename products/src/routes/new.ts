import express, { Request, Response } from 'express'
import { body } from 'express-validator'
import { requireAuth, validateRequest } from '@datnxecommerce/common'
import { Product } from '../models/product'
import { ProductCreatedPublisher} from '../events/publishers/product-created-publisher'
import { natsWrapper } from '../nats-wrapper'
import { upload } from '../middlewares/upload'
import { minioClient, BUCKET_NAME } from '../config/cloudinary'
import { v4 as uuidv4 } from 'uuid'

const router = express.Router()

// Route tạo product
router.post('/api/products', requireAuth, upload.single('image'), [
    body('title').not().isEmpty().withMessage('Title is required'),
    body('price').isFloat({ gt: 0 }).withMessage('Price must be a positive number'),
    body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer')
], validateRequest, async (req: Request, res: Response) => {
    const { title, price, quantity } = req.body

    let imageUrl: string | undefined;

    // Upload image to MinIO if provided
    const file = (req as any).file as Express.Multer.File | undefined;
    if (file) {
        const fileExtension = file.originalname.split('.').pop();
        const fileName = `${uuidv4()}.${fileExtension}`;
        
        await minioClient.putObject(
            BUCKET_NAME,
            fileName,
            file.buffer,
            file.size,
            {
                'Content-Type': file.mimetype,
            }
        );

        // Generate public URL - accessible from browser via ingress
        imageUrl = `https://minio-api.local/${BUCKET_NAME}/${fileName}`;
    }

    const productAttrs: any = {
        title,
        price,
        userId: req.currentUser!.id,
        quantity
    };
    if (imageUrl) {
        productAttrs.imageUrl = imageUrl;
    }

    const product = Product.build(productAttrs)
    await product.save()

    // Publish an event to NATS
    await new ProductCreatedPublisher(natsWrapper.client).publish({
        id: product.id,
        title: product.title,
        price: product.price,
        userId: product.userId,
        version: product.version, // version key from Mongoose (+1)
        quantity: product.quantity,
        ...(product.imageUrl && { imageUrl: product.imageUrl })
    })

    res.status(201).send(product)
})
    
export { router as createProductRouter }