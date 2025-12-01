# 🛒 Ecommerce Microservices Platform

A **modern e-commerce platform** built on microservices, designed for realistic production scenarios: **Node.js**, **TypeScript**, **Next.js 16**, **MongoDB**, **Apache Kafka**, **Stripe**, **MinIO**, and **Kubernetes** running on **Minikube** with TLS from **mkcert** covering `https://ecommerce.local`, `https://admin.ecommerce.local`, `https://minio.local`, and `https://minio-api.local`.

This project demonstrates:

- 🔐 **User Authentication & Session Management** with JWT cookies, refresh tokens, and Redis-based revocation
- 🧺 **Persistent Shopping Cart** that survives page refreshes and clears only after payment
- 🛍️ **Product Catalog & Inventory Management** with pagination, search, and category filtering backed by MinIO-hosted media
- 🧾 **Order Lifecycle** without product locking or automatic expiration (intentionally simplified)
- 💳 **Stripe Payments** with post-payment inventory reconciliation
- 📨 **Event-Driven Architecture** using Apache Kafka with topics, partitions, and consumer groups
- 🎨 **Modern UI/UX** with TikTok-inspired dark theme, gradient designs, and responsive layouts
- 👨‍💼 **Admin Dashboard** for product management, order tracking, and user administration
- 🚀 **Kubernetes-native workflow** powered by Skaffold, mkcert, and Minikube

---

## 📋 Table of Contents

