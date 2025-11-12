# 🎫 Ticketing Microservices Platform

A **modern event-driven ticketing platform** for selling concert, sports, and event tickets online. Built with **Node.js**, **TypeScript**, **React (Next.js)**, **MongoDB**, **Redis**, and **Kubernetes**, this platform demonstrates production-grade microservices patterns including:

- 🔐 **User Authentication & Session Management**
- 🎟️ **Ticket Listing & Purchase**
- ⏰ **Automatic Order Expiration** (15-minute reservation window)
- 💳 **Payment Processing** (Stripe integration - planned)
- 📨 **Event-Driven Architecture** with NATS Streaming
- 🔄 **Real-time Data Synchronization** across services
- 🚀 **Scalable Infrastructure** with Kubernetes

---

## 📋 Table of Contents

- [Architecture Overview](#-architecture-overview)
- [Tech Stack](#-tech-stack)
- [Services](#-services)
- [Database Schemas](#-database-schemas)
- [Event Architecture](#-event-architecture)
- [Complete Flow Diagrams](#-complete-flow-diagrams)
- [Getting Started](#-getting-started)
- [Development](#-development)
- [Testing with Postman](#-testing-with-postman)
- [Deployment](#-deployment)
- [Security Features](#-security-features)
- [Future Enhancements](#-future-enhancements)

---

## 🏗 Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                      Client (Next.js SSR)                            │
│                    https://ticketing.local                           │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                      ┌──────────▼──────────┐
                      │   Ingress NGINX     │
                      │   (SSL/TLS)         │
                      └──────────┬──────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
┌───────▼────────┐   ┌──────────▼─────────┐   ┌─────────▼────────┐
│  Auth Service  │   │ Products Service   │   │  Orders Service  │
│   + MongoDB    │   │   + MongoDB        │   │   + MongoDB      │
└───────┬────────┘   └──────────┬─────────┘   └─────────┬────────┘
        │                       │                        │
        │            ┌──────────▼──────────┐            │
        │            │ Expiration Service  │            │
        │            │   + Redis (Bull)    │            │
        │            └──────────┬──────────┘            │
        │                       │                        │
        └───────────────────────┼────────────────────────┘
                                │
                      ┌─────────▼──────────┐
                      │  NATS Streaming    │
                      │   (Event Bus)      │
                      └────────────────────┘
```

**Key Design Patterns:**
- ✅ **Microservices Architecture** - Independent, loosely coupled services
- ✅ **Event-Driven Communication** - Asynchronous messaging via NATS Streaming
- ✅ **Database Per Service** - Each service owns its data (MongoDB)
- ✅ **Message Queue** - Redis Bull for delayed job processing
- ✅ **API Gateway Pattern** - Ingress as single entry point
- ✅ **CQRS** - Command Query Responsibility Segregation
- ✅ **Optimistic Concurrency Control** - Version-based conflict resolution
- ✅ **Saga Pattern** - Distributed transactions via events

---

## 🛠 Tech Stack

### Backend
- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Express.js 5
- **Database**: MongoDB (via Mongoose)
- **Cache/Queue**: Redis (Bull for job scheduling)
- **Message Broker**: NATS Streaming Server
- **Authentication**: JWT with HTTP-only cookies
- **Validation**: Express-validator
- **Testing**: Jest + Supertest + MongoDB Memory Server

### Frontend
- **Framework**: Next.js 14 (Pages Router)
- **Language**: JavaScript (React)
- **HTTP Client**: Axios
- **Styling**: Bootstrap 5

### Infrastructure
- **Orchestration**: Kubernetes (Minikube for local dev)
- **Container Runtime**: Docker
- **Ingress**: NGINX Ingress Controller
- **TLS**: Self-signed certificates
- **CI/CD**: Skaffold for hot-reload development

### Shared Libraries
- **@datnxtickets/common** - NPM package with:
  - Custom error classes
  - Express middlewares (auth, validation, error handling)
  - Event type definitions
  - NATS base Publisher/Listener classes

---

## 🎯 Services

### 1. **Auth Service** (`/auth`)
- User registration and login
- JWT token generation
- Current user session management
- Password hashing with scrypt

**Routes:**
- `POST /api/users/signup` - Register new user
- `POST /api/users/signin` - Login
- `POST /api/users/signout` - Logout
- `GET /api/users/currentuser` - Get current session

---

### 2. **Products Service** (`/products`)
- Create and manage products
- Ownership validation
- Publishes events on create/update
- Optimistic concurrency control

**Routes:**
- `POST /api/products` - Create product
- `GET /api/products` - List all products
- `GET /api/products/:id` - Get product by ID
- `PUT /api/products/:id` - Update product (owner only)

**Events Published:**
- `product:created`
- `product:updated`

---

### 3. **Orders Service** (`/orders`)
- Create orders for products
- Prevent double-booking with reservation checks
- 15-minute expiration window
- Listens to product events for data replication

**Routes:**
- `POST /api/orders` - Create order
- `GET /api/orders` - List user's orders
- `GET /api/orders/:id` - Get order details
- `DELETE /api/orders/:id` - Cancel order

**Events Published:**
- `order:created`
- `order:cancelled`

**Events Consumed:**
- `product:created` - Replicate product data
- `product:updated` - Sync product updates

---

### 4. **Expiration Service** (`/expiration`)
- Automatically cancel unpaid orders after 15 minutes
- Uses Redis Bull queue for delayed job processing
- Listens to order creation events
- Publishes expiration complete events

**Events Consumed:**
- `order:created` - Schedule expiration job

**Events Published:**
- `expiration:complete` - Notify when order expires

**Technology:**
- Redis for job queue storage
- Bull for job scheduling and processing

---

### 5. **Client** (`/client`)
- Server-Side Rendering (SSR) with Next.js
- Cookie-based authentication
- Responsive UI with Bootstrap
- Custom `buildClient` for SSR/CSR dual-mode API calls

**Pages:**
- `/` - Landing page
- `/auth/signup` - Registration
- `/auth/signin` - Login
- `/auth/signout` - Logout

---

## � Database Schemas

### **Auth Service Database** (MongoDB: `auth`)

#### Collection: `users`
| Field | Type | Required | Unique | Description |
|-------|------|----------|--------|-------------|
| `_id` | ObjectId | ✅ | ✅ | Auto-generated MongoDB ID |
| `email` | String | ✅ | ✅ | User email (lowercase, validated) |
| `password` | String | ✅ | ❌ | Hashed password (scrypt + salt) |
| `__v` | Number | ✅ | ❌ | Version key for concurrency control |

**Indexes:**
- `email` (unique)

**Example Document:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "password": "hashed_password_here",
  "__v": 0
}
```

---

### **Products Service Database** (MongoDB: `products`)

#### Collection: `products`
| Field | Type | Required | Unique | Description |
|-------|------|----------|--------|-------------|
| `_id` | ObjectId | ✅ | ✅ | Auto-generated MongoDB ID |
| `title` | String | ✅ | ❌ | Product/ticket title |
| `price` | Number | ✅ | ❌ | Price (must be >= 0) |
| `userId` | String | ✅ | ❌ | Owner's user ID (from JWT) |
| `orderId` | String | ❌ | ❌ | ID of order reserving this product (null if available) |
| `version` | Number | ✅ | ❌ | Version for optimistic concurrency control |
| `__v` | Number | ✅ | ❌ | Mongoose version key |

**Indexes:**
- `orderId` (for reservation lookup)

**Business Rules:**
- Product is **reserved** when `orderId` is set
- Product is **available** when `orderId` is `undefined/null`
- Price must be positive number

**Example Document:**
```json
{
  "_id": "507f191e810c19729de860ea",
  "title": "Taylor Swift Concert - VIP Ticket",
  "price": 150.00,
  "userId": "507f1f77bcf86cd799439011",
  "orderId": undefined,
  "version": 0,
  "__v": 0
}
```

---

### **Orders Service Database** (MongoDB: `orders`)

#### Collection: `orders`
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | ✅ | Auto-generated MongoDB ID |
| `userId` | String | ✅ | ID of user who created the order |
| `status` | String (Enum) | ✅ | `created`, `cancelled`, `awaiting:payment`, `complete` |
| `expiresAt` | Date | ✅ | Expiration timestamp (createdAt + 15 minutes) |
| `product` | Object | ✅ | Embedded product snapshot |
| `product.id` | String | ✅ | Product ID reference |
| `product.price` | Number | ✅ | Price at time of order creation |
| `product.title` | String | ✅ | Product title (denormalized) |
| `version` | Number | ✅ | Version for optimistic concurrency control |
| `__v` | Number | ✅ | Mongoose version key |

**Order Status Flow:**
```
created → awaiting:payment → complete
   ↓
cancelled (via expiration or user action)
```

**Indexes:**
- `userId` (for user's order queries)
- `expiresAt` (for expiration processing)

**Example Document:**
```json
{
  "_id": "608f191e810c19729de860eb",
  "userId": "507f1f77bcf86cd799439011",
  "status": "created",
  "expiresAt": "2025-11-12T10:15:00.000Z",
  "product": {
    "id": "507f191e810c19729de860ea",
    "title": "Taylor Swift Concert - VIP Ticket",
    "price": 150.00
  },
  "version": 0,
  "__v": 0
}
```

#### Collection: `products` (Replica)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | String | ✅ | Product ID (from Products Service) |
| `title` | String | ✅ | Product title |
| `price` | Number | ✅ | Current price |
| `version` | Number | ✅ | Sync version with Products Service |
| `__v` | Number | ✅ | Mongoose version key |

**Purpose:** 
- Local cache of products for fast order validation
- Prevents cross-service database queries
- Updated via `product:created` and `product:updated` events

---

### **Expiration Service** (Redis)

#### Redis Key Pattern: `bull:order:expiration:{jobId}`

**Queue Name:** `order:expiration`

**Job Payload Structure:**
```typescript
interface ExpirationJob {
  orderId: string  // ID of order to expire
}
```

**Job Options:**
```typescript
{
  delay: number  // Milliseconds until job execution (typically 900000 = 15 min)
}
```

**Example Job:**
```json
{
  "data": {
    "orderId": "608f191e810c19729de860eb"
  },
  "opts": {
    "delay": 900000,
    "timestamp": 1731408000000
  }
}
```

**Redis Data Structures:**
- `bull:order:expiration:id` - Job counter
- `bull:order:expiration:wait` - Sorted set of waiting jobs
- `bull:order:expiration:active` - Set of active jobs
- `bull:order:expiration:completed` - Set of completed jobs
- `bull:order:expiration:failed` - Set of failed jobs

---

## 📨 Event Architecture

### **Event Catalog**

| Event Subject | Publisher | Consumers | Payload | Purpose |
|---------------|-----------|-----------|---------|---------|
| `product:created` | Products | Orders | `{ id, title, price, userId, version, orderId? }` | Replicate new product to Orders DB |
| `product:updated` | Products | Orders | `{ id, title, price, userId, version, orderId? }` | Sync product changes |
| `order:created` | Orders | Products, Expiration | `{ id, status, userId, expiresAt, version, product: { id } }` | Lock product, schedule expiration |
| `order:cancelled` | Orders | Products | `{ id, version, product: { id } }` | Release product reservation |
| `expiration:complete` | Expiration | Orders | `{ orderId }` | Trigger order cancellation |

---

### **Event Definitions**

#### `product:created` Event
```typescript
{
  subject: "product:created",
  data: {
    id: "507f191e810c19729de860ea",
    title: "Concert Ticket",
    price: 150,
    userId: "507f1f77bcf86cd799439011",
    version: 0,
    orderId: undefined  // null = available
  }
}
```

**Triggered When:** New product is created via `POST /api/products`

**Consumers:**
- **Orders Service** → Creates local replica in `products` collection

---

#### `product:updated` Event
```typescript
{
  subject: "product:updated",
  data: {
    id: "507f191e810c19729de860ea",
    title: "Concert Ticket - Updated Price",
    price: 120,
    userId: "507f1f77bcf86cd799439011",
    version: 2,  // Incremented version
    orderId: "608f191e810c19729de860eb"  // May be reserved
  }
}
```

**Triggered When:** Product is updated via `PUT /api/products/:id`

**Consumers:**
- **Orders Service** → Updates local replica (with version check)

---

#### `order:created` Event
```typescript
{
  subject: "order:created",
  data: {
    id: "608f191e810c19729de860eb",
    status: "created",
    userId: "507f1f77bcf86cd799439011",
    expiresAt: "2025-11-12T10:15:00.000Z",  // 15 min from now
    version: 0,
    product: {
      id: "507f191e810c19729de860ea"
    }
  }
}
```

**Triggered When:** User creates order via `POST /api/orders`

**Consumers:**
- **Products Service** → Sets `product.orderId` to lock it
- **Expiration Service** → Schedules delayed job in Redis Bull queue

---

#### `order:cancelled` Event
```typescript
{
  subject: "order:cancelled",
  data: {
    id: "608f191e810c19729de860eb",
    version: 1,
    product: {
      id: "507f191e810c19729de860ea"
    }
  }
}
```

**Triggered When:** 
- User cancels order via `DELETE /api/orders/:id`
- Order expires (triggered by `expiration:complete` event)

**Consumers:**
- **Products Service** → Clears `product.orderId` to release reservation

---

#### `expiration:complete` Event
```typescript
{
  subject: "expiration:complete",
  data: {
    orderId: "608f191e810c19729de860eb"
  }
}
```

**Triggered When:** Bull queue processes expired job (15 min after order creation)

**Consumers:**
- **Orders Service** → Cancels order, publishes `order:cancelled`

---

### **Event Flow Guarantees**

- ✅ **At-Least-Once Delivery** - NATS Streaming persists events until acknowledged
- ✅ **Queue Groups** - Ensures only one instance processes each event
- ✅ **Manual Acknowledgment** - Events redelivered if service crashes before `msg.ack()`
- ✅ **Optimistic Concurrency** - Version fields prevent race conditions
- ✅ **Idempotency** - Listeners can safely re-process duplicate events

---

## 🔄 Complete Flow Diagrams

### **Flow 1: Create Product**

```
┌─────────┐
│  User   │
└────┬────┘
     │ POST /api/products
     │ { title: "Concert Ticket", price: 150 }
     ▼
┌─────────────────┐
│ Products Service│
│                 │
│ 1. Validate JWT │
│ 2. Create in DB │
│ 3. Save product │
└────┬────────────┘
     │ Publish: product:created
     ▼
┌──────────────┐
│ NATS Stream  │
└────┬─────────┘
     │ Broadcast
     ▼
┌─────────────────┐
│ Orders Service  │
│                 │
│ 1. Receive event│
│ 2. Create local │
│    product copy │
│ 3. msg.ack()    │
└─────────────────┘
```

---

### **Flow 2: Create Order (Happy Path - User Pays)**

```
┌─────────┐
│  User   │
└────┬────┘
     │ POST /api/orders
     │ { productId: "abc123" }
     ▼
┌─────────────────────────────────────────────────┐
│ Orders Service                                  │
│                                                 │
│ 1. Check if product exists locally              │
│ 2. Check if product.orderId is null (available) │
│ 3. Create order (status: created)               │
│ 4. Set expiresAt = now + 15 minutes            │
│ 5. Save to DB                                   │
└────┬────────────────────────────────────────────┘
     │ Publish: order:created
     ▼
┌──────────────────────────────────────────────────┐
│ NATS Streaming Server                            │
└────┬────────────────────┬────────────────────────┘
     │                    │
     ▼                    ▼
┌────────────────┐   ┌─────────────────────────────┐
│ Products       │   │ Expiration Service          │
│ Service        │   │                             │
│                │   │ 1. Calculate delay:         │
│ 1. Find product│   │    expiresAt - now = 15min │
│ 2. Set orderId │   │ 2. Add job to Bull Queue    │
│ 3. Save & ack  │   │    with delay: 900000ms     │
└────────────────┘   │ 3. msg.ack()                │
                     └─────────────────────────────┘
                                  │
                                  │ Store job in Redis
                                  ▼
                            ┌──────────────┐
                            │    Redis     │
                            │ Bull Queue   │
                            │              │
                            │ ⏰ Waiting   │
                            │  15 minutes  │
                            └──────────────┘
                                  │
     ┌────────────────────────────┘
     │ Meanwhile...
     │ User completes payment (future feature)
     │
     ▼
┌─────────────────┐
│ Orders Service  │
│                 │
│ Update status:  │
│ complete        │
└─────────────────┘
     
     ⏰ 15 min later (job ignored if order completed)
```

---

### **Flow 3: Create Order (Expiration Path - User Doesn't Pay)**

```
┌─────────┐
│  User   │
└────┬────┘
     │ POST /api/orders
     │ (Same as Flow 2 steps 1-5)
     ▼
     ... (order created, job scheduled)
     
     ⏰ User does NOT pay within 15 minutes
     
     ┌──────────────────┐
     │ Redis Bull Queue │
     │                  │
     │ ⏰ 15 min elapsed│
     │ Process job!     │
     └────┬─────────────┘
          │ expirationQueue.process()
          ▼
     ┌─────────────────────────────┐
     │ Expiration Service          │
     │                             │
     │ 1. Get orderId from job     │
     │ 2. Publish expiration event │
     └────┬────────────────────────┘
          │ Publish: expiration:complete
          ▼
     ┌──────────────┐
     │ NATS Stream  │
     └────┬─────────┘
          │ Broadcast
          ▼
     ┌─────────────────────────────────────────┐
     │ Orders Service                          │
     │                                         │
     │ 1. Find order by ID                     │
     │ 2. Check status (if already complete,   │
     │    ignore)                               │
     │ 3. Update status: cancelled             │
     │ 4. Save to DB                           │
     │ 5. Publish: order:cancelled             │
     │ 6. msg.ack()                            │
     └────┬────────────────────────────────────┘
          │ Publish: order:cancelled
          ▼
     ┌──────────────┐
     │ NATS Stream  │
     └────┬─────────┘
          │ Broadcast
          ▼
     ┌─────────────────────────────┐
     │ Products Service            │
     │                             │
     │ 1. Find product by ID       │
     │ 2. Clear orderId (release)  │
     │ 3. Save to DB               │
     │ 4. msg.ack()                │
     └─────────────────────────────┘
     
     ✅ Product is now available for other users
```

---

### **Flow 4: User Cancels Order Manually**

```
┌─────────┐
│  User   │
└────┬────┘
     │ DELETE /api/orders/:id
     ▼
┌─────────────────────────────┐
│ Orders Service              │
│                             │
│ 1. Verify JWT & ownership   │
│ 2. Find order               │
│ 3. Update status: cancelled │
│ 4. Save to DB               │
└────┬────────────────────────┘
     │ Publish: order:cancelled
     ▼
┌──────────────┐
│ NATS Stream  │
└────┬─────────┘
     │ Broadcast
     ▼
┌─────────────────────────────┐
│ Products Service            │
│                             │
│ 1. Find product by ID       │
│ 2. Clear orderId (release)  │
│ 3. Save to DB               │
│ 4. msg.ack()                │
└─────────────────────────────┘

Note: Expiration job will still fire after 15 min,
      but Orders Service will ignore it (already cancelled)
```

---

### **Flow 5: Product Update Synchronization**

```
┌─────────┐
│  User   │
└────┬────┘
     │ PUT /api/products/:id
     │ { price: 120 }  // Update price
     ▼
┌─────────────────────────────┐
│ Products Service            │
│                             │
│ 1. Verify JWT & ownership   │
│ 2. Check if reserved        │
│    (orderId !== undefined)  │
│ 3. If reserved, reject ❌   │
│ 4. Update product           │
│ 5. Increment version        │
│ 6. Save to DB               │
└────┬────────────────────────┘
     │ Publish: product:updated
     ▼
┌──────────────┐
│ NATS Stream  │
└────┬─────────┘
     │ Broadcast
     ▼
┌─────────────────────────────────┐
│ Orders Service                  │
│                                 │
│ 1. Find local product replica   │
│ 2. Check version:               │
│    if event.version =           │
│       local.version + 1 ✅      │
│    else reject (out of order) ❌│
│ 3. Update local copy            │
│ 4. Save & msg.ack()             │
└─────────────────────────────────┘
```

---

## �🚀 Getting Started

### Prerequisites

- **Docker Desktop** (with Kubernetes enabled) OR **Minikube**
- **kubectl** CLI
- **Skaffold** CLI
- **Node.js 18+** and **npm**
- **Ingress NGINX Controller** installed in cluster

### Local Setup with Minikube

1. **Start Minikube cluster:**
```bash
minikube start --cpus=4 --memory=8192
```

2. **Enable Ingress addon:**
```bash
minikube addons enable ingress
```

3. **Start Minikube tunnel** (required for LoadBalancer):
```bash
minikube tunnel
# Keep this terminal open
```

4. **Add domain to `/etc/hosts`:**
```bash
echo "127.0.0.1 ticketing.local" | sudo tee -a /etc/hosts
```

5. **Generate TLS certificates** (for HTTPS):
```bash
cd infra/tls-certs
# Follow instructions in README.md
mkcert ticketing.local
kubectl create secret tls ticketing-tls \
  --cert=ticketing.local.pem \
  --key=ticketing.local-key.pem
```

6. **Create Kubernetes secrets:**
```bash
kubectl create secret generic jwt-secret --from-literal=JWT_KEY=your-secret-key
```

7. **Start development with Skaffold:**
```bash
skaffold dev
```

8. **Access the application:**
```
https://ticketing.local
```

---

## 💻 Development

### Project Structure

```
ticketing/
├── auth/                    # Authentication service
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── models/         # Mongoose models
│   │   ├── services/       # Business logic
│   │   └── test/           # Test setup
│   ├── Dockerfile
│   └── package.json
├── products/               # Product management service
│   ├── src/
│   │   ├── routes/
│   │   ├── models/
│   │   ├── events/         # Event publishers
│   │   └── __mocks__/      # Test mocks
│   └── ...
├── orders/                 # Order processing service
│   ├── src/
│   │   ├── routes/
│   │   ├── models/
│   │   ├── events/
│   │   │   ├── listeners/  # Event consumers
│   │   │   └── publishers/
│   │   └── ...
│   └── ...
├── client/                 # Next.js frontend
│   ├── pages/
│   ├── components/
│   ├── hooks/
│   └── api/
├── common/                 # Shared NPM package
│   ├── src/
│   │   ├── errors/
│   │   ├── middlewares/
│   │   └── events/
│   └── package.json
├── infra/
│   ├── k8s/               # Kubernetes manifests
│   └── tls-certs/         # SSL certificates
├── nats-test/             # NATS testing utilities
├── skaffold.yaml
└── README.md
```

### Running Tests

Each service has its own test suite:

```bash
# Auth service tests
cd auth
npm test

# Products service tests
cd products
npm test

# Orders service tests
cd orders
npm test
```

### Working with Common Library

When updating shared code:

```bash
cd common
# Make changes to src/
npm run pub   # Build, version bump, and publish to npm
```

Update services:

```bash
cd auth  # or products, orders, expiration
npm install @datnxtickets/common@latest
```

---

## 🧪 Testing with Postman

### Setup Postman Environment

1. **Create New Environment** in Postman
2. **Add Variables:**
   - `baseUrl` = `https://ticketing.local`
   - `authToken` = (will be set automatically)

### Test Flow: Complete User Journey

#### **1. User Signup**

**Request:**
```http
POST {{baseUrl}}/api/users/signup
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
```

**Expected Response:** `201 Created`
```json
{
  "id": "507f1f77bcf86cd799439011",
  "email": "test@example.com"
}
```

**Cookie Set:** `session` (HTTP-only, secure)

---

#### **2. User Signin**

**Request:**
```http
POST {{baseUrl}}/api/users/signin
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
```

**Expected Response:** `200 OK`
```json
{
  "id": "507f1f77bcf86cd799439011",
  "email": "test@example.com"
}
```

**⚠️ Important:** Make sure Postman is configured to handle cookies:
- Settings → General → Enable "Automatically follow redirects"
- Settings → General → Enable "Send cookies"

---

#### **3. Get Current User**

**Request:**
```http
GET {{baseUrl}}/api/users/currentuser
```

**Expected Response:** `200 OK`
```json
{
  "currentUser": {
    "id": "507f1f77bcf86cd799439011",
    "email": "test@example.com",
    "iat": 1731408000
  }
}
```

**If Not Authenticated:** `200 OK`
```json
{
  "currentUser": null
}
```

---

#### **4. Create Product (Ticket)**

**Request:**
```http
POST {{baseUrl}}/api/products
Content-Type: application/json

{
  "title": "Taylor Swift Eras Tour - VIP Ticket",
  "price": 299.99
}
```

**Expected Response:** `201 Created`
```json
{
  "id": "507f191e810c19729de860ea",
  "title": "Taylor Swift Eras Tour - VIP Ticket",
  "price": 299.99,
  "userId": "507f1f77bcf86cd799439011",
  "version": 0
}
```

**Copy the `id` for next steps!**

---

#### **5. List All Products**

**Request:**
```http
GET {{baseUrl}}/api/products
```

**Expected Response:** `200 OK`
```json
[
  {
    "id": "507f191e810c19729de860ea",
    "title": "Taylor Swift Eras Tour - VIP Ticket",
    "price": 299.99,
    "userId": "507f1f77bcf86cd799439011",
    "version": 0
  }
]
```

---

#### **6. Get Product by ID**

**Request:**
```http
GET {{baseUrl}}/api/products/507f191e810c19729de860ea
```

**Expected Response:** `200 OK`
```json
{
  "id": "507f191e810c19729de860ea",
  "title": "Taylor Swift Eras Tour - VIP Ticket",
  "price": 299.99,
  "userId": "507f1f77bcf86cd799439011",
  "orderId": undefined,
  "version": 0
}
```

---

#### **7. Update Product**

**Request:**
```http
PUT {{baseUrl}}/api/products/507f191e810c19729de860ea
Content-Type: application/json

{
  "title": "Taylor Swift Eras Tour - VIP + Meet & Greet",
  "price": 499.99
}
```

**Expected Response:** `200 OK`
```json
{
  "id": "507f191e810c19729de860ea",
  "title": "Taylor Swift Eras Tour - VIP + Meet & Greet",
  "price": 499.99,
  "userId": "507f1f77bcf86cd799439011",
  "version": 1
}
```

**❌ Error if product is reserved:**
```json
{
  "errors": [
    {
      "message": "Cannot edit a reserved product"
    }
  ]
}
```

---

#### **8. Create Order**

**Request:**
```http
POST {{baseUrl}}/api/orders
Content-Type: application/json

{
  "productId": "507f191e810c19729de860ea"
}
```

**Expected Response:** `201 Created`
```json
{
  "id": "608f191e810c19729de860eb",
  "userId": "507f1f77bcf86cd799439011",
  "status": "created",
  "expiresAt": "2025-11-12T10:15:00.000Z",
  "product": {
    "id": "507f191e810c19729de860ea",
    "title": "Taylor Swift Eras Tour - VIP + Meet & Greet",
    "price": 499.99
  },
  "version": 0
}
```

**⚠️ Copy `expiresAt` - you have 15 minutes to complete payment!**

**What Happens Behind the Scenes:**
1. ✅ Order created in Orders Service
2. ✅ `order:created` event published to NATS
3. ✅ Products Service locks product (sets `orderId`)
4. ✅ Expiration Service schedules job in Redis (15 min delay)

---

#### **9. Verify Product is Reserved**

**Request:**
```http
GET {{baseUrl}}/api/products/507f191e810c19729de860ea
```

**Expected Response:** `200 OK`
```json
{
  "id": "507f191e810c19729de860ea",
  "title": "Taylor Swift Eras Tour - VIP + Meet & Greet",
  "price": 499.99,
  "userId": "507f1f77bcf86cd799439011",
  "orderId": "608f191e810c19729de860eb",  // ⚠️ Now reserved!
  "version": 1
}
```

---

#### **10. Try to Create Duplicate Order (Should Fail)**

**Request:**
```http
POST {{baseUrl}}/api/orders
Content-Type: application/json

{
  "productId": "507f191e810c19729de860ea"
}
```

**Expected Response:** `400 Bad Request`
```json
{
  "errors": [
    {
      "message": "Product is already reserved"
    }
  ]
}
```

---

#### **11. List User's Orders**

**Request:**
```http
GET {{baseUrl}}/api/orders
```

**Expected Response:** `200 OK`
```json
[
  {
    "id": "608f191e810c19729de860eb",
    "userId": "507f1f77bcf86cd799439011",
    "status": "created",
    "expiresAt": "2025-11-12T10:15:00.000Z",
    "product": {
      "id": "507f191e810c19729de860ea",
      "title": "Taylor Swift Eras Tour - VIP + Meet & Greet",
      "price": 499.99
    },
    "version": 0
  }
]
```

---

#### **12. Get Order Details**

**Request:**
```http
GET {{baseUrl}}/api/orders/608f191e810c19729de860eb
```

**Expected Response:** `200 OK`
```json
{
  "id": "608f191e810c19729de860eb",
  "userId": "507f1f77bcf86cd799439011",
  "status": "created",
  "expiresAt": "2025-11-12T10:15:00.000Z",
  "product": {
    "id": "507f191e810c19729de860ea",
    "title": "Taylor Swift Eras Tour - VIP + Meet & Greet",
    "price": 499.99
  },
  "version": 0
}
```

---

#### **13. Cancel Order (Option A: Manual)**

**Request:**
```http
DELETE {{baseUrl}}/api/orders/608f191e810c19729de860eb
```

**Expected Response:** `204 No Content`

**What Happens:**
1. ✅ Order status updated to `cancelled`
2. ✅ `order:cancelled` event published
3. ✅ Products Service releases product (clears `orderId`)
4. ✅ Product available for others to purchase

---

#### **14. Wait for Expiration (Option B: Automatic)**

**Don't cancel manually - wait 15 minutes**

After `expiresAt` timestamp:

1. ✅ Redis Bull job executes
2. ✅ Expiration Service publishes `expiration:complete`
3. ✅ Orders Service receives event
4. ✅ Order status updated to `cancelled`
5. ✅ `order:cancelled` event published
6. ✅ Product released

**Verify with:**
```http
GET {{baseUrl}}/api/orders/608f191e810c19729de860eb
```

**Expected Response:**
```json
{
  "id": "608f191e810c19729de860eb",
  "status": "cancelled",  // ⚠️ Changed!
  ...
}
```

---

#### **15. Verify Product Released**

**Request:**
```http
GET {{baseUrl}}/api/products/507f191e810c19729de860ea
```

**Expected Response:**
```json
{
  "id": "507f191e810c19729de860ea",
  "orderId": undefined,  // ✅ Released!
  "version": 2
}
```

---

#### **16. Signout**

**Request:**
```http
POST {{baseUrl}}/api/users/signout
```

**Expected Response:** `200 OK`
```json
{}
```

**Cookie Cleared:** `session` cookie removed

---

### Common Error Responses

#### **401 Unauthorized** (Not authenticated)
```json
{
  "errors": [
    {
      "message": "Not authorized"
    }
  ]
}
```

#### **400 Bad Request** (Validation failed)
```json
{
  "errors": [
    {
      "message": "Email must be valid",
      "field": "email"
    },
    {
      "message": "Password must be between 4 and 20 characters",
      "field": "password"
    }
  ]
}
```

#### **404 Not Found**
```json
{
  "errors": [
    {
      "message": "Not Found"
    }
  ]
}
```

---

### Testing Tips

1. **Enable Cookie Jar**: Postman → Settings → Cookies → Enable cookies
2. **HTTPS Certificate**: Accept self-signed certificate warnings
3. **Test Expiration**: 
   - For faster testing, modify `expiresAt` calculation in Orders Service
   - Change `15 * 60 * 1000` to `60 * 1000` (1 minute)
4. **Monitor Events**: 
   ```bash
   kubectl logs -f deployment/nats-depl
   ```
5. **Check Redis Queue**:
   ```bash
   kubectl exec -it deployment/expiration-depl -- redis-cli
   > KEYS bull:order:expiration:*
   ```

---

## 🐳 Deployment

### Kubernetes Resources

Each service deploys with:
- **Deployment** - Pod replicas (1 for dev, scale in prod)
- **Service** - Internal ClusterIP
- **MongoDB Deployment + Service** - Dedicated database per service (auth, products, orders)
- **Redis Deployment + Service** - For Expiration service job queue
- **NATS Deployment + Service** - Event streaming server

**Environment Variables** (configured via ConfigMaps/Secrets):

**Auth Service:**
- `JWT_KEY` - JWT signing secret (from Secret)
- `MONGO_URI` - `mongodb://auth-mongo-srv:27017/auth`

**Products Service:**
- `MONGO_URI` - `mongodb://product-mongo-srv:27017/products`
- `NATS_URL` - `http://nats-srv:4222`
- `NATS_CLUSTER_ID` - `ticketing`
- `NATS_CLIENT_ID` - Auto-generated from pod name

**Orders Service:**
- `MONGO_URI` - `mongodb://order-mongo-srv:27017/orders`
- `NATS_URL` - `http://nats-srv:4222`
- `NATS_CLUSTER_ID` - `ticketing`
- `NATS_CLIENT_ID` - Auto-generated from pod name

**Expiration Service:**
- `REDIS_HOST` - `redis-srv`
- `NATS_URL` - `http://nats-srv:4222`
- `NATS_CLUSTER_ID` - `ticketing`
- `NATS_CLIENT_ID` - Auto-generated from pod name

**Client:**
- No environment variables (connects via Ingress)

### Building for Production

```bash
# Build all images
docker build -t yourregistry/auth:latest ./auth
docker build -t yourregistry/products:latest ./products
docker build -t yourregistry/orders:latest ./orders
docker build -t yourregistry/expiration:latest ./expiration
docker build -t yourregistry/client:latest ./client

# Push to registry
docker push yourregistry/auth:latest
docker push yourregistry/products:latest
docker push yourregistry/orders:latest
docker push yourregistry/expiration:latest
docker push yourregistry/client:latest

# Apply manifests
kubectl apply -f infra/k8s/
```

---

---

## 🧪 Testing

### Test Strategy

- **Unit Tests** - Individual functions and methods
- **Integration Tests** - API routes with in-memory MongoDB
- **Event Tests** - Publisher/Listener behavior with mocked NATS

### Test Coverage

```bash
# Run all tests with coverage
npm test -- --coverage
```

**Key Testing Patterns:**
- MongoDB Memory Server for isolated DB tests
- Mocked NATS wrapper to avoid external dependencies
- Global `signin()` helper for authenticated requests
- Supertest for HTTP assertions

---

## 🔐 Security Features

- ✅ **JWT Authentication** - Stateless tokens in HTTP-only cookies
- ✅ **Password Hashing** - Scrypt with random salts
- ✅ **HTTPS/TLS** - All traffic encrypted
- ✅ **CORS Protection** - Cookie-based auth prevents CSRF
- ✅ **Input Validation** - Express-validator on all routes
- ✅ **Error Sanitization** - No stack traces in production
- ✅ **Ownership Checks** - Users can only modify their own resources

---

## 🎨 Future Enhancements

### Planned Services

- [x] **Expiration Service** - ✅ Implemented! Auto-cancel orders after 15 minutes using Redis Bull
- [ ] **Payments Service** - Stripe integration for checkout

### Infrastructure Improvements

- [ ] **OpenTelemetry Tracing** - Distributed tracing with Tempo/Jaeger
- [ ] **Centralized Logging** - ELK/Loki stack
- [ ] **Metrics & Monitoring** - Prometheus + Grafana dashboards
- [ ] **API Rate Limiting** - Redis-backed throttling middleware
- [ ] **Service Mesh** - Istio for advanced traffic management
- [ ] **CI/CD Pipeline** - GitHub Actions + ArgoCD for GitOps
- [ ] **Horizontal Pod Autoscaling** - Based on CPU/Memory metrics
- [ ] **Database Backups** - Automated MongoDB backup to S3

### Features

- [ ] **Product Categories** - Filter tickets by event type (concert, sports, theater)
- [ ] **Search & Filtering** - Full-text search with Elasticsearch
- [ ] **User Profiles** - Order history, saved preferences
- [ ] **Admin Dashboard** - Manage users, products, and orders
- [ ] **Email Notifications** - Order confirmation, expiration warnings
- [ ] **Webhook Support** - Third-party integrations
- [ ] **Multi-Currency Support** - International pricing
- [ ] **Reviews & Ratings** - User feedback system

---

## 📚 Learning Resources

This project demonstrates concepts from:

- **Microservices Patterns** by Chris Richardson
- **Building Microservices** by Sam Newman
- **Kubernetes in Action** by Marko Lukša
- Stephen Grider's Microservices course

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📝 License

This project is licensed under the ISC License.

---

## 👤 Author

**DatNX**
- GitHub: [@Rayloveyou](https://github.com/Rayloveyou)
- NPM Organization: [@datnxtickets](https://www.npmjs.com/org/datnxtickets)

---

## 🙏 Acknowledgments

- NATS.io community for excellent messaging platform
- Kubernetes community for comprehensive documentation
- MongoDB team for developer-friendly database
- Next.js team for amazing SSR framework

---

**⭐ If you find this project helpful, please give it a star!**

---

## 📞 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review the documentation in each service's README

---

**Happy Coding! 🚀**
