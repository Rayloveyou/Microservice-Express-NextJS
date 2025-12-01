import mongoose from 'mongoose'
import { Password } from '../services/password'
import { UserRole } from '@datnxecommerce/common'
// ============================================================================
// BƯỚC 1: ĐỊNH NGHĨA CÁC INTERFACES (TypeScript Type Safety)
// ============================================================================

// Interface UserAttrs: Mô tả dữ liệu CẦN CÓ khi tạo một user mới (INPUT)
// - Đây là "contract" cho việc tạo user
// - Đảm bảo khi gọi User.build() phải truyền đúng email và password
interface UserAttrs {
  email: string
  password: string
  role?: UserRole
  name?: string
  phone?: string
  address?: string
}

// Interface UserDoc: Mô tả một User Document (OUTPUT từ MongoDB)
// - Kế thừa mongoose.Document để có các method của Mongoose (save, remove, etc.)
// - Chứa tất cả properties mà document sẽ có sau khi lưu vào DB
// - Có thể thêm createdAt, updatedAt nếu dùng timestamps
interface UserDoc extends mongoose.Document {
  email: string
  password: string
  role: UserRole
  name?: string
  phone?: string
  address?: string
  isBlocked?: boolean
  refreshToken?: string
  refreshTokenExpiresAt?: Date
  // createdAt: Date  // nếu dùng timestamps
  // updatedAt: Date  // nếu dùng timestamps
}

// Interface UserModel: Mô tả User Model (class-level methods)
// - Kế thừa mongoose.Model<UserDoc> để có các method như find(), findOne(), etc.
// - Định nghĩa thêm custom static methods (ví dụ: build)
// - Generic <UserDoc> cho biết type của document khi query
interface UserModel extends mongoose.Model<UserDoc> {
  // Static method build: nhận UserAttrs, trả về UserDoc
  // Mục đích: TypeScript sẽ check type khi tạo user
  build(attrs: UserAttrs): UserDoc
}

// ============================================================================
// BƯỚC 2: TẠO MONGOOSE SCHEMA (Định nghĩa cấu trúc dữ liệu trong MongoDB)
// ============================================================================

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String, // Kiểu dữ liệu trong MongoDB
      required: true, // Bắt buộc phải có
      unique: true // Tạo unique index (không cho trùng email)
    },
    password: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.User
    },
    name: {
      type: String
    },
    phone: {
      type: String
    },
    address: {
      type: String
    },
    isBlocked: {
      type: Boolean,
      default: false
    },
    refreshToken: {
      type: String
    },
    refreshTokenExpiresAt: {
      type: Date
    }
  },
  {
    toJSON: {
      // Chuyển đổi khi gọi res.send() hoặc JSON.stringify()
      transform(doc, ret: any) {
        ret.id = ret._id // Đổi _id thành id
        delete ret._id
        delete ret.password // Xóa password khỏi response
        delete ret.__v // Xóa version key
      }
    }
  }
)

userSchema.pre('save', async function (done) {
  // this ở đây là document sắp được lưu
  if (this.isModified('password')) {
    // Nếu password bị thay đổi (hoặc mới)
    const hashed = await Password.toHash(this.get('password')) // Hash password
    this.set('password', hashed) // Cập nhật password thành hash
  }
  done() // Gọi done để tiếp tục quá trình save
})

// ============================================================================
// BƯỚC 3: THÊM CUSTOM STATIC METHOD vào Schema
// ============================================================================

// Gắn function build vào userSchema.statics (static methods của Model)
// Lý do cần build() thay vì dùng new User()?
// - new User({ email, password }) sẽ có type là any (TypeScript không check)
// - User.build({ email, password }) sẽ có type là UserDoc (TypeScript check đầy đủ)
userSchema.statics.build = (attrs: UserAttrs) => {
  return new User(attrs)
}

// ============================================================================
// BƯỚC 4: TẠO MODEL từ Schema
// ============================================================================

// mongoose.model<DocumentType, ModelType>('ModelName', schema)
// Type provided to a function as arguments
// - Generic thứ nhất: UserDoc - type của document khi query
// - Generic thứ hai: UserModel - type của Model (có static methods)
// - 'User': tên collection trong MongoDB sẽ là 'users' (tự động lowercase + thêm s)
const User = mongoose.model<UserDoc, UserModel>('User', userSchema)

export { User }
