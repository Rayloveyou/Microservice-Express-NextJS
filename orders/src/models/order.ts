import mongoose from 'mongoose'
import { OrderStatus } from '@datnxecommerce/common'
import { ProductDoc } from './product'
import { updateIfCurrentPlugin } from 'mongoose-update-if-current'

export { OrderStatus }

// Interface OrderAttrs: Mô tả dữ liệu CẦN CÓ khi tạo một order mới (INPUT)
interface OrderItemAttrs {
  product: ProductDoc
  quantity: number
  priceSnapshot: number
  titleSnapshot: string
}

interface OrderAttrs {
  userId: string
  status: OrderStatus
  items: OrderItemAttrs[]
  total: number
  userEmail?: string
}

// Interface OrderDoc: Mô tả một document Order trong MongoDB
interface OrderItemDoc {
  product: ProductDoc
  quantity: number
  priceSnapshot: number
  titleSnapshot: string
}

interface OrderDoc extends mongoose.Document {
  userId: string
  status: OrderStatus
  items: OrderItemDoc[]
  total: number
  version: number
  userEmail?: string
  createdAt: Date
  updatedAt: Date
}

// Interface OrderModel: Mô tả Order Model (class-level methods)
interface OrderModel extends mongoose.Model<OrderDoc> {
  build(attrs: OrderAttrs): OrderDoc
}

// Tạo Mongoose Schema cho Order
const orderSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    userEmail: { type: String },
    status: {
      type: String,
      required: true,
      enum: Object.values(OrderStatus),
      default: OrderStatus.Created
    },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true, min: 1 },
        priceSnapshot: { type: Number, required: true, min: 0 },
        titleSnapshot: { type: String, required: true }
      }
    ],
    total: { type: Number, required: true, min: 0 }
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret: any) {
        ret.id = ret._id
        delete ret._id
        delete ret.__v
      }
    }
  }
)

orderSchema.set('versionKey', 'version')
orderSchema.plugin(updateIfCurrentPlugin)

// Thêm phương thức static 'build' vào Order Model
orderSchema.statics.build = (attrs: OrderAttrs) => new Order(attrs)
// Tạo Order Model
const Order = mongoose.model<OrderDoc, OrderModel>('Order', orderSchema)

export { Order }
