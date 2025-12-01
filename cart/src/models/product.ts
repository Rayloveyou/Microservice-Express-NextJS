import mongoose from 'mongoose'
import { updateIfCurrentPlugin } from 'mongoose-update-if-current'

// Interface ProductAttrs
interface ProductAttrs {
  id: string
  title: string
  price: number
  quantity: number
  imageUrl?: string
}

// Interface ProductDoc
export interface ProductDoc extends mongoose.Document {
  title: string
  price: number
  quantity: number
  version: number
  imageUrl?: string
}

// Interface ProductModel
interface ProductModel extends mongoose.Model<ProductDoc> {
  build(attrs: ProductAttrs): ProductDoc
  findByEvent(event: { id: string; version: number }): Promise<ProductDoc | null>
}

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    quantity: {
      type: Number,
      required: true,
      min: 0
    },
    imageUrl: {
      type: String,
      required: false
    }
  },
  {
    toJSON: {
      transform(doc, ret: any) {
        ret.id = ret._id
        delete ret._id
      }
    }
  }
)

productSchema.set('versionKey', 'version')
productSchema.plugin(updateIfCurrentPlugin)

productSchema.statics.findByEvent = (event: { id: string; version: number }) => {
  return Product.findOne({
    _id: event.id,
    version: event.version - 1
  })
}

productSchema.statics.build = (attrs: ProductAttrs) => {
  return new Product({
    _id: attrs.id,
    title: attrs.title,
    price: attrs.price,
    quantity: attrs.quantity,
    imageUrl: attrs.imageUrl
  })
}

const Product = mongoose.model<ProductDoc, ProductModel>('Product', productSchema)

export { Product }