- [Key Features](#-key-features)
- [Architecture Overview](#-architecture-overview)
- [Tech Stack](#-tech-stack)
- [Services](#-services)
- [Database Schemas](#-database-schemas)
- [Event Architecture](#-event-architecture)
- [Complete Flow Diagrams](#-complete-flow-diagrams)
- [UI/UX Features](#-uiux-features)
- [Getting Started](#-getting-started)
- [Development](#-development)
- [Testing with Postman](#-testing-with-postman)
- [Deployment](#-deployment)
- [Security Features](#-security-features)
- [Future Enhancements](#-future-enhancements)
- [Learning Resources](#-learning-resources)
- [Contributing](#-contributing)
- [License](#-license)
- [Author](#-author)
- [Acknowledgments](#-acknowledgments)
- [Support](#-support)

---

## ✨ Key Features

### Customer Features
- 🔍 **Product Search & Filtering** - Real-time search with category filtering and pagination
- 🛒 **Smart Shopping Cart** - Add/remove items with automatic cart persistence and stock validation
- 💳 **Secure Checkout** - Stripe integration with real-time payment processing
- 📦 **Order Management** - Track order status and payment history
- 🎨 **Modern Dark Theme** - TikTok-inspired gradient design with smooth animations
- 📱 **Responsive Design** - Optimized for desktop, tablet, and mobile devices
- 🔐 **Secure Authentication** - JWT-based auth with refresh tokens and automatic token rotation

### Admin Features
- 📊 **Dashboard Analytics** - Real-time sales, revenue, and order statistics with visual charts
- 🛍️ **Product Management** - Create, update, and delete products with image uploads to MinIO
- 📋 **Order Administration** - View all orders with filtering and status management
- 👥 **User Management** - Block/unblock users and manage permissions
- 🖼️ **Media Management** - MinIO-powered image hosting with automatic URL generation
- 📈 **Sales Reports** - Comprehensive analytics with date range filtering

### Technical Features
- ⚡ **Event-Driven Architecture** - Apache Kafka for reliable inter-service communication
- 🔄 **Data Consistency** - Optimistic concurrency control with version tracking
- 🗄️ **Database Per Service** - Independent MongoDB instances for each microservice
- 🔌 **Service Independence** - Services can be deployed and scaled independently
- 📨 **Async Communication** - Non-blocking event-based updates across services
- 🛡️ **Security First** - HTTPS-only, HTTP-only cookies, CORS protection, and Redis-based token revocation

---

## 🏗 Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                  Client (Next.js 16 SSR)     Admin (Next.js 16 SSR)              │
│               https://ecommerce.local      https://admin.ecommerce.local          │
└─────────────────────────┬────────────────────────────────────────────────────────┘
                          │
                ┌─────────▼──────────┐
                │   NGINX Ingress    │
                │   mkcert TLS       │
                └─────────┬──────────┘
                          │
        ┌─────────────────┼─────────────────────────────┬──────────────────┐
        │                 │                             │                  │
 ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐  ┌──────▼──────┐    │
 │ Auth Svc    │   │ Products    │   │ Orders Svc  │  │ Notifications│    │
 │ + Redis     │   │ Svc         │   │             │  │ Svc          │    │
 │ Mongo       │   │ Mongo       │   │ Mongo       │  │ (WebSocket)  │    │
 └─────────────┘   └──────┬──────┘   └──────┬──────┘  └──────────────┘    │
                          │                 │                              │
                   ┌──────▼──────┐   ┌──────▼──────┐                       │
                   │ Cart Svc    │   │ Payments    │                       │
                   │             │   │ Svc         │                       │
                   │ Mongo       │   │ Mongo       │                       │
                   └──────┬──────┘   └──────┬──────┘                       │
                          │                 │                              │
        ┌─────────────────┴─────────────────┴──────────────────────────────┘
        │
 ┌──────▼──────┐
 │   Kafka     │
 │ (Zookeeper) │
 │  + Broker   │
 └──────┬──────┘
        │
 ┌──────▼──────┐
 │   MinIO     │
 │  (S3-like)  │
 └─────────────┘
```

**Key design decisions**

- ✅ **Microservices + Database Per Service** – each service owns its schema on dedicated Mongo deployments
- ✅ **Event-Driven Communication** – asynchronous coordination via Apache Kafka with topics, partitions, and consumer groups
- ✅ **No Product Locking** – inventory is reduced only after `payment.created`, allowing optimistic selling
- ✅ **MinIO Storage** – local S3-compatible storage for product images served via dedicated ingress
- ✅ **Single Ingress / Multiple Domains** – `ecommerce.local` for the shop, `minio.local` for console, `minio-api.local` for object storage
- ✅ **Kafka Message Keys** – used for partition routing to ensure ordering (e.g., product.id, order.id)

---

## 🛠 Tech Stack

### Backend

- **Runtime:** Node.js 20+, TypeScript 5
- **Framework:** Express 5 + express-validator
- **Data:** MongoDB (per service) via Mongoose 8
- **Events:** Apache Kafka (kafkajs 2.2.4) with Zookeeper for coordination
- **Payments:** Stripe SDK (test mode)
- **Auth:** JWT in HTTP-only secure cookies
- **Testing:** Jest + Supertest
- **Caching/Revocation:** Redis for refresh tokens + user blocklist

### Frontend

- **Shop:** Next.js 16 (App Router) + React 19 at `https://ecommerce.local`
- **Admin Console:** Next.js 16 (App Router) + React 19 at `https://admin.ecommerce.local`
- **UI:** Bootstrap 5, Stripe Elements (`@stripe/react-stripe-js`)
- **HTTP:** Axios with SSR-aware helpers and server components
- **Realtime:** WebSocket notifications via `notifications` service

### Infrastructure

- **Cluster:** Kubernetes (Minikube or Docker Desktop)
- **Dev loop:** Skaffold for build/deploy/watch
- **Ingress:** NGINX Ingress Controller
- **Certificates:** mkcert-generated TLS secrets
- **Storage:** MinIO for product assets
- **Certificates:** mkcert for `ecommerce.local`, `admin.ecommerce.local`, `minio.local`, `minio-api.local`

### Shared Library

- **`@datnxecommerce/common`** (local npm package)
  - Custom errors & middlewares
  - Base Consumer/Producer classes
  - Event typings (`product.created`, `payment.created`, ...)

---

## 🎯 Services

### 1. Auth Service (`auth/`)

- User signup, signin, signout
- Password hashing with scrypt
- Issues JWT stored in `session` cookie
- Routes: `POST /api/users/signup`, `POST /api/users/signin`, `POST /api/users/signout`, `GET /api/users/currentuser`
- Database: Mongo `auth.users`
- Events: none

### 2. Products Service (`products/`)

- CRUD for products including MinIO image uploads
- Stores `imageUrl` pointing to `https://minio-api.local/<bucket>/<key>`
- Inventory is **not** decremented when orders are placed; only after payment
- Routes: `GET/POST/PUT /api/products`, `GET /api/products/:id`
- Events: publishes `product.created`, `product.updated`; consumes `payment.created`

### 3. Cart Service (`cart/`)

- Per-user cart stored in Mongo
- Holds items until a payment succeeds
- Consumes `payment.created` to clear purchased items
- Routes: `GET /api/cart`, `POST /api/cart/items`, `DELETE /api/cart/items/:productId`

### 4. Orders Service (`orders/`)

- Builds orders from cart snapshot; no expiration or locking
- Status: `Created`, `Complete`, `Cancelled`
- Consumes `payment.created` to mark orders complete
- Routes: `POST /api/orders`, `GET /api/orders`, `GET /api/orders/:id`, `DELETE /api/orders/:id`
- Events: publishes `order.created`, `order.cancelled`

### 5. Payments Service (`payments/`)

- Validates ownership and status before charging Stripe
- Emits `payment.created` with purchased items for downstream consumers
- Routes: `POST /api/payments`
- Events: publishes `payment.created`; consumes `order.created`, `order.cancelled`

### 6. Client (`client/`)

- Next.js 16 SSR storefront with TikTok-inspired dark theme
- Integrates Stripe Elements for modern card form
- Features: Product search, category filtering, pagination, responsive design
- Pages include `/`, `/auth/*`, `/products/:id`, `/cart`, `/orders/*`

### 7. Admin (`admin/`)

- Next.js 16 admin dashboard at `https://admin.ecommerce.local`
- Dashboard analytics with charts (sales, revenue, orders)
- Product management with image uploads
- Order administration with status tracking
- User management (block/unblock users)

### 8. Notifications Service (`notifications/`)

- WebSocket-based real-time notifications
- Push notifications for order updates and admin actions
- Redis-backed pub/sub for cross-instance messaging

### 9. MinIO (`infra/k8s/minio/`)

- Provides S3-compatible object storage with console + API ingress
- Credentials via `minio-secret`
- Auto-creates `product-images` bucket with public-read policy

### 10. Shared Package (`common/`)

- Houses reusable logic, event contracts, and middlewares, published locally via `npm run pub`

---

## 🗄 Database Schemas

### Auth (`auth.users`)

| Field      | Type     | Notes             |
| ---------- | -------- | ----------------- |
| `_id`      | ObjectId | Primary key       |
| `email`    | string   | Unique, lowercase |
| `password` | string   | Scrypt hash       |
| `__v`      | number   | Version key       |

### Products (`products.products`)

| Field      | Type     | Required | Unique | Index   | Description                                |
| ---------- | -------- | -------- | ------ | ------- | ------------------------------------------ |
| `_id`      | ObjectId | ✅       | ✅     | Primary | Auto-generated MongoDB ID                  |
| `title`    | String   | ✅       | ❌     | No      | Product/ticket title                       |
| `price`    | Number   | ✅       | ❌     | No      | Price (must be >= 0)                       |
| `quantity` | Number   | ✅       | ❌     | No      | Current stock quantity                     |
| `category` | String   | ✅       | ❌     | Yes     | Product category (10 options)              |
| `imageUrl` | String   | ❌       | ❌     | No      | MinIO public URL (optional)                |
| `userId`   | String   | ✅       | ❌     | No      | Owner's user ID (from JWT)                 |
| `version`  | Number   | ✅       | ❌     | Yes     | Version for optimistic concurrency control |
| `__v`      | Number   | ✅       | ❌     | No      | Mongoose version key                       |

**Product Categories:**
- `electronics`, `computers`, `audio`, `accessories`, `gaming`, `mobile`, `smart-home`, `wearables`, `storage`, `other`

**Business Rules:**

- Quantity chỉ giảm khi nhận `PaymentCreated` event (không lock khi tạo order)
- Version tăng mỗi khi update để đảm bảo OCC
- ImageUrl được lưu dưới dạng public URL từ MinIO: `https://minio-api.local/product-images/<key>`
- Category được dùng để filter và group products

**Example Document:**

```json
{
  "_id": "673prod123456789012345",
  "title": "iPhone 15 Pro",
  "price": 999,
  "quantity": 50,
  "category": "mobile",
  "imageUrl": "https://minio-api.local/product-images/uuid.jpg",
  "userId": "673abc123def456789012345",
  "version": 2,
  "__v": 0
}
```

### Cart (`cart.carts`)

| Field               | Type     | Required | Unique | Index   | Description                  |
| ------------------- | -------- | -------- | ------ | ------- | ---------------------------- |
| `_id`               | ObjectId | ✅       | ✅     | Primary | Auto-generated MongoDB ID    |
| `userId`            | String   | ✅       | ✅     | Yes     | User owner (unique per user) |
| `items[]`           | Array    | ✅       | ❌     | No      | Array of cart items          |
| `items[].productId` | String   | ✅       | ❌     | No      | Product ID reference         |
| `items[].quantity`  | Number   | ✅       | ❌     | No      | Quantity (must be >= 1)      |
| `version`           | Number   | ✅       | ❌     | No      | Version for OCC              |
| `createdAt`         | Date     | ✅       | ❌     | No      | Auto-generated timestamp     |
| `updatedAt`         | Date     | ✅       | ❌     | No      | Auto-updated timestamp       |
| `__v`               | Number   | ✅       | ❌     | No      | Mongoose version key         |

**Business Rules:**

- Mỗi user chỉ có 1 cart (userId unique)
- Items được xóa khi nhận `PaymentCreated` event
- Cart được giữ cho đến khi payment thành công

**Example Document:**

```json
{
  "_id": "673cart123456789012345",
  "userId": "673abc123def456789012345",
  "items": [
    {
      "productId": "673prod111111111111111",
      "quantity": 2
    },
    {
      "productId": "673prod222222222222222",
      "quantity": 1
    }
  ],
  "version": 0,
  "createdAt": "2025-01-15T10:00:00.000Z",
  "updatedAt": "2025-01-15T10:30:00.000Z",
  "__v": 0
}
```

### Orders (`orders.orders`)

| Field                   | Type          | Required | Unique | Index   | Description                               |
| ----------------------- | ------------- | -------- | ------ | ------- | ----------------------------------------- |
| `_id`                   | ObjectId      | ✅       | ✅     | Primary | Auto-generated MongoDB ID                 |
| `userId`                | String        | ✅       | ❌     | Yes     | User who owns the order                   |
| `status`                | String (Enum) | ✅       | ❌     | No      | `Created`, `Complete`, `Cancelled`        |
| `items[]`               | Array         | ✅       | ❌     | No      | Snapshot of product details at order time |
| `items[].product`       | ObjectId      | ✅       | ❌     | No      | Reference to Product (populated)          |
| `items[].quantity`      | Number        | ✅       | ❌     | No      | Quantity ordered                          |
| `items[].priceSnapshot` | Number        | ✅       | ❌     | No      | Price at time of order (denormalized)     |
| `items[].titleSnapshot` | String        | ✅       | ❌     | No      | Title at time of order (denormalized)     |
| `total`                 | Number        | ✅       | ❌     | No      | Total amount (sum of items)               |
| `version`               | Number        | ✅       | ❌     | No      | Version for OCC                           |
| `__v`                   | Number        | ✅       | ❌     | No      | Mongoose version key                      |

**Order Status Flow:**

```
Created → Complete (after payment)
   ↓
Cancelled (via user action or expiration)
```

**Business Rules:**

- Items lưu snapshot để giữ giá/title tại thời điểm đặt hàng
- Status chỉ chuyển sang `Complete` khi nhận `PaymentCreated` event
- Không có expiration - order không tự động hủy

**Example Document:**

```json
{
  "_id": "673order123456789012345",
  "userId": "673abc123def456789012345",
  "status": "Created",
  "items": [
    {
      "product": "673prod111111111111111",
      "quantity": 1,
      "priceSnapshot": 999,
      "titleSnapshot": "iPhone 15 Pro"
    }
  ],
  "total": 999,
  "version": 0,
  "__v": 0
}
```

### Payments (`payments.payments`)

| Field      | Type     | Required | Unique | Index   | Description                             |
| ---------- | -------- | -------- | ------ | ------- | --------------------------------------- |
| `_id`      | ObjectId | ✅       | ✅     | Primary | Auto-generated MongoDB ID               |
| `orderId`  | String   | ✅       | ❌     | Yes     | Order ID reference                      |
| `stripeId` | String   | ✅       | ❌     | No      | Stripe charge ID (e.g., `ch_3STIK6...`) |
| `__v`      | Number   | ✅       | ❌     | No      | Mongoose version key                    |

**Example Document:**

```json
{
  "_id": "673pay123456789012345",
  "orderId": "673order123456789012345",
  "stripeId": "ch_3STIK6RRsPUjHZ5Y10uLGpsR",
  "__v": 0
}
```

### Payments (`payments.orders` - Replica Collection)

| Field               | Type          | Required | Description                                  |
| ------------------- | ------------- | -------- | -------------------------------------------- |
| `_id`               | String        | ✅       | Order ID (from Orders Service, not ObjectId) |
| `userId`            | String        | ✅       | User who owns the order                      |
| `status`            | String (Enum) | ✅       | `Created`, `Cancelled`, `Complete`           |
| `total`             | Number        | ✅       | Total amount                                 |
| `items[]`           | Array         | ✅       | Snapshot items from order                    |
| `items[].productId` | String        | ✅       | Product ID                                   |
| `items[].title`     | String        | ✅       | Product title                                |
| `items[].price`     | Number        | ✅       | Product price                                |
| `items[].quantity`  | Number        | ✅       | Quantity                                     |
| `version`           | Number        | ✅       | Sync version with Orders Service             |
| `__v`               | Number        | ✅       | Mongoose version key                         |

**Purpose:**

- Local cache của orders để validate ownership và status trước khi charge Stripe
- Được sync qua `OrderCreated` và `OrderCancelled` events từ Kafka
- Tránh cross-service database queries

**Example Document:**

```json
{
  "_id": "673order123456789012345",
  "userId": "673abc123def456789012345",
  "status": "Created",
  "total": 999,
  "items": [
    {
      "productId": "673prod111111111111111",
      "title": "iPhone 15 Pro",
      "price": 999,
      "quantity": 1
    }
  ],
  "version": 0,
  "__v": 0
}
```

### MinIO Buckets

- Default bucket `product-images` auto-created at service startup with public-read policy

---

## 📨 Event Architecture (Kafka)

### Kafka Concepts

- **Topics**: Tương đương với NATS subjects (ví dụ: `product.created`)
- **Partitions**: Cho phép parallel processing và scaling
- **Consumer Groups**: Tương đương với NATS queue groups, đảm bảo mỗi message chỉ được process 1 lần
- **Message Keys**: Dùng để partition routing, đảm bảo ordering (ví dụ: product.id, order.id)
- **Offset**: Track vị trí đã đọc trong partition

### Event Catalog & Consumer Groups

> **Naming:**
>
> - **Topic** = Kafka topic (taken from `Subjects` enum, e.g. `product.created`)
> - **Consumer Group** = `consumerGroupId` in each listener (one group per service/responsibility)

| Topic (Subject)   | Producer | Consumer Group(s)          | Consumer Service | Purpose                                                              |
| ----------------- | -------- | -------------------------- | ---------------- | -------------------------------------------------------------------- |
| `product.created` | Products | `cart-product-created`     | Cart             | Sync product snapshot into Cart DB for validation & display          |
| `product.updated` | Products | `cart-product-updated`     | Cart             | Keep Cart's product snapshot (price/stock/image) up to date          |
| `order.created`   | Orders   | `payments-order-created`   | Payments         | Replicate order into Payments DB before charging                     |
| `order.cancelled` | Orders   | `payments-order-cancelled` | Payments         | Reflect cancelled orders in Payments DB                              |
| `payment.created` | Payments | `orders-service`           | Orders           | Mark orders as `Complete` after successful payment                   |
|                   |          | `products-service`         | Products         | Decrement inventory and emit `product.updated`                       |
|                   |          | `cart-payment-created`     | Cart             | Remove purchased items from cart                                     |
| `cart.checkout`   | Cart     | (future / optional)        | Orders           | Async notification that a cart was checked out (currently HTTP used) |

### Event Flow Guarantees

- ✅ **At-Least-Once Delivery** – Kafka persists messages until acknowledged
- ✅ **Consumer Groups** – Ensures only one instance processes each message copy
- ✅ **Offset Commit** – Automatic offset commit after successful processing (nếu throw error, offset không commit, message sẽ được retry)
- ✅ **Partition Ordering** – Messages với cùng key sẽ vào cùng partition, đảm bảo ordering
- ✅ **Optimistic Concurrency** – Version fields prevent race conditions
- ✅ **Idempotency** – Listeners can safely re-process duplicate events

### Kafka Configuration

- **Broker**: `kafka-svc:9092` (internal cluster communication)
- **Zookeeper**: `zookeeper-svc:2181` (coordination)
- **Auto-create topics**: Enabled
- **Default partitions**: 3 per topic
- **Replication factor**: 1 (single broker setup for dev)

---

## 🔄 Complete Flow Diagrams

### Flow 1: Create Product with MinIO Media

```
User ──POST /api/products──► Products Service
        │                    1. Validate JWT + payload
        │                    2. Upload image to MinIO (`minio-svc`)
        │                    3. Persist product (quantity untouched)
        │                    4. Publish `product.created`
        ▼
      Success ◄────────────── Kafka Topic: 'product.created' (future consumers)
```

### Flow 2: Checkout Happy Path (Cart → Order → Payment)

```
┌──────────────┐
│ User Browser │
└─────┬────────┘
      │ POST /api/cart { productId, quantity }  (add items)
      │ ...
      │ User clicks "Proceed to Checkout" on Cart page
      │
      │ Browser ── POST /api/cart/checkout ──────────────────► Cart Service
      │
      │                                   1. Load cart items from Cart DB
      │                                   2. Validate local stock snapshot for each product
      │                                   3. Publish `cart.checkout` (Kafka topic `cart.checkout`)
      │                                   4. Call Orders Service: POST /api/orders { items[] }
      │                                      - Orders validates stock against its Product view
      │                                      - Creates aggregated Order (status = Created)
      │                                      - Publishes `order.created`
      │                                   5. Clear cart items in Cart DB
      │                                   6. Respond 201 { message, order }
      ▼
┌──────────────┐                                      ┌──────────────────────┐
│  Cart Page   │◄──────────────────────────────────── │ Orders Service       │
└──────────────┘           201 { message, order }     │ - Snapshot items     │
                                                     │ - Status = Created   │
                                                     │ - Expose /api/orders │
                                                     └─────────┬────────────┘
                                                              │ Publish to Kafka topic: 'order.created'
                                                              │ Message key: order.id
                                                              ▼
                                                         ┌──────────────┐
                                                         │ Kafka Broker │
                                                         └──────┬───────┘
                                                                │
                                                                ▼
                                                         Payments Service (Consumer Group: 'payments-service')
                                                         - Consumes 'order.created' topic
                                                         - Replicates order to local DB

User navigates to `/orders/[orderId]` from UI
Order details page shows Stripe payment form
User submits Stripe token → POST /api/payments { token, orderId }
Payments Service:
 1. Validates order ownership/status
 2. Charges Stripe
 3. Stores payment doc
 4. Publishes `payment.created` (includes items)

Publish `payment.created` to Kafka topic (message key: orderId)

Downstream reactions (via Kafka consumers):
 - Products Service (Consumer Group: 'products-service')
   → Decrements inventory per item
   → Publishes `product.updated` events
 - Cart Service (Consumer Group: 'cart-service')
   → Removes purchased items from cart
 - Orders Service (Consumer Group: 'orders-service')
   → Sets order status = Complete
```

### Flow 3: Manual Order Cancellation

```
User ──DELETE /api/orders/:id──► Orders Service
                                1. Verify ownership
                                2. Set status=Cancelled
                                3. Publish `order.cancelled`
Orders UI reflects cancellation; inventory stays unchanged because it never decreased pre-payment.
```

### Flow 4: Media Access via MinIO

```
Admin Upload (Products Svc) ──► MinIO via internal svc (`minio-svc:9000`)
Public Client Image Load ──► https://minio-api.local/product-images/<key>
```

---

## 🎨 UI/UX Features

### Design System

**Color Palette (TikTok-Inspired)**
- Primary Gradient: `#00f2ea` (cyan) → `#ff0050` (pink)
- Secondary Gradient: `#00f2ea` (cyan) → `#8b5cf6` (purple)
- Dark Theme: `#0a0a0a` (background), `#1a1a1a` (cards), `#2a2a2a` (borders)
- Text: `#ffffff` (primary), `#a0a0a0` (secondary)

**Typography**
- Font Stack: Inter, system-ui, sans-serif
- Headings: Bold weights with gradient text effects
- Body: Regular weight for readability

**Components**
- Gradient buttons with hover effects and shadows
- Smooth transitions on all interactive elements
- Card-based layouts with subtle borders and shadows
- Badge indicators for stock status and categories
- Loading states with skeleton screens

### Customer Experience

**Homepage**
- Hero section with gradient background and call-to-action
- Search bar with real-time filtering
- Category navigation with icons
- Product grid with responsive columns (1/2/3 cols)
- Pagination controls at the bottom

**Product Pages**
- Large product images from MinIO
- Stock availability indicators
- Add to cart with quantity selector
- Related products section
- Breadcrumb navigation

**Shopping Cart**
- Item list with thumbnails and prices
- Quantity adjusters with stock validation
- Remove item functionality
- Total calculation with tax
- Checkout button with validation

**Checkout Flow**
- Order summary with itemized list
- Stripe payment form with validation
- Loading states during payment processing
- Success/error notifications
- Order confirmation page

### Admin Experience

**Dashboard**
- Sales overview with total revenue and order count
- Recent orders table with status indicators
- Product statistics (total, out of stock)
- User activity metrics
- Visual charts for trends

**Product Management**
- Data table with search and filters
- Image upload with MinIO integration
- Category selector with 10 options
- Stock quantity management
- Bulk actions support

**Order Management**
- Filterable order list
- Status indicators (Created, Complete, Cancelled)
- Customer information display
- Order details with item breakdown
- Export functionality

**User Management**
- User list with roles and status
- Block/unblock actions
- Activity logs
- Permission management

### Responsive Design

- **Mobile (< 768px)**: Single column layout, hamburger menu, touch-optimized controls
- **Tablet (768px - 1024px)**: Two-column grid, collapsible sidebar
- **Desktop (> 1024px)**: Three-column grid, persistent navigation

### Accessibility

- Semantic HTML5 elements
- ARIA labels on interactive elements
- Keyboard navigation support
- Focus indicators on all controls
- Alt text on all images
- High contrast ratios (WCAG AA compliant)

---

## 🚀 Getting Started

### Prerequisites

- Docker Desktop or Minikube
- `kubectl`, `skaffold`, `mkcert`, `jq`
- Node.js 20+ / npm 10+

### 1. Boot the cluster

```bash
minikube start --cpus=4 --memory=8192
minikube addons enable ingress
minikube tunnel   # Keep this terminal running
```

### 2. Generate TLS certs with mkcert

```bash
mkcert -install
mkcert ecommerce.local
mkcert minio.local
mkcert minio-api.local
kubectl create secret tls ecommerce-local-tls \
  --cert=ecommerce.local.pem --key=ecommerce.local-key.pem
kubectl create secret tls minio-local-tls \
  --cert=minio.local.pem --key=minio.local-key.pem
kubectl create secret tls minio-api-local-tls \
  --cert=minio-api.local.pem --key=minio-api.local-key.pem
```

### 3. Map local domains

Append to `/etc/hosts`:

```
127.0.0.1 ecommerce.local minio.local minio-api.local
```

### 4. Secrets & Config

```bash
kubectl create secret generic jwt-secret \
  --from-literal=JWT_KEY='dev_jwt_key'

kubectl create secret generic stripe-secret \
  --from-literal=STRIPE_SECRET_KEY='sk_test_xxx' \
  --from-literal=STRIPE_PUBLISHABLE_KEY='pk_test_xxx'

# Mongo + MinIO + Kafka configs
kubectl apply -f infra/k8s/config/
kubectl apply -f infra/k8s/minio/
kubectl apply -f infra/k8s/kafka/
```

### 5. Run Skaffold dev loop

```bash
skaffold dev
```

Wait for logs showing each service listening on port 3000.

### 6. Access portals

- **Customer Shop**: `https://ecommerce.local`
- **Admin Dashboard**: `https://admin.ecommerce.local` (requires admin role)
- **MinIO Console**: `https://minio.local` (default creds `minioadmin` / `minioadmin123`)
- **MinIO API** (public objects): `https://minio-api.local`

### 7. Create admin user

```bash
# Sign up a new user via the client
# Then promote to admin via MongoDB:
kubectl exec -it <auth-mongo-pod> -- mongosh auth

db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { role: "admin" } }
)
```

---

## 💻 Development

### Repo Layout

```
├── auth/              # Auth service with JWT + Redis
├── products/          # Product + MinIO upload service
├── cart/              # Shopping cart service
├── orders/            # Orders service
├── payments/          # Stripe payments service
├── notifications/     # WebSocket notifications service
├── client/            # Next.js customer storefront
├── admin/             # Next.js admin dashboard
├── common/            # Shared npm package (@datnxecommerce/common)
├── infra/
│   ├── k8s/           # Kubernetes manifests
│   │   ├── auth/      # Auth deployment + Mongo + Redis
│   │   ├── products/  # Products deployment + Mongo
│   │   ├── cart/      # Cart deployment + Mongo
│   │   ├── orders/    # Orders deployment + Mongo
│   │   ├── payments/  # Payments deployment + Mongo
│   │   ├── notifications/ # Notifications deployment
│   │   ├── kafka/     # Kafka + Zookeeper
│   │   ├── minio/     # MinIO storage
│   │   ├── ingress/   # NGINX ingress rules
│   │   └── config/    # ConfigMaps + Secrets
│   ├── postman/       # API collection
│   └── tls-certs/     # mkcert certificates
├── scripts/           # Utility scripts
├── docs/              # Project documentation
└── skaffold.yaml      # Skaffold dev configuration
```

### Kafka Consumers/Producers (Code Conventions)

- Folders:
  - Consumers: `src/events/consumers/*-consumer.ts`
  - Producers: `src/events/producers/*-producer.ts`
- Base classes (from `@datnxecommerce/common`): `Consumer`, `Producer`
- Creating a consumer: use `kafkaWrapper.createConsumer('<groupId>')`

Example Consumer (Products: reacts to `payment.created`):

```ts
import { Consumer, PaymentCreatedEvent, Subjects, EachMessagePayload } from '@datnxecommerce/common'
import { consumerGroupId } from './consumer-group-id'

export class PaymentCreatedConsumer extends Consumer<PaymentCreatedEvent> {
  readonly subject = Subjects.PaymentCreated
  queueGroupName = queueGroupName

  async onMessage(data: PaymentCreatedEvent['data'], payload: EachMessagePayload) {
    // handle event...
  }
}
```

Example Producer (Products: `product.updated`):

```ts
import { Producer, Subjects, ProductUpdatedEvent } from '@datnxecommerce/common'

export class ProductUpdatedProducer extends Producer<ProductUpdatedEvent> {
  readonly subject = Subjects.ProductUpdated
}

// usage
// await new ProductUpdatedProducer(kafkaWrapper.producer).publish({ id, ... }, key)
```

Migration Notes (from NATS naming):

- `listeners/` -> `consumers/`, `publishers/` -> `producers/`
- Base classes renamed: `ListenerKafka` -> `Consumer`, `PublisherKafka` -> `Producer`
- Shared exports available from `@datnxecommerce/common`.

### Testing

```bash
cd auth && npm test
cd products && npm test
# ...repeat per service
```

Each service leverages Jest + Supertest, with helpers in `test/setup.ts`. Kafka client is mocked for isolation (similar to NATS mocks).

### Updating the shared package

```bash
cd common
npm run pub  # build, version bump, npm publish (local registry optional)

cd ../products
npm install @datnxecommerce/common@latest
```

### Environment Variables

Each service requires specific environment variables. Here's a comprehensive list:

**Auth Service**
```env
JWT_KEY=your_jwt_secret
JWT_EXPIRATION=15m
REFRESH_TOKEN_EXPIRATION=7d
REDIS_HOST=auth-redis-svc
REDIS_PORT=6379
MONGO_HOST=auth-mongo-svc
MONGO_PORT=27017
MONGO_USERNAME=admin
MONGO_PASSWORD=password
PORT=3000
```

**Products Service**
```env
JWT_KEY=your_jwt_secret
KAFKA_BROKERS=kafka-svc:9092
KAFKA_CLIENT_ID=products-service
MINIO_ENDPOINT=minio-svc
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_USE_SSL=false
MINIO_BUCKET=product-images
MONGO_HOST=products-mongo-svc
MONGO_PORT=27017
MONGO_USERNAME=admin
MONGO_PASSWORD=password
PORT=3000
```

**Cart Service**
```env
JWT_KEY=your_jwt_secret
KAFKA_BROKERS=kafka-svc:9092
KAFKA_CLIENT_ID=cart-service
MONGO_HOST=cart-mongo-svc
MONGO_PORT=27017
MONGO_USERNAME=admin
MONGO_PASSWORD=password
PORT=3000
```

**Orders Service**
```env
JWT_KEY=your_jwt_secret
KAFKA_BROKERS=kafka-svc:9092
KAFKA_CLIENT_ID=orders-service
MONGO_HOST=orders-mongo-svc
MONGO_PORT=27017
MONGO_USERNAME=admin
MONGO_PASSWORD=password
PORT=3000
```

**Payments Service**
```env
JWT_KEY=your_jwt_secret
KAFKA_BROKERS=kafka-svc:9092
KAFKA_CLIENT_ID=payments-service
STRIPE_SECRET_KEY=sk_test_xxx
MONGO_HOST=payments-mongo-svc
MONGO_PORT=27017
MONGO_USERNAME=admin
MONGO_PASSWORD=password
PORT=3000
```

**Client (Next.js)**
```env
NEXT_PUBLIC_STRIPE_KEY=pk_test_xxx
API_GATEWAY_URL=http://localhost:3000
```

**Admin (Next.js)**
```env
API_GATEWAY_URL=http://localhost:3000
```

**Notifications Service**
```env
JWT_KEY=your_jwt_secret
REDIS_HOST=notifications-redis-svc
REDIS_PORT=6379
PORT=3000
```

---

## 📡 API Endpoints

### Authentication (`/api/users`)

| Method | Endpoint                  | Description              | Auth Required |
|--------|---------------------------|--------------------------|---------------|
| POST   | `/api/users/signup`       | Create new user account  | No            |
| POST   | `/api/users/signin`       | Sign in with credentials | No            |
| POST   | `/api/users/signout`      | Sign out current user    | Yes           |
| POST   | `/api/users/refresh`      | Refresh access token     | Yes (Refresh) |
| GET    | `/api/users/currentuser`  | Get current user info    | Yes           |
| GET    | `/api/users/profile`      | Get user profile         | Yes           |
| PUT    | `/api/users/profile`      | Update user profile      | Yes           |

### Admin - Users (`/api/admin/users`)

| Method | Endpoint                     | Description         | Auth Required |
|--------|------------------------------|---------------------|---------------|
| GET    | `/api/admin/users`           | List all users      | Admin         |
| POST   | `/api/admin/users/:id/block` | Block/unblock user  | Admin         |

### Products (`/api/products`)

| Method | Endpoint                | Description                     | Auth Required |
|--------|-------------------------|---------------------------------|---------------|
| GET    | `/api/products`         | List products (pagination)      | No            |
| GET    | `/api/products/:id`     | Get product details             | No            |
| POST   | `/api/products`         | Create new product              | Yes           |
| PUT    | `/api/products/:id`     | Update product                  | Yes (Owner)   |
| DELETE | `/api/products/:id`     | Delete product                  | Yes (Owner)   |
| POST   | `/api/products/:id/reserve` | Reserve product stock       | Yes           |

**Query Parameters for GET /api/products:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 12)
- `search` - Search term for title
- `category` - Filter by category

### Cart (`/api/cart`)

| Method | Endpoint                  | Description              | Auth Required |
|--------|---------------------------|--------------------------|---------------|
| GET    | `/api/cart`               | Get user's cart          | Yes           |
| POST   | `/api/cart`               | Add item to cart         | Yes           |
| DELETE | `/api/cart/:productId`    | Remove item from cart    | Yes           |
| POST   | `/api/cart/checkout`      | Checkout cart            | Yes           |

### Orders (`/api/orders`)

| Method | Endpoint             | Description              | Auth Required |
|--------|----------------------|--------------------------|---------------|
| GET    | `/api/orders`        | List user's orders       | Yes           |
| GET    | `/api/orders/:id`    | Get order details        | Yes (Owner)   |
| POST   | `/api/orders`        | Create new order         | Yes           |
| DELETE | `/api/orders/:id`    | Cancel order             | Yes (Owner)   |

### Admin - Orders (`/api/admin/orders`)

| Method | Endpoint                   | Description              | Auth Required |
|--------|----------------------------|--------------------------|---------------|
| GET    | `/api/admin/orders`        | List all orders          | Admin         |
| GET    | `/api/admin/orders/analytics` | Get order analytics   | Admin         |

### Payments (`/api/payments`)

| Method | Endpoint          | Description              | Auth Required |
|--------|-------------------|--------------------------|---------------|
| POST   | `/api/payments`   | Process payment          | Yes           |

**Request Body:**
```json
{
  "token": "tok_visa",
  "orderId": "673order123456789012345"
}
```

---

## 🧪 Testing with Postman

A curated collection lives at `infra/postman/ecommerce.postman_collection.json`.

### Environment Setup

1. Import the collection
2. Create environment `Ecommerce Local`
   - `baseUrl = https://ecommerce.local`
3. Enable cookie jar to persist the `session` cookie

### End-to-End Scenario

1. **Signup** – `POST {{baseUrl}}/api/users/signup`
2. **Signin** – `POST {{baseUrl}}/api/users/signin`
3. **Create Product** – `POST /api/products` with `{ title, price, quantity }`
4. **Add to Cart** – `POST /api/cart/items`
5. **Create Order** – `POST /api/orders`
6. **Pay** – `POST /api/payments` with `{ token: "tok_visa", orderId }`
7. **Verify** – `GET /api/orders/:id`, `GET /api/products/:id`, `GET /api/cart`

Detailed example requests mirror the earlier sample README, but adapt endpoints to carts and multiple items. Use Stripe test token `tok_visa`.

### Curl Smoke Test

```bash
BASE=https://ecommerce.local
COOKIE_JAR=/tmp/ecommerce.cookie

curl -k -c $COOKIE_JAR -X POST $BASE/api/users/signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"password"}'

PRODUCT_ID=$(curl -k -b $COOKIE_JAR -X POST $BASE/api/products \
  -H 'Content-Type: application/json' \
  -d '{"title":"iPhone","price":999,"quantity":5}' | jq -r '.id')

curl -k -b $COOKIE_JAR -X POST $BASE/api/cart/items \
  -H 'Content-Type: application/json' \
  -d "{\"productId\":\"$PRODUCT_ID\",\"quantity\":1}"

ORDER_ID=$(curl -k -b $COOKIE_JAR -X POST $BASE/api/orders \
  -H 'Content-Type: application/json' \
  -d "{\"items\":[{\"productId\":\"$PRODUCT_ID\",\"quantity\":1}]}" | jq -r '.id')

curl -k -b $COOKIE_JAR -X POST $BASE/api/payments \
  -H 'Content-Type: application/json' \
  -d "{\"token\":\"tok_visa\",\"orderId\":\"$ORDER_ID\"}"
```

---

## 🐳 Deployment

### Kubernetes Resources

Each service ships with Deployment + Service + dedicated Mongo Deployment/Service. MinIO has its own stateful deployment with PVC.

**Key environment variables**

- `JWT_KEY` – all backend pods (from `jwt-secret`)
- `KAFKA_BROKERS` – Kafka broker URL (e.g., `kafka-svc:9092`)
- `KAFKA_CLIENT_ID` – Unique client identifier (auto-set from pod name)
- `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_KEY` – payment secrets
- Mongo host/user/password pulled from ConfigMaps + Secrets per service
- MinIO creds injected into products deployment for uploads
- Service URLs (AUTH_SERVICE_URL, PRODUCT_SERVICE_URL, ORDER_SERVICE_URL) for inter-service communication

### Production Image Build

```bash
docker build -t <registry>/auth:latest auth
# ...repeat per service

docker push <registry>/auth:latest
kubectl apply -f infra/k8s/
```

---

## 🔐 Security Features

- HTTPS-only domains via mkcert TLS secrets
- JWT stored in HTTP-only, Secure cookie `session`
- Central error handler prevents leaking stack traces
- Authorization middleware ensures resource ownership (e.g., product updates)
- Stripe keys stored solely in Kubernetes secrets

---

## 🐛 Troubleshooting

### Common Issues

**1. Pods not starting**
```bash
# Check pod status
kubectl get pods

# Check pod logs
kubectl logs <pod-name>

# Describe pod for events
kubectl describe pod <pod-name>
```

**2. Ingress not working**
```bash
# Verify ingress is running
kubectl get ingress

# Check ingress controller logs
kubectl logs -n ingress-nginx <ingress-controller-pod>

# Ensure minikube tunnel is running
minikube tunnel
```

**3. TLS certificate errors**
```bash
# Recreate TLS secrets
kubectl delete secret ecommerce-local-tls
kubectl create secret tls ecommerce-local-tls \
  --cert=ecommerce.local.pem --key=ecommerce.local-key.pem

# Verify secret exists
kubectl get secrets
```

**4. Kafka connection issues**
```bash
# Check Kafka and Zookeeper pods
kubectl get pods | grep kafka
kubectl logs <kafka-pod-name>

# Verify Kafka service
kubectl get svc kafka-svc
```

**5. Product images not loading**
```bash
# Check MinIO deployment
kubectl get pods | grep minio
kubectl logs <minio-pod-name>

# Verify MinIO ingress
kubectl get ingress | grep minio

# Test MinIO access
curl -k https://minio.local
```

**6. Services can't sync products (Cart service empty)**
```bash
# Ensure all services are running when creating products
kubectl get pods

# Check Kafka consumer logs
kubectl logs <cart-pod-name> | grep "Kafka consumer"

# Manually restart consumer pods to re-sync
kubectl delete pod <cart-pod-name>
```

**7. Admin dashboard not accessible**
```bash
# Verify admin ingress rule
kubectl get ingress

# Add to /etc/hosts if missing
echo "127.0.0.1 admin.ecommerce.local" | sudo tee -a /etc/hosts

# Verify admin deployment
kubectl get pods | grep admin
```

---

## 🔮 Future Enhancements

### Planned Features
- [ ] Product reservation + expiration service using Redis/Bull
- [ ] Email notifications for order/payment events (SendGrid/AWS SES)
- [ ] Advanced search with Elasticsearch
- [ ] Product reviews and ratings system
- [ ] Wishlist functionality
- [ ] Discount codes and promotions
- [ ] Multi-currency support
- [ ] Inventory alerts for low stock
- [ ] Order tracking with delivery status
- [ ] Admin analytics dashboard with charts

### Infrastructure
- [ ] Persistent volumes for Mongo & MinIO (currently `emptyDir` for dev)
- [ ] Automated test coverage reports in CI/CD
- [ ] Observability stack (Grafana + Prometheus + Loki)
- [ ] Rate limiting with Redis
- [ ] CDN integration for static assets
- [ ] Multi-region deployment support
- [ ] Blue-green deployment strategy
- [ ] Auto-scaling based on load

### Security
- [ ] Two-factor authentication (2FA)
- [ ] OAuth2 social login (Google, GitHub)
- [ ] API rate limiting per user
- [ ] CAPTCHA for signup/signin
- [ ] Audit logs for admin actions
- [ ] GDPR compliance features (data export/deletion)

---

## 📚 Learning Resources

### Microservices & Architecture
- Microservices Pattern – https://microservices.io/patterns/microservices.html
- Database Per Service Pattern – https://microservices.io/patterns/data/database-per-service.html
- Event-Driven Architecture – https://martinfowler.com/articles/201701-event-driven.html

### Apache Kafka
- Apache Kafka Documentation – https://kafka.apache.org/documentation/
- KafkaJS (Node.js Client) – https://kafka.js.org/
- Kafka Topics & Partitions – https://kafka.apache.org/intro#intro_topics

### Kubernetes & DevOps
- Kubernetes Basics – https://kubernetes.io/docs/home/
- Skaffold Documentation – https://skaffold.dev/docs/
- NGINX Ingress Controller – https://kubernetes.github.io/ingress-nginx/
- mkcert (Local TLS Certificates) – https://github.com/FiloSottile/mkcert

### Next.js & React
- Next.js 14 App Router – https://nextjs.org/docs/app
- React Server Components – https://react.dev/reference/rsc/server-components
- Server Actions – https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions

### Storage & APIs
- MinIO Documentation – https://min.io/docs/minio/kubernetes/upstream/
- Stripe Payments API – https://stripe.com/docs/payments
- MongoDB with Mongoose – https://mongoosejs.com/docs/

### Authentication & Security
- JWT Best Practices – https://jwt.io/introduction
- Redis for Sessions – https://redis.io/docs/manual/patterns/
- OWASP Top 10 – https://owasp.org/www-project-top-ten/

---

## 🤝 Contributing

1. Fork the repo
2. Create a branch: `git checkout -b feature/amazing`
3. Commit and push
4. Open a PR with context + testing notes

---

## 📝 License

ISC License – see LICENSE file for details.

---

## 👤 Author

**DatNX**

- GitHub: [@Rayloveyou](https://github.com/Rayloveyou)
- npm: [@datnxecommerce](https://www.npmjs.com/org/datnxecommerce)

---

## 🙏 Acknowledgments

- Inspired by Stephen Grider's microservices curriculum
- Thanks to the Apache Kafka, Kubernetes, and Next.js communities

---

## 📞 Support

- Open a GitHub issue with logs + reproduction steps
- Check `infra/postman` for ready-made API tests
- Reach out via repo discussions for architectural questions

**Happy coding! 🚀**
