import { OrderStatus } from "@datnxtickets/common"
import mongoose from "mongoose"
import { updateIfCurrentPlugin } from "mongoose-update-if-current"

interface OrderAttrs {
    id: string
    version: number
    userId: string
    price: number
    status: OrderStatus
}

interface OrderDoc extends mongoose.Document {
    version: number
    userId: string
    price: number
    status: OrderStatus
}

interface OrderModel extends mongoose.Model<OrderDoc> {
    build(attrs: OrderAttrs): OrderDoc
}

const orderSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    }
}, {
    toJSON: {
        transform(doc, ret: any) {
            ret.id = ret._id
            delete ret._id
        }
    }
})

orderSchema.set('versionKey', 'version')
orderSchema.plugin(updateIfCurrentPlugin)

orderSchema.statics.build = (attrs: OrderAttrs) => {
    return new Order({
        // _id: attrs.id để lưu vào trong MongoDB
        _id: attrs.id,
        version: attrs.version,
        userId: attrs.userId,
        price: attrs.price,
        status: attrs.status
    })
}

const Order = mongoose.model<OrderDoc, OrderModel>('Order', orderSchema)

export { Order }