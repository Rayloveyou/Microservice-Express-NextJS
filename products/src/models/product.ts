import mongoose from "mongoose"
import { updateIfCurrentPlugin } from "mongoose-update-if-current"

// Interface ProductAttrs: Mô tả các thuộc tính cần thiết để tạo một Product mới
interface ProductAttrs {
    title: string
    price: number
    userId: string
}


// Interface ProductDoc: Mô tả một document Product trong MongoDB
interface ProductDoc extends mongoose.Document {
    title: string
    price: number
    userId: string
    version: number
}

// Interface ProductModel: Mô tả Model Product với phương thức build
interface ProductModel extends mongoose.Model<ProductDoc> {
    build(attrs: ProductAttrs): ProductDoc
}

// Tạo Mongoose Schema cho Product
const productSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    userId: {
        type: String,
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

// Cập nhật version key sử dụng updateIfCurrentPlugin trên Mongoose : __v -> version
productSchema.set('versionKey', 'version')
productSchema.plugin(updateIfCurrentPlugin)

// Thêm phương thức static 'build' vào Product Model
productSchema.statics.build = (attrs: ProductAttrs) => {
    return new Product(attrs)
}

// Tạo và export Mongoose Model cho Product
const Product = mongoose.model<ProductDoc, ProductModel>('Product', productSchema)

export { Product }