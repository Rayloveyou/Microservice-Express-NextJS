import mongoose from "mongoose"
import { OrderStatus } from "@datnxtickets/common"
import { ProductDoc } from "./product"
import { updateIfCurrentPlugin } from "mongoose-update-if-current"

export { OrderStatus }

// Interface OrderAttrs: Mô tả dữ liệu CẦN CÓ khi tạo một order mới (INPUT)
interface OrderAttrs {
    userId: string
    status: OrderStatus
    expiresAt: Date
    product: ProductDoc
}

// Interface OrderDoc: Mô tả một document Order trong MongoDB
interface OrderDoc extends mongoose.Document {
    userId: string
    status: OrderStatus
    expiresAt: Date
    product: ProductDoc,
    version: number
}

// Interface OrderModel: Mô tả Order Model (class-level methods)
interface OrderModel extends mongoose.Model<OrderDoc> {
    build(attrs: OrderAttrs): OrderDoc
}

// Tạo Mongoose Schema cho Order
const orderSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true,
        enum: Object.values(OrderStatus),
        default: OrderStatus.Created
    },
    expiresAt: {
        type: mongoose.Schema.Types.Date
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }
}, {
    toJSON: {
     transform(doc, ret: any) {
         ret.id = ret._id
         delete ret._id
         delete ret.__v
     }
    }
})

orderSchema.set('versionKey', 'version')
orderSchema.plugin(updateIfCurrentPlugin)

// Thêm phương thức static 'build' vào Order Model
orderSchema.statics.build = (attrs: OrderAttrs) => {
    return new Order(attrs)
}
// Tạo Order Model
const Order = mongoose.model<OrderDoc, OrderModel>('Order', orderSchema)


export { Order }