import mongoose from "mongoose"
import { updateIfCurrentPlugin } from "mongoose-update-if-current"
import { OrderStatus } from "@datnxecommerce/common"

// Interface ProductAttrs: Mô tả các thuộc tính cần thiết để tạo một Product mới
interface ProductAttrs {
    id: string
    title: string
    price: number
    quantity: number
    imageUrl?: string
}

// Interface ProductDoc: Mô tả một document Product trong MongoDB
export interface ProductDoc extends mongoose.Document {
    title: string
    price: number
    quantity: number
    version: number
    imageUrl?: string
    hasStock(requestedQuantity: number, excludeOrderId?: string): Promise<boolean>
}

// Interface ProductModel: Mô tả Product Model (class-level methods)
interface ProductModel extends mongoose.Model<ProductDoc> {
    build(attrs: ProductAttrs): ProductDoc
    findByEvent(event: { id: string, version: number }): Promise<ProductDoc | null>
}

// Tạo Mongoose Schema cho Product
const productSchema = new mongoose.Schema({
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
}, {
    toJSON: {
        transform(doc, ret: any) {
            ret.id = ret._id
            delete ret._id
        }
    }
})

productSchema.set('versionKey', 'version')
productSchema.plugin(updateIfCurrentPlugin)

// Thêm phương thức static 'findByEvent' vào Product Model để tìm record product trong db theo event
productSchema.statics.findByEvent = (event: { id: string, version: number }) => {
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

// Phương thức kiểm tra có đủ stock không
// excludeOrderId: loại trừ order hiện tại khi tính toán (vì order này đang chuẩn bị thanh toán)
productSchema.methods.hasStock = async function (requestedQuantity: number, excludeOrderId?: string) {
    const Order = this.model('Order')
    const query: any = {
        product: this,
        status: {
            $in: [
                OrderStatus.Created,
                OrderStatus.AwaitingPayment,
                OrderStatus.Complete
            ]
        }
    }
    
    // Loại trừ order hiện tại nếu có
    if (excludeOrderId) {
        query._id = { $ne: excludeOrderId }
    }

    const activeOrders = await Order.find(query)

    // Tính tổng số lượng đã được đặt bởi các order khác
    const reservedQuantity = activeOrders.reduce((sum: number, order: any) => sum + order.quantity, 0)
    const availableQuantity = this.quantity - reservedQuantity

    return availableQuantity >= requestedQuantity
}

// Tạo Product Model
const Product = mongoose.model<ProductDoc, ProductModel>('Product', productSchema)

export { Product }
