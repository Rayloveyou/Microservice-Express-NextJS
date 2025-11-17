import mongoose from "mongoose"
import { Order, OrderStatus } from "./order"
import { updateIfCurrentPlugin } from "mongoose-update-if-current"

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
    hasStock(requestedQuantity: number): Promise<boolean>
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
    // Logic: nếu product được update thì product svc sẽ emit 1 event với version mới. 
    // Order svc listen event này, sau đó query product trong db với id (từ event) + version = version từ product svc emit sang -1.
    // Neu khong tim thay product, throw error
    // Nếu tìm thấy thì update tittle / price với data trên event + update version = version + 1
productSchema.statics.findByEvent = (event: { id: string, version: number }) => {
    return Product.findOne({
        _id: event.id,
        version: event.version - 1
    })
}
productSchema.statics.build = (attrs: ProductAttrs) => {
    return new Product(
        {
            // assign _id with attrs.id passed in from id parameter (from product:created event)
            _id: attrs.id,
            title: attrs.title,
            price: attrs.price,
            quantity: attrs.quantity,
            imageUrl: attrs.imageUrl
        }
    )
}

productSchema.methods.hasStock = async function (requestedQuantity: number) {
    // Calculate total quantity reserved in active orders
    const Order = this.model('Order')
    const activeOrders = await Order.find({
        product: this,
        status: {
            $in: [
                OrderStatus.Created,
                OrderStatus.AwaitingPayment,
                OrderStatus.Complete
            ]
        }
    })

    // Sum up all quantities from active orders
    const reservedQuantity = activeOrders.reduce((sum: number, order: any) => sum + order.quantity, 0)
    const availableQuantity = this.quantity - reservedQuantity

    return availableQuantity >= requestedQuantity
}

// Tạo Product Model
const Product = mongoose.model<ProductDoc, ProductModel>('Product', productSchema)

export { Product }