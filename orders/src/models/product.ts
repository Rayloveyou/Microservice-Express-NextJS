import mongoose from "mongoose"
import { Order, OrderStatus } from "./order"
import { updateIfCurrentPlugin } from "mongoose-update-if-current"

// Interface ProductAttrs: Mô tả các thuộc tính cần thiết để tạo một Product mới
interface ProductAttrs {
    id: string
    title: string
    price: number
}

// Interface ProductDoc: Mô tả một document Product trong MongoDB
export interface ProductDoc extends mongoose.Document {
    title: string
    price: number,
    version: number
    isReserved(): Promise<boolean>
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
            price: attrs.price
        }
    )
}

productSchema.methods.isReserved = async function () {
    // Run query to look at all orders. Find an order where the product
    // is the product we just found *and* the order status is *not* cancelled.
    // If we find an order from that means the product *is* reserved
    const existingOrder = await this.model('Order').findOne({
        product: this,
        status: {
            $in: [
                OrderStatus.Created,
                OrderStatus.AwaitingPayment,
                OrderStatus.Complete
            ]
        }
    })
    // if null -> true và ngược lại
    return !!existingOrder
}

// Tạo Product Model
const Product = mongoose.model<ProductDoc, ProductModel>('Product', productSchema)

export { Product }