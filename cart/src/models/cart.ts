import mongoose from 'mongoose'
import { updateIfCurrentPlugin } from 'mongoose-update-if-current'

// Interface CartItemAttrs: Thuộc tính của một item trong cart
interface CartItemAttrs {
  productId: string
  quantity: number
}

// Interface CartAttrs: Thuộc tính cần thiết để tạo Cart
interface CartAttrs {
  userId: string
  items: CartItemAttrs[]
}

// Interface CartDoc: Mô tả một document Cart trong MongoDB
interface CartDoc extends mongoose.Document {
  userId: string
  items: CartItemAttrs[]
  version: number
  createdAt: Date
  updatedAt: Date
}

// Interface CartModel: Mô tả Cart Model với phương thức build
interface CartModel extends mongoose.Model<CartDoc> {
  build(attrs: CartAttrs): CartDoc
}

// Schema cho CartItem
const cartItemSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    }
  },
  { _id: false }
)

// Schema cho Cart
const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true
    },
    items: [cartItemSchema]
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret: any) {
        ret.id = ret._id
        delete ret._id
      }
    }
  }
)

cartSchema.set('versionKey', 'version')
cartSchema.plugin(updateIfCurrentPlugin)

cartSchema.statics.build = (attrs: CartAttrs) => {
  return new Cart(attrs)
}

const Cart = mongoose.model<CartDoc, CartModel>('Cart', cartSchema)

export { Cart }
export type { CartItemAttrs }
