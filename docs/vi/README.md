# 📖 Tài Liệu Kỹ Thuật Dự Án Ecommerce Microservices

## Mục Lục

1. [Tổng Quan Kiến Trúc](#1-tổng-quan-kiến-trúc)
2. [Luồng Xử Lý Chính](#2-luồng-xử-lý-chính)
3. [Chi Tiết Từng Service](#3-chi-tiết-từng-service)
4. [Hệ Thống Event (Kafka)](#4-hệ-thống-event-kafka)
5. [Database & Migrations](#5-database--migrations)
6. [Xác Thực & Phân Quyền](#6-xác-thực--phân-quyền)
7. [Xử Lý Thanh Toán](#7-xử-lý-thanh-toán)
8. [Unit Testing](#8-unit-testing)

---

## 1. Tổng Quan Kiến Trúc

### 1.1 Microservices Architecture

Dự án sử dụng kiến trúc **microservices** với các đặc điểm:

- **Database per Service**: Mỗi service có database MongoDB riêng biệt
- **Event-Driven Communication**: Giao tiếp giữa các service qua Apache Kafka
- **Shared Library**: Package `@datnxecommerce/common` chứa code dùng chung

```
┌─────────────────────────────────────────────────────────────────┐
│                    Client (Next.js 16)                          │
│                 https://ecommerce.local                         │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                ┌─────────▼──────────┐
                │   NGINX Ingress    │
                └─────────┬──────────┘
                          │
    ┌─────────┬───────────┼───────────┬─────────┬─────────┐
    │         │           │           │         │         │
┌───▼───┐ ┌───▼───┐  ┌────▼────┐ ┌────▼────┐ ┌──▼──┐ ┌───▼───┐
│ Auth  │ │ Prod  │  │  Cart   │ │ Orders  │ │ Pay │ │ Admin │
│  Svc  │ │  Svc  │  │   Svc   │ │   Svc   │ │ Svc │ │  Svc  │
└───┬───┘ └───┬───┘  └────┬────┘ └────┬────┘ └──┬──┘ └───────┘
    │         │           │           │         │
    ▼         ▼           ▼           ▼         ▼
  Mongo     Mongo       Mongo       Mongo     Mongo
                          │
                ┌─────────▼──────────┐
                │   Apache Kafka     │
                │   (Event Bus)      │
                └────────────────────┘
```

### 1.2 Nguyên Tắc Thiết Kế

| Nguyên Tắc | Giải Thích |
|------------|------------|
| **Loose Coupling** | Services hoạt động độc lập, không gọi trực tiếp DB của nhau |
| **Eventual Consistency** | Data đồng bộ qua events, chấp nhận delay nhỏ |
| **Idempotency** | Events có thể xử lý nhiều lần mà không ảnh hưởng kết quả |
| **Optimistic Concurrency** | Sử dụng version field để tránh race conditions |

---

## 2. Luồng Xử Lý Chính

### 2.1 Luồng Mua Hàng (Happy Path)

```
User → [Add to Cart] → Cart Service
                            │
                            ▼
User → [Checkout] → Cart Service ──POST /api/orders──► Orders Service
                            │                              │
                            │                   ┌──────────▼──────────┐
                            │                   │ 1. Tạo Order        │
                            │                   │ 2. Status = Created │
                            │                   │ 3. Publish event    │
                            │                   └──────────┬──────────┘
                            │                              │
                            │              order.created ──┼──► Payments Service
                            │                              │    (replicate order)
                            ▼
User → [Pay with Stripe] → Payments Service
                            │
                            ▼
               ┌────────────────────────┐
               │ 1. Validate order      │
               │ 2. Charge Stripe       │
               │ 3. Create Payment doc  │
               │ 4. Publish event       │
               └───────────┬────────────┘
                           │
           payment.created │
                           │
    ┌──────────────────────┼──────────────────────┐
    │                      │                      │
    ▼                      ▼                      ▼
Orders Service        Products Service       Cart Service
- Mark Complete       - Giảm quantity        - Xóa items đã mua
```

### 2.2 Chi Tiết Từng Bước

#### Bước 1: Thêm Vào Giỏ Hàng
```typescript
// POST /api/cart
// cart/src/routes/add-to-cart.ts

1. Kiểm tra user đã đăng nhập (currentUser middleware)
2. Validate productId, quantity từ request body
3. Kiểm tra product tồn tại trong local DB (replicated từ Products)
4. Kiểm tra quantity <= product.quantity (còn hàng)
5. Tìm hoặc tạo cart cho user
6. Thêm/cập nhật item trong cart.items[]
7. Trả về cart mới
```

#### Bước 2: Checkout
```typescript
// POST /api/cart/checkout
// cart/src/routes/checkout.ts

1. Lấy cart của user hiện tại
2. Validate cart không rỗng
3. Với mỗi item, kiểm tra lại stock availability
4. Gọi Orders Service: POST /api/orders với cart items
5. Orders Service tạo order và publish order.created
6. Xóa items trong cart (hoặc giữ lại đến khi payment)
7. Trả về order vừa tạo
```

#### Bước 3: Thanh Toán
```typescript
// POST /api/payments
// payments/src/routes/new.ts

1. Validate orderId, token từ request
2. Tìm order trong local DB (replicated)
3. Kiểm tra: order.userId === currentUser.id
4. Kiểm tra: order.status === OrderStatus.Created
5. Gọi Stripe API để charge
6. Tạo Payment document
7. Publish payment.created với items data
8. Trả về payment
```

---

## 3. Chi Tiết Từng Service

### 3.1 Auth Service

**Chức năng chính:**
- Đăng ký, đăng nhập, đăng xuất
- Quản lý JWT tokens
- Phân quyền admin

**Cấu trúc thư mục:**
```
auth/
├── src/
│   ├── app.ts              # Express app config
│   ├── index.ts            # Entry point, kết nối DB
│   ├── models/
│   │   └── user.ts         # User schema
│   ├── routes/
│   │   ├── signup.ts
│   │   ├── signin.ts
│   │   ├── signout.ts
│   │   ├── current-user.ts
│   │   └── __test__/       # Unit tests
│   ├── services/
│   │   └── password.ts     # Hash & compare passwords
│   └── migrations/
│       ├── migration-runner.ts
│       └── index.ts
```

**Logic Đăng Nhập Admin:**
```typescript
// Cách hệ thống xác định admin:
// 1. Khi signup: nếu email === ADMIN_EMAIL env → role = 'admin'
// 2. Khi signin: nếu email === ADMIN_EMAIL và role = 'user' → upgrade to 'admin'

// auth/src/routes/signin.ts
const isAdminEmail = email === process.env.ADMIN_EMAIL

if (isAdminEmail && existingUser.role !== 'admin') {
  existingUser.role = 'admin'
  await existingUser.save()
}
```

### 3.2 Products Service

**Chức năng chính:**
- CRUD products
- Upload ảnh lên MinIO
- Quản lý inventory (quantity)

**Event Publishing:**
```typescript
// Khi tạo product mới:
await new ProductCreatedProducer(kafkaWrapper.producer).publish({
  id: product.id,
  title: product.title,
  price: product.price,
  quantity: product.quantity,
  category: product.category,
  imageUrl: product.imageUrl,
  userId: product.userId,
  version: product.version
}, product.id) // product.id làm message key → đảm bảo ordering

// Khi update product:
await new ProductUpdatedProducer(kafkaWrapper.producer).publish({
  id: product.id,
  title: product.title,
  price: product.price,
  quantity: product.quantity,
  // ... other fields
  version: product.version
}, product.id)
```

**Xử Lý Payment Created:**
```typescript
// products/src/events/consumers/payment-created-consumer.ts

async onMessage(data: PaymentCreatedEvent['data']) {
  // Giảm quantity cho từng product đã mua
  for (const item of data.items) {
    const product = await Product.findById(item.productId)
    if (product) {
      product.quantity -= item.quantity
      await product.save()

      // Publish update event cho các service khác
      await new ProductUpdatedProducer(kafkaWrapper.producer).publish({
        id: product.id,
        // ... updated fields
      }, product.id)
    }
  }
}
```

### 3.3 Cart Service

**Chức năng chính:**
- Quản lý giỏ hàng per user
- Replicate product data để validate
- Checkout flow

**Data Replication:**
```typescript
// Cart service lắng nghe product.created và product.updated
// để có bản copy local của products

// cart/src/events/consumers/product-created-consumer.ts
async onMessage(data: ProductCreatedEvent['data']) {
  await Product.create({
    _id: data.id,
    title: data.title,
    price: data.price,
    quantity: data.quantity,
    category: data.category,
    imageUrl: data.imageUrl,
    version: data.version
  })
}

// cart/src/events/consumers/product-updated-consumer.ts
async onMessage(data: ProductUpdatedEvent['data']) {
  const product = await Product.findOne({
    _id: data.id,
    version: data.version - 1  // OCC check
  })

  if (!product) return // Đã xử lý hoặc out of order

  product.set({
    title: data.title,
    price: data.price,
    quantity: data.quantity,
    version: data.version
  })
  await product.save()
}
```

### 3.4 Orders Service

**Chức năng chính:**
- Tạo orders từ cart items
- Track order status
- Cung cấp API cho admin

**Order Lifecycle:**
```
Created ──payment.created──► Complete
   │
   └──────cancel──────────► Cancelled
```

**Snapshot Pattern:**
```typescript
// Khi tạo order, lưu snapshot của product data
// để giữ nguyên giá/title tại thời điểm đặt hàng

const order = Order.build({
  userId: req.currentUser!.id,
  status: OrderStatus.Created,
  items: cart.items.map(item => ({
    product: item.productId,
    quantity: item.quantity,
    priceSnapshot: item.product.price,   // Giá tại thời điểm đặt
    titleSnapshot: item.product.title    // Tên tại thời điểm đặt
  })),
  total: calculateTotal(cart.items)
})
```

### 3.5 Payments Service

**Chức năng chính:**
- Xử lý thanh toán Stripe
- Validate order ownership
- Emit payment events

**Order Replication:**
```typescript
// Payments service lưu bản copy của orders
// để validate mà không cần gọi Orders service

// payments/src/events/consumers/order-created-consumer.ts
async onMessage(data: OrderCreatedEvent['data']) {
  const order = Order.build({
    id: data.id,
    userId: data.userId,
    status: data.status,
    total: data.total,
    items: data.items,
    version: data.version
  })
  await order.save()
}

// payments/src/events/consumers/order-cancelled-consumer.ts
async onMessage(data: OrderCancelledEvent['data']) {
  const order = await Order.findById(data.id)
  if (order) {
    order.status = OrderStatus.Cancelled
    await order.save()
  }
}
```

---

## 4. Hệ Thống Event (Kafka)

### 4.1 Kafka Concepts

| Concept | Giải Thích |
|---------|------------|
| **Topic** | "Channel" để gửi/nhận messages (VD: `product.created`) |
| **Partition** | Chia topic thành nhiều phần để parallel processing |
| **Consumer Group** | Nhóm consumers, mỗi message chỉ được xử lý 1 lần trong group |
| **Offset** | Vị trí đã đọc trong partition, dùng để track progress |
| **Message Key** | Quyết định message vào partition nào, đảm bảo ordering |

### 4.2 Event Catalog

```
┌──────────────────┬──────────────┬─────────────────────────────┬─────────────────────┐
│ Topic            │ Producer     │ Consumer Groups             │ Purpose             │
├──────────────────┼──────────────┼─────────────────────────────┼─────────────────────┤
│ product.created  │ Products     │ cart-product-created        │ Sync product → Cart │
│                  │              │ orders-product-created      │ Sync product → Ord  │
├──────────────────┼──────────────┼─────────────────────────────┼─────────────────────┤
│ product.updated  │ Products     │ cart-product-updated        │ Update price/stock  │
│                  │              │ orders-product-updated      │ Update in Orders    │
├──────────────────┼──────────────┼─────────────────────────────┼─────────────────────┤
│ order.created    │ Orders       │ payments-order-created      │ Replicate to Pay    │
├──────────────────┼──────────────┼─────────────────────────────┼─────────────────────┤
│ order.cancelled  │ Orders       │ payments-order-cancelled    │ Mark cancelled      │
├──────────────────┼──────────────┼─────────────────────────────┼─────────────────────┤
│ payment.created  │ Payments     │ orders-service              │ Mark order complete │
│                  │              │ products-service            │ Giảm inventory      │
│                  │              │ cart-payment-created        │ Clear cart items    │
└──────────────────┴──────────────┴─────────────────────────────┴─────────────────────┘
```

### 4.3 Base Classes

```typescript
// common/src/events/base-producer.ts
export abstract class Producer<T extends Event> {
  abstract subject: Subjects

  async publish(data: T['data'], key?: string): Promise<void> {
    await this.producer.send({
      topic: this.subject,
      messages: [{
        key: key,           // Partition routing
        value: JSON.stringify(data)
      }]
    })
  }
}

// common/src/events/base-consumer.ts
export abstract class Consumer<T extends Event> {
  abstract subject: Subjects
  abstract queueGroupName: string
  abstract onMessage(data: T['data'], payload: EachMessagePayload): Promise<void>

  async listen(): Promise<void> {
    await this.consumer.subscribe({ topic: this.subject })
    await this.consumer.run({
      eachMessage: async (payload) => {
        const data = JSON.parse(payload.message.value!.toString())
        await this.onMessage(data, payload)
        // Offset auto-committed after successful processing
      }
    })
  }
}
```

### 4.4 Idempotency & Ordering

```typescript
// Sử dụng version field để đảm bảo ordering và idempotency

async onMessage(data: ProductUpdatedEvent['data']) {
  // Chỉ update nếu version = current + 1
  const product = await Product.findOne({
    _id: data.id,
    version: data.version - 1  // Expect previous version
  })

  if (!product) {
    // Đã xử lý rồi (version cao hơn) hoặc out of order
    console.log('Skipping - already processed or out of order')
    return
  }

  // Update với version mới
  product.set({ ...data })
  await product.save()  // Version auto-incremented by plugin
}
```

---

## 5. Database & Migrations

### 5.1 Migration System

Mỗi service có hệ thống migration riêng để:
- Tạo indexes tối ưu queries
- Seed data mặc định
- Thay đổi schema có kiểm soát

```typescript
// Cấu trúc một migration
export interface MigrationDefinition {
  name: string           // Format: YYYYMMDD_NNN_description
  up: () => Promise<void>   // Chạy khi migrate
  down: () => Promise<void> // Chạy khi rollback
}

// Ví dụ: auth/src/migrations/index.ts
const migration_001: MigrationDefinition = {
  name: '20251212_001_create_user_indexes',
  up: async () => {
    const collection = db.collection('users')
    await collection.createIndex({ email: 1 }, { unique: true })
    await collection.createIndex({ role: 1 })
  },
  down: async () => {
    const collection = db.collection('users')
    await collection.dropIndex('idx_email_unique')
    await collection.dropIndex('idx_role')
  }
}
```

### 5.2 Index Strategy

| Service | Collection | Indexes | Purpose |
|---------|------------|---------|---------|
| Auth | users | email (unique), role, isBlocked | Login lookup, admin filter |
| Products | products | userId, category+price, title (text) | Owner filter, search, browse |
| Orders | orders | userId+status, status+createdAt | User orders, admin dashboard |
| Cart | carts | userId (unique), updatedAt | One cart per user |
| Payments | payments | orderId (unique), stripeId (unique) | Payment lookup |

### 5.3 Optimistic Concurrency Control (OCC)

```typescript
// Sử dụng mongoose-update-if-current plugin

// models/product.ts
import { updateIfCurrentPlugin } from 'mongoose-update-if-current'

productSchema.plugin(updateIfCurrentPlugin)
productSchema.set('versionKey', 'version')

// Khi save(), plugin tự động:
// 1. Thêm { version: currentVersion } vào query
// 2. Increment version trong update
// 3. Throw error nếu version không match (concurrent update)
```

---

## 6. Xác Thực & Phân Quyền

### 6.1 JWT Flow

```
┌────────┐                    ┌────────────┐
│ Client │                    │ Auth Svc   │
└───┬────┘                    └─────┬──────┘
    │ POST /signin                  │
    │ {email, password}             │
    │──────────────────────────────►│
    │                               │
    │                    ┌──────────┴──────────┐
    │                    │ 1. Validate creds   │
    │                    │ 2. Generate JWT     │
    │                    │ 3. Set cookie       │
    │                    └──────────┬──────────┘
    │                               │
    │◄──────────────────────────────│
    │ Set-Cookie: session=<jwt>     │
    │                               │
    │ GET /api/products             │
    │ Cookie: session=<jwt>         │
    │──────────────────────────────►│ Products Svc
    │                               │
    │                    ┌──────────┴──────────┐
    │                    │ Middleware:         │
    │                    │ 1. Extract JWT      │
    │                    │ 2. Verify signature │
    │                    │ 3. Attach user      │
    │                    └──────────┬──────────┘
```

### 6.2 Middleware Chain

```typescript
// Thứ tự middleware trong routes

router.post('/api/orders',
  currentUser,        // 1. Decode JWT, attach req.currentUser
  requireAuth,        // 2. Throw 401 nếu không có currentUser
  validateRequest,    // 3. Validate body
  async (req, res) => {
    // req.currentUser.id available
  }
)

// Admin routes thêm requireAdmin
router.get('/api/admin/users',
  currentUser,
  requireAuth,
  requireAdmin,       // Throw 403 nếu role !== 'admin'
  async (req, res) => { ... }
)
```

### 6.3 JWT Payload

```typescript
interface UserPayload {
  id: string
  email: string
  role: 'user' | 'admin'
  iat: number    // Issued at
  exp: number    // Expiration
}

// Tạo JWT
const token = jwt.sign(
  { id: user.id, email: user.email, role: user.role },
  process.env.JWT_KEY!,
  { expiresIn: '15m' }
)

// Set vào cookie
req.session = { jwt: token }
```

---

## 7. Xử Lý Thanh Toán

### 7.1 Stripe Integration

```typescript
// payments/src/routes/new.ts

import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

router.post('/api/payments', async (req, res) => {
  const { token, orderId } = req.body

  // 1. Find order (local replica)
  const order = await Order.findById(orderId)
  if (!order) throw new NotFoundError()

  // 2. Validate ownership
  if (order.userId !== req.currentUser!.id) {
    throw new NotAuthorizedError()
  }

  // 3. Validate status
  if (order.status === OrderStatus.Cancelled) {
    throw new BadRequestError('Order đã bị hủy')
  }
  if (order.status === OrderStatus.Complete) {
    throw new BadRequestError('Order đã thanh toán')
  }

  // 4. Charge via Stripe
  const charge = await stripe.charges.create({
    amount: order.total * 100,  // Convert to cents
    currency: 'usd',
    source: token
  })

  // 5. Create payment record
  const payment = Payment.build({
    orderId: order.id,
    stripeId: charge.id
  })
  await payment.save()

  // 6. Publish event with items for inventory update
  await new PaymentCreatedProducer(kafkaWrapper.producer).publish({
    id: payment.id,
    orderId: order.id,
    stripeId: charge.id,
    items: order.items  // Products service cần để giảm quantity
  }, orderId)

  res.status(201).send(payment)
})
```

### 7.2 Post-Payment Events

```
payment.created published
        │
        ├──► Orders Service
        │    └─ order.status = Complete
        │
        ├──► Products Service
        │    └─ Giảm quantity cho từng item
        │    └─ Publish product.updated events
        │
        └──► Cart Service
             └─ Xóa purchased items từ cart
```

---

## 8. Unit Testing

### 8.1 Test Setup

```typescript
// Mỗi service có test/setup.ts

import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'

let mongo: MongoMemoryServer

beforeAll(async () => {
  // Tạo in-memory MongoDB
  mongo = await MongoMemoryServer.create()
  await mongoose.connect(mongo.getUri())
})

beforeEach(async () => {
  // Mock Kafka
  jest.clearAllMocks()

  // Clear all collections
  const collections = await mongoose.connection.db.collections()
  for (let collection of collections) {
    await collection.deleteMany({})
  }
})

afterAll(async () => {
  await mongo.stop()
  await mongoose.connection.close()
})

// Helper tạo authenticated request
global.signin = (userId?: string) => {
  const payload = {
    id: userId || new mongoose.Types.ObjectId().toHexString(),
    email: 'test@test.com',
    role: 'user'
  }

  const token = jwt.sign(payload, process.env.JWT_KEY!)
  const sessionJSON = JSON.stringify({ jwt: token })
  const base64 = Buffer.from(sessionJSON).toString('base64')

  return [`session=${base64}`]
}
```

### 8.2 Kafka Mock

```typescript
// __mocks__/kafka-wrapper.ts

export const kafkaWrapper = {
  producer: {
    send: jest.fn()
  },
  createConsumer: jest.fn(() => ({
    subscribe: jest.fn(),
    run: jest.fn(),
    disconnect: jest.fn()
  })),
  connect: jest.fn(),
  disconnect: jest.fn()
}
```

### 8.3 Example Test Cases

```typescript
// products/src/routes/__test__/new.test.ts

describe('POST /api/products', () => {
  it('chỉ cho phép authenticated users', async () => {
    await request(app)
      .post('/api/products')
      .send({})
      .expect(401)
  })

  it('trả về 400 nếu title không hợp lệ', async () => {
    await request(app)
      .post('/api/products')
      .set('Cookie', global.signin())
      .send({ title: '', price: 10, quantity: 5 })
      .expect(400)
  })

  it('tạo product thành công', async () => {
    const response = await request(app)
      .post('/api/products')
      .set('Cookie', global.signin())
      .send({ title: 'Test', price: 99, quantity: 10, category: 'electronics' })
      .expect(201)

    expect(response.body.title).toEqual('Test')
    expect(response.body.price).toEqual(99)
  })

  it('publish product.created event', async () => {
    await request(app)
      .post('/api/products')
      .set('Cookie', global.signin())
      .send({ title: 'Test', price: 99, quantity: 10, category: 'electronics' })
      .expect(201)

    expect(kafkaWrapper.producer.send).toHaveBeenCalled()
  })
})
```

### 8.4 Chạy Tests

```bash
# Chạy tests cho từng service
cd auth && npm test
cd products && npm test
cd orders && npm test
cd cart && npm test
cd payments && npm test

# Chạy với coverage
npm test -- --coverage

# Chạy specific test file
npm test -- routes/__test__/new.test.ts
```

---

## Tổng Kết

Dự án này minh họa các patterns quan trọng trong microservices:

1. **Event-Driven Architecture**: Services giao tiếp qua Kafka, không coupling trực tiếp
2. **Database per Service**: Mỗi service có data store riêng, replicate data cần thiết
3. **Optimistic Concurrency**: Sử dụng version fields để handle concurrent updates
4. **Idempotent Event Handlers**: Events có thể replay mà không ảnh hưởng kết quả
5. **Snapshot Pattern**: Lưu trữ data tại thời điểm transaction

---

*Tài liệu này được tạo tự động và cập nhật theo code changes.*
