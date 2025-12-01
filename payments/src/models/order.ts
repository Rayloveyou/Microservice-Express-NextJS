import { OrderStatus } from '@datnxecommerce/common'
import mongoose from 'mongoose'
import { updateIfCurrentPlugin } from 'mongoose-update-if-current'

interface OrderItemSnapshot {
  productId: string
  title?: string
  price?: number
  quantity: number
}

interface OrderAttrs {
  id: string
  version: number
  userId: string
  status: OrderStatus
  total: number
  items?: OrderItemSnapshot[]
}

interface OrderDoc extends mongoose.Document {
  version: number
  userId: string
  status: OrderStatus
  total: number
  items: OrderItemSnapshot[]
}

interface OrderModel extends mongoose.Model<OrderDoc> {
  build(attrs: OrderAttrs): OrderDoc
}

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true
    },
    status: {
      type: String,
      required: true
    },
    total: {
      type: Number,
      required: true,
      min: 0
    },
    items: [
      {
        productId: String,
        title: String,
        price: Number,
        quantity: Number
      }
    ]
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

orderSchema.set('versionKey', 'version')
orderSchema.plugin(updateIfCurrentPlugin)

orderSchema.statics.build = (attrs: OrderAttrs) => {
  return new Order({
    _id: attrs.id,
    version: attrs.version,
    userId: attrs.userId,
    status: attrs.status,
    total: attrs.total,
    items: attrs.items || []
  })
}

const Order = mongoose.model<OrderDoc, OrderModel>('Order', orderSchema)

export { Order }
