# 🛒 E-Commerce Microservices Platform

**Production-ready microservices e-commerce system on Kubernetes (Minikube) with event-driven architecture**

Hệ thống thương mại điện tử đa dịch vụ chạy trên Kubernetes với NATS event bus, MongoDB per service, Next.js SSR client, và Stripe Elements payment.

[![Kubernetes](https://img.shields.io/badge/kubernetes-v1.28-blue.svg)](https://kubernetes.io/)
[![Next.js](https://img.shields.io/badge/next.js-16.0-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/node.js-20+-green.svg)](https://nodejs.org/)

---

## 📑 Mục lục

1. [Tổng quan kiến trúc](#-tổng-quan-kiến-trúc)
2. [Các dịch vụ (Services)](#-các-dịch-vụ-services)
3. [Database Schemas](#-database-schemas)
4. [Event Architecture](#-event-architecture)
5. [Luồng hoạt động (Flows)](#-luồng-hoạt-động-flows)
6. [Cài đặt local (Minikube + mkcert)](#-cài-đặt-local-minikube--mkcert)
7. [Kubernetes Infrastructure](#-kubernetes-infrastructure)
8. [Test với Postman](#-test-với-postman)
9. [Troubleshooting](#-troubleshooting)
10. [Tech Stack](#-tech-stack)

---

## 🏗 Tổng quan kiến trúc

### Kiến trúc hiện tại (Updated Architecture)

**Thay đổi quan trọng:**
- ❌ **Không có expiration service** - Đã loại bỏ logic hết hạn đơn hàng 15 phút
- ❌ **Không lock sản phẩm khi tạo order** - Sản phẩm không bị reserve trước
- ✅ **Giảm số lượng sau khi thanh toán** - Products service nhận event \`PaymentCreated\` mới giảm quantity
- ✅ **Cart được giữ đến khi thanh toán** - Cart chỉ xóa items sau khi payment thành công
- ✅ **Stripe Elements** - Thay thế legacy Stripe Checkout popup

\`\`\`
┌─────────────────────────────────────────────────────────────────┐
│                     Browser (Next.js 16 SSR)                    │
│                    https://ecommerce.local                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                   ┌─────────▼─────────┐
                   │  Ingress (NGINX)  │
                   │   TLS (mkcert)    │
                   └─────────┬─────────┘
                             │
        ┌────────────┬───────┼────────┬─────────┬──────────┐
        │            │       │        │         │          │
    ┌───▼───┐  ┌────▼───┐ ┌─▼────┐ ┌─▼─────┐ ┌─▼─────┐  │
    │ Auth  │  │Products│ │Orders│ │Payment│ │ Cart  │  │
    │MongoDB│  │MongoDB │ │MongoDB│ │MongoDB│ │MongoDB│  │
    └───┬───┘  └────┬───┘ └─┬────┘ └─┬─────┘ └─┬─────┘  │
        │           │       │         │         │         │
        └───────────┴───────┴─────────┴─────────┴─────────┘
                             │
                      ┌──────▼──────┐
                      │    NATS     │
                      │ Streaming   │
                      │  (Event Bus)│
                      └─────────────┘
\`\`\`

### Directory Structure

\`\`\`
ticketing/
├── auth/                   # Authentication service
├── products/              # Product management + inventory
├── orders/                # Order management (no expiration)
├── payments/              # Stripe payment processing
├── cart/                  # Shopping cart
├── client/                # Next.js frontend (Stripe Elements)
├── common/                # Shared NPM package (@datnxecommerce/common)
├── infra/
│   ├── k8s/              # Kubernetes manifests
│   │   ├── auth/
│   │   ├── product/
│   │   ├── order/
│   │   ├── payment/
│   │   ├── cart/
│   │   ├── client/
│   │   ├── nats/
│   │   ├── ingress/
│   │   └── config/       # Secrets & ConfigMaps
│   ├── postman/          # Postman collection
│   └── tls-certs/        # mkcert certificates
├── skaffold.yaml
└── README.md
\`\`\`

---

## 🎯 Các dịch vụ (Services)

### 1. Auth Service (\`datnx/auth\`)

**Chức năng:**
- Đăng ký / đăng nhập user
- JWT authentication với HTTP-only cookies
- Password hashing (scrypt + salt)

**API Routes:**
- \`POST /api/users/signup\` - Đăng ký
- \`POST /api/users/signin\` - Đăng nhập
- \`POST /api/users/signout\` - Đăng xuất
- \`GET /api/users/currentuser\` - Lấy thông tin user hiện tại

**Environment:**
- \`JWT_KEY\` - Secret key để sign JWT
- \`MONGO_HOST\`, \`MONGO_PORT\` - MongoDB connection
- \`MONGO_USERNAME\`, \`MONGO_PASSWORD\` - Mongo credentials

**Database:** MongoDB \`auth\`
- Collection \`users\`

**Events:** Không publish/consume events

---

### 2. Products Service (\`datnx/product\`)

**Chức năng:**
- CRUD sản phẩm
- Quản lý inventory (quantity)
- **Giảm quantity khi nhận event PaymentCreated**
- Publish events khi tạo/update sản phẩm

**API Routes:**
- \`GET /api/products\` - List tất cả sản phẩm
- \`GET /api/products/:id\` - Chi tiết sản phẩm
- \`POST /api/products\` - Tạo sản phẩm mới (auth required)
- \`PUT /api/products/:id\` - Update sản phẩm (owner only)

**Environment:**
- \`JWT_KEY\`
- \`NATS_URL\` - \`http://nats-svc:4222\`
- \`NATS_CLUSTER_ID\` - \`ticketing\`
- \`NATS_CLIENT_ID\` - Pod name (unique)
- Mongo credentials

**Database:** MongoDB \`products\`
- Collection \`products\`

**Events:**
- **Publish:** \`ProductCreated\`, \`ProductUpdated\`
- **Consume:** \`PaymentCreated\` → Giảm quantity theo items

---

### 3. Cart Service (\`datnx/cart\`)

**Chức năng:**
- Quản lý giỏ hàng user
- Add/remove items
- **Giữ items cho đến khi payment thành công**
- Clear cart sau khi nhận PaymentCreated

**API Routes:**
- \`GET /api/cart\` - Lấy giỏ hàng hiện tại
- \`POST /api/cart/items\` - Thêm item vào cart
- \`DELETE /api/cart/items/:productId\` - Xóa item khỏi cart

**Environment:**
- \`JWT_KEY\`
- \`NATS_URL\`, \`NATS_CLUSTER_ID\`, \`NATS_CLIENT_ID\`
- Mongo credentials

**Database:** MongoDB \`cart\`
- Collection \`carts\`

**Events:**
- **Consume:** \`PaymentCreated\` → Xóa purchased items khỏi cart

---

### 4. Orders Service (\`datnx/order\`)

**Chức năng:**
- Tạo order từ cart items
- **KHÔNG có expiration** - Order không tự động hủy
- **KHÔNG lock sản phẩm** - Sản phẩm vẫn available cho người khác
- Cancel order manually

**API Routes:**
- \`POST /api/orders\` - Tạo order mới
- \`GET /api/orders\` - List orders của user
- \`GET /api/orders/:id\` - Chi tiết order
- \`DELETE /api/orders/:id\` - Cancel order

**Environment:**
- \`JWT_KEY\`
- \`NATS_URL\`, \`NATS_CLUSTER_ID\`, \`NATS_CLIENT_ID\`
- Mongo credentials

**Database:** MongoDB \`orders\`
- Collection \`orders\`

**Events:**
- **Publish:** \`OrderCreated\`, \`OrderCancelled\`
- **Consume:** \`PaymentCreated\` → Update order status = Complete

---

### 5. Payments Service (\`datnx/payment\`)

**Chức năng:**
- Xử lý thanh toán qua Stripe Charges API
- Verify order ownership & status
- Publish PaymentCreated với danh sách items

**API Routes:**
- \`POST /api/payments\` - Tạo payment charge
  - Body: \`{ token, orderId }\`
  - Token: Stripe token từ Elements

**Environment:**
- \`JWT_KEY\`
- \`STRIPE_SECRET_KEY\` - Stripe secret key (test mode)
- \`NATS_URL\`, \`NATS_CLUSTER_ID\`, \`NATS_CLIENT_ID\`
- Mongo credentials

**Database:** MongoDB \`payments\`
- Collection \`payments\`
- Collection \`orders\` (replica để validate)

**Events:**
- **Publish:** \`PaymentCreated\` - Include \`orderId\` và \`items[]\`
- **Consume:** \`OrderCreated\`, \`OrderCancelled\` - Sync order data locally

---

### 6. Client (\`datnx/client\`)

**Chức năng:**
- Next.js 16 SSR application
- Stripe Elements integration (modern card form)
- Production build với custom \`server.js\`
- Cookie-based authentication

**Tech:**
- Next.js 16 (Pages Router)
- React 19
- Bootstrap 5
- Axios
- \`@stripe/stripe-js\` + \`@stripe/react-stripe-js\`

**Environment:**
- \`NEXT_PUBLIC_STRIPE_KEY\` - Stripe publishable key
  - Injected từ K8s secret \`stripe-secret\`
  - Passed qua SSR props để runtime-safe

**Pages:**
- \`/\` - Landing page
- \`/auth/signup\`, \`/auth/signin\`, \`/auth/signout\`
- \`/products/new\` - Tạo sản phẩm
- \`/orders/:orderId\` - Order detail + Stripe payment form
- \`/orders/sell\` - Quản lý sản phẩm của seller

---

### 7. NATS Streaming

**Image:** \`nats-streaming:0.17.0\`

**Config:**
- Cluster ID: \`ticketing\`
- Client port: \`4222\`
- Monitoring: \`8222\`

**Purpose:**
- Event bus cho inter-service communication
- At-least-once delivery
- Queue groups để load balance

---

### 8. Shared Package: \`@datnxecommerce/common\`

**Nội dung:**
- Custom errors (BadRequestError, NotFoundError, etc.)
- Middlewares: \`requireAuth\`, \`currentUser\`, \`validateRequest\`, \`errorHandler\`
- Event base classes: \`Publisher\`, \`Listener\`
- Event interfaces: \`ProductCreated\`, \`OrderCreated\`, \`PaymentCreated\`, etc.

**Update workflow:**
\`\`\`bash
cd common
npm run pub   # Build, bump version, publish
cd ../products
npm install @datnxecommerce/common@latest
\`\`\`

---

## 📊 Database Schemas

### Auth Database (MongoDB: \`auth\`)

#### Collection: \`users\`

| Field | Type | Required | Unique | Index | Description |
|-------|------|----------|--------|-------|-------------|
| \`_id\` | ObjectId | ✅ | ✅ | Primary | Auto-generated |
| \`email\` | String | ✅ | ✅ | Yes | Email (lowercase) |
| \`password\` | String | ✅ | ❌ | No | Hashed với scrypt |
| \`__v\` | Number | ✅ | ❌ | No | Mongoose version |

**Example:**
\`\`\`json
{
  "_id": "673abc123def456789012345",
  "email": "user@test.com",
  "password": "$scrypt$...",
  "__v": 0
}
\`\`\`

---

### Products Database (MongoDB: \`products\`)

#### Collection: \`products\`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| \`_id\` | ObjectId | ✅ | Auto-generated |
| \`title\` | String | ✅ | Tên sản phẩm |
| \`price\` | Number | ✅ | Giá (>= 0) |
| \`quantity\` | Number | ✅ | Số lượng tồn kho |
| \`userId\` | String | ✅ | Owner user ID |
| \`version\` | Number | ✅ | OCC version |
| \`__v\` | Number | ✅ | Mongoose version |

**Business Logic:**
- Quantity chỉ giảm khi nhận \`PaymentCreated\` event
- Không có field \`orderId\` (không lock sản phẩm)
- Version tăng mỗi khi update

**Example:**
\`\`\`json
{
  "_id": "673prod123456789012345",
  "title": "iPhone 15 Pro",
  "price": 999,
  "quantity": 50,
  "userId": "673abc123def456789012345",
  "version": 2,
  "__v": 0
}
\`\`\`

---

### Cart Database (MongoDB: \`cart\`)

#### Collection: \`carts\`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| \`_id\` | ObjectId | ✅ | Auto-generated |
| \`userId\` | String | ✅ | User owner |
| \`items\` | Array | ✅ | Danh sách items |
| \`items[].productId\` | String | ✅ | Product reference |
| \`items[].quantity\` | Number | ✅ | Số lượng |
| \`__v\` | Number | ✅ | Mongoose version |

**Example:**
\`\`\`json
{
  "_id": "673cart123456789012345",
  "userId": "673abc123def456789012345",
  "items": [
    { "productId": "673prod111111111111111", "quantity": 2 },
    { "productId": "673prod222222222222222", "quantity": 1 }
  ],
  "__v": 0
}
\`\`\`

---

### Orders Database (MongoDB: \`orders\`)

#### Collection: \`orders\`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| \`_id\` | ObjectId | ✅ | Auto-generated |
| \`userId\` | String | ✅ | User owner |
| \`status\` | String (Enum) | ✅ | Created, Cancelled, Complete, AwaitingPayment |
| \`items\` | Array | ✅ | Snapshot items |
| \`items[].productId\` | String | ✅ | Product ID |
| \`items[].titleSnapshot\` | String | ✅ | Title lúc đặt hàng |
| \`items[].priceSnapshot\` | Number | ✅ | Price lúc đặt hàng |
| \`items[].quantity\` | Number | ✅ | Số lượng |
| \`total\` | Number | ✅ | Tổng tiền |
| \`version\` | Number | ✅ | OCC version |
| \`__v\` | Number | ✅ | Mongoose version |

**Lưu ý:**
- ❌ **KHÔNG có field \`expiredAt\`** (đã loại bỏ expiration)
- Status flow: \`Created\` → \`Complete\` (hoặc \`Cancelled\`)

**Example:**
\`\`\`json
{
  "_id": "673order123456789012345",
  "userId": "673abc123def456789012345",
  "status": "Created",
  "items": [
    {
      "productId": "673prod111111111111111",
      "titleSnapshot": "iPhone 15 Pro",
      "priceSnapshot": 999,
      "quantity": 1
    }
  ],
  "total": 999,
  "version": 0,
  "__v": 0
}
\`\`\`

---

### Payments Database (MongoDB: \`payments\`)

#### Collection: \`payments\`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| \`_id\` | ObjectId | ✅ | Auto-generated |
| \`orderId\` | String | ✅ | Order reference |
| \`stripeId\` | String | ✅ | Stripe charge ID (ch_xxx) |
| \`__v\` | Number | ✅ | Mongoose version |

**Example:**
\`\`\`json
{
  "_id": "673pay123456789012345",
  "orderId": "673order123456789012345",
  "stripeId": "ch_3STDSfRRsPUjHZ5Y10uLGpsR",
  "__v": 0
}
\`\`\`

#### Collection: \`orders\` (Replica)

Local cache để validate order trước khi payment:

| Field | Type | Description |
|-------|------|-------------|
| \`_id\` | String | Order ID từ Orders service |
| \`userId\` | String | User owner |
| \`status\` | String | Order status |
| \`total\` | Number | Total amount |
| \`version\` | Number | Sync version |

---

## 📨 Event Architecture

### Event Catalog

| Event | Publisher | Consumers | Purpose |
|-------|-----------|-----------|---------|
| \`ProductCreated\` | Products | (none currently) | Notify khi có sản phẩm mới |
| \`ProductUpdated\` | Products | (none currently) | Notify khi sản phẩm thay đổi |
| \`OrderCreated\` | Orders | Payments | Replicate order data để validate |
| \`OrderCancelled\` | Orders | Payments | Update order status locally |
| \`PaymentCreated\` | Payments | Products, Cart, Orders | Giảm inventory, clear cart, mark order complete |

---

### Event Contracts

#### ProductCreated

\`\`\`typescript
interface ProductCreatedEvent {
  subject: 'product:created';
  data: {
    id: string;
    title: string;
    price: number;
    quantity: number;
    userId: string;
    version: number;
  };
}
\`\`\`

**Example:**
\`\`\`json
{
  "subject": "product:created",
  "data": {
    "id": "673prod123456789012345",
    "title": "iPhone 15 Pro",
    "price": 999,
    "quantity": 50,
    "userId": "673abc123def456789012345",
    "version": 0
  }
}
\`\`\`

---

#### ProductUpdated

\`\`\`typescript
interface ProductUpdatedEvent {
  subject: 'product:updated';
  data: {
    id: string;
    title: string;
    price: number;
    quantity: number;
    userId: string;
    version: number;
  };
}
\`\`\`

**Example:**
\`\`\`json
{
  "subject": "product:updated",
  "data": {
    "id": "673prod123456789012345",
    "title": "iPhone 15 Pro - Updated",
    "price": 899,
    "quantity": 45,
    "userId": "673abc123def456789012345",
    "version": 2
  }
}
\`\`\`

---

#### OrderCreated

\`\`\`typescript
interface OrderCreatedEvent {
  subject: 'order:created';
  data: {
    id: string;
    userId: string;
    status: 'Created';
    items: Array<{
      productId: string;
      titleSnapshot: string;
      priceSnapshot: number;
      quantity: number;
    }>;
    total: number;
    version: number;
  };
}
\`\`\`

**Example:**
\`\`\`json
{
  "subject": "order:created",
  "data": {
    "id": "673order123456789012345",
    "userId": "673abc123def456789012345",
    "status": "Created",
    "items": [
      {
        "productId": "673prod111111111111111",
        "titleSnapshot": "iPhone 15 Pro",
        "priceSnapshot": 999,
        "quantity": 1
      }
    ],
    "total": 999,
    "version": 0
  }
}
\`\`\`

---

#### OrderCancelled

\`\`\`typescript
interface OrderCancelledEvent {
  subject: 'order:cancelled';
  data: {
    id: string;
    version: number;
  };
}
\`\`\`

**Example:**
\`\`\`json
{
  "subject": "order:cancelled",
  "data": {
    "id": "673order123456789012345",
    "version": 1
  }
}
\`\`\`

---

#### PaymentCreated (Quan trọng nhất!)

\`\`\`typescript
interface PaymentCreatedEvent {
  subject: 'payment:created';
  data: {
    id: string;
    orderId: string;
    stripeId: string;
    items: Array<{
      productId: string;
      quantity: number;
    }>;
  };
}
\`\`\`

**Example:**
\`\`\`json
{
  "subject": "payment:created",
  "data": {
    "id": "673pay123456789012345",
    "orderId": "673order123456789012345",
    "stripeId": "ch_3STDSfRRsPUjHZ5Y10uLGpsR",
    "items": [
      {
        "productId": "673prod111111111111111",
        "quantity": 1
      }
    ]
  }
}
\`\`\`

**Khi event này được publish:**
1. **Products service** giảm quantity của từng product
2. **Cart service** xóa purchased items khỏi cart
3. **Orders service** update order status = \`Complete\`

---

## 🔄 Luồng hoạt động (Flows)

### Flow 1: User mua hàng thành công (Happy Path)

\`\`\`
┌──────────┐
│  User    │
│ (Browser)│
└────┬─────┘
     │
     │ 1. Add sản phẩm vào cart
     │    POST /api/cart/items { productId, quantity }
     ▼
┌────────────────┐
│  Cart Service  │
│                │
│ - Save to DB   │
│ - Return cart  │
└────────────────┘
     │
     │ 2. User checkout
     │    POST /api/orders { items: [...] }
     ▼
┌────────────────────────────────────────┐
│  Orders Service                        │
│                                        │
│ - Tạo order với status: Created       │
│ - Snapshot title/price của products   │
│ - Tính total                           │
│ - KHÔNG lock sản phẩm ❌               │
│ - KHÔNG set expiredAt ❌               │
│ - Save to DB                           │
└────┬───────────────────────────────────┘
     │
     │ Publish: OrderCreated
     ▼
┌──────────────┐
│  NATS Bus    │
└────┬─────────┘
     │
     │ Broadcast
     ▼
┌─────────────────────┐
│ Payments Service    │
│                     │
│ - Replicate order   │
│   to local DB       │
│ - msg.ack()         │
└─────────────────────┘
     │
     │ 3. User nhập thẻ và thanh toán
     │    POST /api/payments { token, orderId }
     ▼
┌───────────────────────────────────────────┐
│  Payments Service                         │
│                                           │
│ - Verify order exists & status = Created │
│ - Verify user ownership                   │
│ - Call Stripe API (charges.create)       │
│ - Save payment record                     │
│ - Publish: PaymentCreated (with items)   │
└────┬──────────────────────────────────────┘
     │
     │ Publish: PaymentCreated
     ▼
┌──────────────┐
│  NATS Bus    │
└────┬─────────┘
     │
     │ Broadcast đến 3 consumers
     │
     ├──────────────────────┐
     │                      │
     ▼                      ▼
┌──────────────┐   ┌────────────────┐
│ Products Svc │   │   Cart Svc     │
│              │   │                │
│ - Tìm product│   │ - Tìm cart     │
│ - Giảm qty   │   │ - Xóa items    │
│ - Save       │   │   đã mua       │
│ - msg.ack()  │   │ - Save         │
└──────────────┘   │ - msg.ack()    │
                   └────────────────┘
     │
     ▼
┌──────────────┐
│  Orders Svc  │
│              │
│ - Update     │
│   status =   │
│   Complete   │
│ - msg.ack()  │
└──────────────┘

✅ Hoàn tất: Product quantity giảm, cart cleared, order complete
\`\`\`

---

### Flow 2: User cancel order

\`\`\`
┌──────────┐
│  User    │
└────┬─────┘
     │
     │ DELETE /api/orders/:id
     ▼
┌─────────────────────────────────┐
│  Orders Service                 │
│                                 │
│ - Verify ownership              │
│ - Find order                    │
│ - Check status = Created        │
│ - Update status = Cancelled     │
│ - Save to DB                    │
└────┬────────────────────────────┘
     │
     │ Publish: OrderCancelled
     ▼
┌──────────────┐
│  NATS Bus    │
└────┬─────────┘
     │
     │ Broadcast
     ▼
┌─────────────────────┐
│ Payments Service    │
│                     │
│ - Update local      │
│   order status      │
│ - msg.ack()         │
└─────────────────────┘

✅ Order bị hủy, NHƯNG:
- ❌ Quantity KHÔNG tăng lại (vì chưa bao giờ giảm)
- ❌ Không có notification (có thể thêm sau)
\`\`\`

**Lưu ý quan trọng:**
- Khi cancel order, quantity **KHÔNG được restore** vì nó chưa bao giờ bị giảm
- Quantity chỉ giảm sau khi payment thành công

---

### Flow 3: Create/Update Product

\`\`\`
┌──────────┐
│  Seller  │
└────┬─────┘
     │
     │ POST /api/products { title, price, quantity }
     ▼
┌─────────────────────────────────┐
│  Products Service               │
│                                 │
│ - Validate JWT                  │
│ - Validate input                │
│ - Create product với version=0  │
│ - Save to DB                    │
└────┬────────────────────────────┘
     │
     │ Publish: ProductCreated
     ▼
┌──────────────┐
│  NATS Bus    │
└──────────────┘

(Hiện tại không có consumer nào listen ProductCreated)

─────────────────────────────────

│ PUT /api/products/:id { price: 899 }
▼
┌─────────────────────────────────┐
│  Products Service               │
│                                 │
│ - Verify ownership (userId)     │
│ - Update fields                 │
│ - Increment version             │
│ - Save to DB                    │
└────┬────────────────────────────┘
     │
     │ Publish: ProductUpdated
     ▼
┌──────────────┐
│  NATS Bus    │
└──────────────┘

✅ Product được update với version mới
\`\`\`

---

## 🚀 Cài đặt local (Minikube + mkcert)

### Prerequisites

- **Minikube** (hoặc Docker Desktop with Kubernetes)
- **kubectl** CLI
- **Skaffold** CLI
- **Node.js 20+** và **npm**
- **mkcert** - Tạo self-signed certificates

### Bước 1: Cài đặt tools

\`\`\`bash
# macOS
brew install minikube kubectl skaffold mkcert

# hoặc download từ:
# https://minikube.sigs.k8s.io/
# https://skaffold.dev/
# https://github.com/FiloSottile/mkcert
\`\`\`

---

### Bước 2: Start Minikube cluster

\`\`\`bash
# Start với 4 CPU, 8GB RAM
minikube start --cpus=4 --memory=8192

# Enable ingress addon
minikube addons enable ingress

# Verify
kubectl get nodes
# NAME       STATUS   ROLES           AGE   VERSION
# minikube   Ready    control-plane   1m    v1.28.3
\`\`\`

---

### Bước 3: Start Minikube tunnel

**Quan trọng:** Terminal này phải chạy suốt quá trình dev

\`\`\`bash
minikube tunnel
# ✅  Tunnel successfully started
# 📌  Keep this terminal open
\`\`\`

---

### Bước 4: Cấu hình domain & TLS

#### 4.1. Tạo TLS certificate với mkcert

\`\`\`bash
# Install root CA (chỉ cần 1 lần)
mkcert -install

# Generate certificate cho domain
mkcert ecommerce.local

# Tạo K8s secret
kubectl create secret tls ecommerce-local-tls \
  --cert=ecommerce.local.pem \
  --key=ecommerce.local-key.pem

# Verify
kubectl get secret ecommerce-local-tls
\`\`\`

#### 4.2. Thêm domain vào \`/etc/hosts\`

\`\`\`bash
echo "127.0.0.1 ecommerce.local" | sudo tee -a /etc/hosts

# Verify
cat /etc/hosts | grep ecommerce
# 127.0.0.1 ecommerce.local
\`\`\`

---

### Bước 5: Tạo Kubernetes secrets

#### 5.1. JWT Secret (cho Auth service)

\`\`\`bash
kubectl create secret generic jwt-secret \
  --from-literal=JWT_KEY='dev_jwt_secret_key_12345'

# Verify
kubectl get secret jwt-secret
\`\`\`

#### 5.2. Stripe Secret (cho Payments service)

**Lấy API keys từ:** https://dashboard.stripe.com/test/apikeys

\`\`\`bash
kubectl create secret generic stripe-secret \
  --from-literal=STRIPE_SECRET_KEY='sk_test_YOUR_SECRET_KEY_HERE' \
  --from-literal=STRIPE_PUBLISHABLE_KEY='pk_test_YOUR_PUBLISHABLE_KEY_HERE'

# Verify
kubectl get secret stripe-secret
kubectl describe secret stripe-secret
\`\`\`

**Lưu ý:**
- Thay \`sk_test_YOUR_SECRET_KEY_HERE\` và \`pk_test_YOUR_PUBLISHABLE_KEY_HERE\` bằng keys thật từ Stripe Dashboard
- Dùng **test mode keys**, KHÔNG dùng live keys
- ⚠️ **KHÔNG commit keys thật vào Git!**

#### 5.3. Mongo credentials secrets

Các secrets này đã được template sẵn trong \`infra/k8s/config/\`:
- \`mongo-auth-secret\`
- \`mongo-product-secret\`
- \`mongo-order-secret\`
- \`mongo-payment-secret\`
- \`mongo-cart-secret\`

\`\`\`bash
# Apply tất cả config
kubectl apply -f infra/k8s/config/
\`\`\`

---

### Bước 6: Start development với Skaffold

\`\`\`bash
# Từ thư mục root của project
skaffold dev

# Skaffold sẽ:
# 1. Build Docker images cho tất cả services
# 2. Push images vào Minikube registry
# 3. Deploy tất cả K8s manifests
# 4. Stream logs từ tất cả pods
# 5. Auto-rebuild khi có code changes
\`\`\`

**Đợi cho đến khi thấy:**
\`\`\`
[client] > Ready on http://0.0.0.0:3000
[auth] Server listening on port 3000
[products] Server listening on port 3000
[orders] Server listening on port 3000
[payments] Server listening on port 3000
[cart] Server listening on port 3000
\`\`\`

---

### Bước 7: Access application

\`\`\`bash
# Open browser
open https://ecommerce.local

# hoặc
curl -k https://ecommerce.local
\`\`\`

**Nếu browser warning về certificate:**
- Click "Advanced" → "Proceed to ecommerce.local"
- Lý do: Self-signed cert từ mkcert

---

### Verify deployment

\`\`\`bash
# Check pods
kubectl get pods
# NAME                          READY   STATUS    RESTARTS   AGE
# auth-depl-xxx                 1/1     Running   0          2m
# cart-depl-xxx                 1/1     Running   0          2m
# client-depl-xxx               1/1     Running   0          2m
# nats-depl-xxx                 1/1     Running   0          2m
# order-depl-xxx                1/1     Running   0          2m
# payment-depl-xxx              1/1     Running   0          2m
# product-depl-xxx              1/1     Running   0          2m
# ...mongo pods...

# Check services
kubectl get svc
# NAME                  TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)
# auth-svc              ClusterIP   10.96.x.x        <none>        3000/TCP
# cart-svc              ClusterIP   10.96.x.x        <none>        3000/TCP
# client-svc            ClusterIP   10.96.x.x        <none>        3000/TCP
# nats-svc              ClusterIP   10.96.x.x        <none>        4222/TCP,8222/TCP
# ...

# Check ingress
kubectl get ingress
# NAME              CLASS   HOSTS              ADDRESS        PORTS
# ingress-service   nginx   ecommerce.local    192.168.49.2   80, 443
\`\`\`

---

## ☸️ Kubernetes Infrastructure

### Ingress Configuration

**File:** \`infra/k8s/ingress/ingress.yaml\`

\`\`\`yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ingress-service
  annotations:
    kubernetes.io/ingress.class: "nginx"
spec:
  tls:
    - hosts:
        - ecommerce.local
      secretName: ecommerce-local-tls
  ingressClassName: nginx
  rules:
  - host: ecommerce.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: client-svc
            port:
              number: 3000
      - path: /api/users
        pathType: Prefix
        backend:
          service:
            name: auth-svc
            port:
              number: 3000
      - path: /api/products
        pathType: Prefix
        backend:
          service:
            name: product-svc
            port:
              number: 3000
      - path: /api/cart
        pathType: Prefix
        backend:
          service:
            name: cart-svc
            port:
              number: 3000
      - path: /api/orders
        pathType: Prefix
        backend:
          service:
            name: order-svc
            port:
              number: 3000
      - path: /api/payments
        pathType: Prefix
        backend:
          service:
            name: payment-svc
            port:
              number: 3000
\`\`\`

**Routes:**
- \`/\` → Client (Next.js)
- \`/api/users/*\` → Auth service
- \`/api/products/*\` → Products service
- \`/api/cart/*\` → Cart service
- \`/api/orders/*\` → Orders service
- \`/api/payments/*\` → Payments service

---

### Service Deployments

Mỗi service có:
- **Deployment** - Pod replicas (default: 1)
- **Service** - ClusterIP cho internal communication
- **MongoDB Deployment + Service** - Dedicated database
- **ConfigMap** - Mongo host/port
- **Secret** - Mongo credentials

**Example: Products Deployment**

\`\`\`yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: product-depl
spec:
  replicas: 1
  selector:
    matchLabels:
      app: product
  template:
    metadata:
      labels:
        app: product
    spec:
      containers:
      - name: product
        image: datnx/product:latest
        env:
        - name: JWT_KEY
          valueFrom:
            secretKeyRef:
              name: jwt-secret
              key: JWT_KEY
        - name: NATS_URL
          value: http://nats-svc:4222
        - name: NATS_CLUSTER_ID
          value: ticketing
        - name: NATS_CLIENT_ID
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        # ... Mongo env vars
\`\`\`

---

### Environment Variables per Service

#### Auth Service
- \`JWT_KEY\` - Secret từ \`jwt-secret\`
- \`MONGO_HOST\`, \`MONGO_PORT\` - ConfigMap
- \`MONGO_USERNAME\`, \`MONGO_PASSWORD\` - Secret

#### Products/Orders/Payments/Cart Services
- \`JWT_KEY\` - Secret từ \`jwt-secret\`
- \`NATS_URL\` - \`http://nats-svc:4222\`
- \`NATS_CLUSTER_ID\` - \`ticketing\`
- \`NATS_CLIENT_ID\` - Pod name (unique)
- Mongo credentials - ConfigMap + Secret

#### Payments Service (thêm)
- \`STRIPE_SECRET_KEY\` - Secret từ \`stripe-secret\`

#### Client
- \`NEXT_PUBLIC_STRIPE_KEY\` - Secret từ \`stripe-secret.STRIPE_PUBLISHABLE_KEY\`

---

## 🧪 Test với Postman

### Import Postman Collection

**File:** \`infra/postman/ecommerce.postman_collection.json\`

1. Mở Postman
2. File → Import → \`infra/postman/ecommerce.postman_collection.json\`
3. Tạo Environment:
   - \`baseUrl\` = \`https://ecommerce.local\`

---

### Test Scenarios

#### Scenario 1: User Registration & Login

**1.1. Signup**
\`\`\`http
POST {{baseUrl}}/api/users/signup
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
\`\`\`

**Response:** \`201 Created\`
\`\`\`json
{
  "id": "673abc123def456789012345",
  "email": "test@example.com"
}
\`\`\`

**1.2. Signin**
\`\`\`http
POST {{baseUrl}}/api/users/signin
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
\`\`\`

**Response:** \`200 OK\`
\`\`\`json
{
  "id": "673abc123def456789012345",
  "email": "test@example.com"
}
\`\`\`

**Cookie được set:** \`session\` (HTTP-only, Secure)

**1.3. Current User**
\`\`\`http
GET {{baseUrl}}/api/users/currentuser
\`\`\`

**Response:** \`200 OK\`
\`\`\`json
{
  "currentUser": {
    "id": "673abc123def456789012345",
    "email": "test@example.com",
    "iat": 1731408000
  }
}
\`\`\`

---

#### Scenario 2: Product Management

**2.1. Create Product**
\`\`\`http
POST {{baseUrl}}/api/products
Content-Type: application/json

{
  "title": "iPhone 15 Pro",
  "price": 999,
  "quantity": 50
}
\`\`\`

**Response:** \`201 Created\`
\`\`\`json
{
  "id": "673prod123456789012345",
  "title": "iPhone 15 Pro",
  "price": 999,
  "quantity": 50,
  "userId": "673abc123def456789012345",
  "version": 0
}
\`\`\`

**💡 Save \`id\` vào variable \`productId\`**

**2.2. List Products**
\`\`\`http
GET {{baseUrl}}/api/products
\`\`\`

**Response:** \`200 OK\`
\`\`\`json
[
  {
    "id": "673prod123456789012345",
    "title": "iPhone 15 Pro",
    "price": 999,
    "quantity": 50,
    ...
  }
]
\`\`\`

**2.3. Get Product**
\`\`\`http
GET {{baseUrl}}/api/products/{{productId}}
\`\`\`

**2.4. Update Product**
\`\`\`http
PUT {{baseUrl}}/api/products/{{productId}}
Content-Type: application/json

{
  "price": 899
}
\`\`\`

---

#### Scenario 3: Shopping Cart

**3.1. Add Item to Cart**
\`\`\`http
POST {{baseUrl}}/api/cart/items
Content-Type: application/json

{
  "productId": "{{productId}}",
  "quantity": 2
}
\`\`\`

**Response:** \`200 OK\`
\`\`\`json
{
  "id": "673cart123456789012345",
  "userId": "673abc123def456789012345",
  "items": [
    {
      "productId": "673prod123456789012345",
      "quantity": 2
    }
  ]
}
\`\`\`

**3.2. Get Cart**
\`\`\`http
GET {{baseUrl}}/api/cart
\`\`\`

---

#### Scenario 4: Order & Payment (Complete Flow)

**4.1. Create Order**
\`\`\`http
POST {{baseUrl}}/api/orders
Content-Type: application/json

{
  "items": [
    {
      "productId": "{{productId}}",
      "quantity": 1
    }
  ]
}
\`\`\`

**Response:** \`201 Created\`
\`\`\`json
{
  "id": "673order123456789012345",
  "userId": "673abc123def456789012345",
  "status": "Created",
  "items": [
    {
      "productId": "673prod123456789012345",
      "titleSnapshot": "iPhone 15 Pro",
      "priceSnapshot": 999,
      "quantity": 1
    }
  ],
  "total": 999,
  "version": 0
}
\`\`\`

**💡 Save \`id\` vào variable \`orderId\`**

**4.2. Get Order**
\`\`\`http
GET {{baseUrl}}/api/orders/{{orderId}}
\`\`\`

**4.3. Payment**
\`\`\`http
POST {{baseUrl}}/api/payments
Content-Type: application/json

{
  "token": "tok_visa",
  "orderId": "{{orderId}}"
}
\`\`\`

**Token:** \`tok_visa\` là Stripe test token (works in test mode)

**Response:** \`201 Created\`
\`\`\`json
{
  "id": "673pay123456789012345",
  "orderId": "673order123456789012345",
  "stripeId": "ch_3STDSfRRsPUjHZ5Y10uLGpsR"
}
\`\`\`

**4.4. Verify Order Completed**
\`\`\`http
GET {{baseUrl}}/api/orders/{{orderId}}
\`\`\`

**Response:** \`status\` = \`"Complete"\`

**4.5. Verify Product Quantity Decreased**
\`\`\`http
GET {{baseUrl}}/api/products/{{productId}}
\`\`\`

**Response:** \`quantity\` giảm từ \`50\` → \`49\`

**4.6. Verify Cart Cleared**
\`\`\`http
GET {{baseUrl}}/api/cart
\`\`\`

**Response:** \`items\` = \`[]\` (empty)

---

#### Scenario 5: Cancel Order

**5.1. Create Order (lặp lại step 4.1)**

**5.2. Cancel Order**
\`\`\`http
DELETE {{baseUrl}}/api/orders/{{orderId}}
\`\`\`

**Response:** \`204 No Content\`

**5.3. Verify Order Cancelled**
\`\`\`http
GET {{baseUrl}}/api/orders/{{orderId}}
\`\`\`

**Response:** \`status\` = \`"Cancelled"\`

**5.4. Verify Product Quantity KHÔNG thay đổi**
\`\`\`http
GET {{baseUrl}}/api/products/{{productId}}
\`\`\`

**Response:** \`quantity\` vẫn như cũ (vì chưa payment nên chưa giảm)

---

### Error Responses

#### 401 Unauthorized
\`\`\`json
{
  "errors": [
    { "message": "Not authorized" }
  ]
}
\`\`\`

**Fix:** Signup/Signin để có session cookie

#### 400 Bad Request
\`\`\`json
{
  "errors": [
    {
      "message": "Email must be valid",
      "field": "email"
    }
  ]
}
\`\`\`

#### 404 Not Found
\`\`\`json
{
  "errors": [
    { "message": "Not Found" }
  ]
}
\`\`\`

---

## 🐛 Troubleshooting

### 1. Stripe Publishable Key không work

**Triệu chứng:**
- Stripe Elements hiển thị error "Invalid API key"
- Console log: \`401 Unauthorized\` từ \`api.stripe.com\`

**Debug steps:**

\`\`\`bash
# 1. Check env trong client pod
kubectl exec -it $(kubectl get pods -l app=client -o jsonpath='{.items[0].metadata.name}') -- printenv | grep STRIPE
# Output: NEXT_PUBLIC_STRIPE_KEY=pk_test_xxx

# 2. Verify secret exists
kubectl get secret stripe-secret
kubectl describe secret stripe-secret

# 3. Check secret value
kubectl get secret stripe-secret -o jsonpath='{.data.STRIPE_PUBLISHABLE_KEY}' | base64 -d
\`\`\`

**Fix:**
\`\`\`bash
# Delete và recreate secret với key đúng
kubectl delete secret stripe-secret

kubectl create secret generic stripe-secret \
  --from-literal=STRIPE_SECRET_KEY='sk_test_xxx' \
  --from-literal=STRIPE_PUBLISHABLE_KEY='pk_test_xxx'

# Restart client pod
kubectl delete pod -l app=client
\`\`\`

---

### 2. CORS/Cookie issues

**Triệu chứng:**
- Login thành công nhưng \`currentuser\` trả về \`null\`
- Cookie không được set

**Fix:**
- Ensure access via \`https://ecommerce.local\` (NOT \`localhost\`)
- Verify \`/etc/hosts\` có entry đúng
- Check browser DevTools → Application → Cookies

---

### 3. NATS connection errors

**Triệu chứng:**
\`\`\`
Error: Could not connect to NATS server
\`\`\`

**Debug:**
\`\`\`bash
# Check NATS pod
kubectl get pods -l app=nats
kubectl logs -l app=nats

# Check NATS service
kubectl get svc nats-svc
# Ensure port 4222 is exposed
\`\`\`

---

### 4. MongoDB connection refused

**Triệu chứng:**
\`\`\`
MongooseServerSelectionError: connect ECONNREFUSED
\`\`\`

**Debug:**
\`\`\`bash
# Check mongo pods
kubectl get pods | grep mongo

# Check service
kubectl get svc | grep mongo

# Check init container logs
kubectl logs <pod-name> -c wait-for-mongo
\`\`\`

**Fix:**
\`\`\`bash
# Restart deployment
kubectl rollout restart deployment product-depl
\`\`\`

---

### 5. Skaffold build fails

**Triệu chứng:**
\`\`\`
Build failed: exit code 1
\`\`\`

**Fix:**
\`\`\`bash
# Clear Docker cache
docker system prune -a

# Rebuild manually
cd auth
docker build -t datnx/auth:latest .

# Re-run skaffold
skaffold dev
\`\`\`

---

### 6. Port already in use (Minikube tunnel)

**Triệu chứng:**
\`\`\`
Error starting tunnel: port 80 already in use
\`\`\`

**Fix:**
\`\`\`bash
# Find process using port
sudo lsof -i :80

# Kill process
sudo kill -9 <PID>

# Restart tunnel
minikube tunnel
\`\`\`

---

### 7. Check logs

\`\`\`bash
# All pods
kubectl get pods

# Specific service logs
kubectl logs -f deployment/product-depl
kubectl logs -f deployment/client-depl

# Previous crash logs
kubectl logs <pod-name> --previous

# All containers in pod
kubectl logs <pod-name> --all-containers
\`\`\`

---

## 💻 Tech Stack

### Backend Services

| Tech | Version | Purpose |
|------|---------|---------|
| Node.js | 20+ | Runtime |
| TypeScript | 5.0+ | Language |
| Express.js | 5.0 | Web framework |
| Mongoose | 8.0+ | MongoDB ODM |
| JWT | - | Authentication |
| Express-validator | - | Input validation |
| Jest | - | Testing |
| Supertest | - | API testing |

### Frontend

| Tech | Version | Purpose |
|------|---------|---------|
| Next.js | 16.0 | React framework |
| React | 19.0 | UI library |
| Bootstrap | 5.3 | CSS framework |
| Axios | - | HTTP client |
| @stripe/stripe-js | 8.0+ | Stripe SDK |
| @stripe/react-stripe-js | 5.0+ | Stripe React components |

### Infrastructure

| Tech | Version | Purpose |
|------|---------|---------|
| Kubernetes | 1.28+ | Container orchestration |
| Minikube | Latest | Local K8s cluster |
| Docker | 24+ | Containerization |
| Skaffold | 2.0+ | Dev workflow |
| NATS Streaming | 0.17.0 | Event bus |
| MongoDB | 6.0+ | Database |
| NGINX Ingress | Latest | Load balancer |
| mkcert | Latest | Local TLS certificates |

### External Services

| Service | Purpose |
|---------|---------|
| Stripe | Payment processing (test mode) |

---

## 📚 Resources

- [NATS.io Documentation](https://docs.nats.io/)
- [Kubernetes Docs](https://kubernetes.io/docs/)
- [Next.js Docs](https://nextjs.org/docs)
- [Stripe API Docs](https://stripe.com/docs/api)
- [Skaffold Docs](https://skaffold.dev/docs/)

---

## 👨‍💻 Author

**DatNX**
- GitHub: [@Rayloveyou](https://github.com/Rayloveyou)
- NPM Org: [@datnxecommerce](https://www.npmjs.com/org/datnxecommerce)

---

## 📝 License

ISC License - Free to use and modify

---

## 🙏 Acknowledgments

- Stephen Grider's Microservices course
- NATS.io community
- Kubernetes community
- Next.js team

---

**⭐ Nếu project hữu ích, hãy cho 1 star nhé!**

**🚀 Happy Coding!**