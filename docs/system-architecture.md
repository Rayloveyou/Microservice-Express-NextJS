# System Architecture

## Overview

This document describes the system architecture of the e-commerce microservices platform, including service interactions, data flow, deployment topology, and architectural patterns.

---

## High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         External Users                          │
│              (Customers via Browser/Mobile)                     │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NGINX Ingress Controller                     │
│                    (TLS Termination + Routing)                  │
│                                                                 │
│  Routes:                                                        │
│  • ecommerce.local/              → Client Frontend             │
│  • ecommerce.local/api/users     → Auth Service                │
│  • ecommerce.local/api/products  → Products Service            │
│  • ecommerce.local/api/cart      → Cart Service                │
│  • ecommerce.local/api/orders    → Orders Service              │
│  • ecommerce.local/api/payments  → Payments Service            │
│  • ecommerce.local/ws/*          → Notifications Service       │
│  • admin.ecommerce.local/        → Admin Frontend              │
└───────────────────────────┬─────────────────────────────────────┘
                            │
          ┌─────────────────┴──────────────────┐
          │         Kubernetes Cluster         │
          │                                    │
    ┌─────▼──────┐                  ┌─────────▼─────────┐
    │  Frontend  │                  │   Microservices   │
    │  Services  │                  │                   │
    │            │                  │  ┌─────────────┐  │
    │ ┌────────┐ │                  │  │    Auth     │  │
    │ │ Client │ │                  │  │   Service   │  │
    │ │Next.js │ │                  │  └──────┬──────┘  │
    │ └────────┘ │                  │         │         │
    │            │                  │  ┌──────▼──────┐  │
    │ ┌────────┐ │                  │  │  Products   │  │
    │ │ Admin  │ │                  │  │   Service   │  │
    │ │Next.js │ │                  │  └──────┬──────┘  │
    │ └────────┘ │                  │         │         │
    └────────────┘                  │  ┌──────▼──────┐  │
                                    │  │    Cart     │  │
                                    │  │   Service   │  │
                                    │  └──────┬──────┘  │
                                    │         │         │
                                    │  ┌──────▼──────┐  │
                                    │  │   Orders    │  │
                                    │  │   Service   │  │
                                    │  └──────┬──────┘  │
                                    │         │         │
                                    │  ┌──────▼──────┐  │
                                    │  │  Payments   │  │
                                    │  │   Service   │  │
                                    │  └──────┬──────┘  │
                                    │         │         │
                                    │  ┌──────▼──────┐  │
                                    │  │Notification │  │
                                    │  │  Service    │  │
                                    │  └─────────────┘  │
                                    └───────────────────┘
                                             │
                ┌────────────────────────────┼────────────────────────┐
                │                            │                        │
         ┌──────▼───────┐          ┌────────▼────────┐     ┌────────▼────────┐
         │Apache Kafka  │          │   MongoDB       │     │     Redis       │
         │+ Zookeeper   │          │  (per service)  │     │   (Cache +      │
         │              │          │                 │     │  Revocation)    │
         │ Topics:      │          │ Databases:      │     └─────────────────┘
         │ • product.*  │          │ • auth-mongo    │
         │ • order.*    │          │ • product-mongo │     ┌─────────────────┐
         │ • payment.*  │          │ • cart-mongo    │     │     MinIO       │
         │ • cart.*     │          │ • order-mongo   │     │ (Object Storage)│
         └──────────────┘          │ • payment-mongo │     │                 │
                                   └─────────────────┘     │ • Product Images│
                                                           └─────────────────┘
                                             │
                                    ┌────────▼────────┐
                                    │  Stripe API     │
                                    │  (External)     │
                                    └─────────────────┘
```

---

## Service Descriptions

### 1. Auth Service

**Responsibilities**:
- User registration and authentication
- JWT token issuance (access + refresh tokens)
- Token refresh and revocation
- User profile management
- Admin user management

**Technology**:
- Express.js + TypeScript
- MongoDB (user credentials)
- Redis (token revocation)
- JWT for stateless authentication

**API Endpoints**:
- `POST /api/users/signup` - Register new user
- `POST /api/users/signin` - Login
- `POST /api/users/signout` - Logout (revoke token)
- `GET /api/users/currentuser` - Get authenticated user
- `POST /api/users/refresh` - Refresh access token
- `POST /api/users/profile` - Update profile
- `GET /api/users/admin/users` - List users (admin only)

**Data Model**:
```typescript
User {
  id: string
  email: string (unique)
  password: string (hashed)
  role: 'user' | 'admin'
  name: string
  phone: string
  address: string
  isBlocked: boolean
  refreshToken: string
  refreshTokenExpiresAt: Date
}
```

**External Dependencies**: None (no event publishing)

---

### 2. Products Service

**Responsibilities**:
- Product catalog CRUD
- Image upload to MinIO
- Inventory management
- Publishes product events

**Technology**:
- Express.js + TypeScript
- MongoDB (products)
- Kafka (event publishing)
- MinIO (image storage)
- Multer (file uploads)

**API Endpoints**:
- `POST /api/products` - Create product (with image)
- `GET /api/products` - List all products
- `GET /api/products/:id` - Get product details
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `POST /api/products/:id/reserve` - Reserve inventory (internal)

**Data Model**:
```typescript
Product {
  id: string
  title: string
  price: number
  userId: string (creator)
  quantity: number (inventory)
  version: number (optimistic locking)
  imageUrl: string
}
```

**Events Published**:
- `product.created` - After product creation
- `product.updated` - After product update

**Events Consumed**:
- `payment.created` - Decrements inventory after successful payment

---

### 3. Cart Service

**Responsibilities**:
- Shopping cart management
- Add/remove items
- Cart checkout (initiates order creation)
- Maintains product replica for display

**Technology**:
- Express.js + TypeScript
- MongoDB (carts)
- Kafka (event consumption + publishing)
- Axios (HTTP call to Orders service)

**API Endpoints**:
- `POST /api/cart/add` - Add item to cart
- `GET /api/cart` - View cart
- `DELETE /api/cart/remove` - Remove item
- `POST /api/cart/checkout` - Checkout (creates order)

**Data Model**:
```typescript
Cart {
  id: string
  userId: string (unique - one cart per user)
  items: CartItem[]
  version: number
}

CartItem {
  productId: string
  quantity: number
}

Product (replica) {
  id: string
  title: string
  price: number
  quantity: number
  imageUrl: string
}
```

**Events Published**:
- `cart.checkout` - After checkout initiated (logging/analytics)

**Events Consumed**:
- `product.created` - Adds product to local cache
- `product.updated` - Updates cached product
- `payment.created` - Clears cart after successful payment

**Synchronous Calls**:
- `POST /api/orders` (Orders service) - Creates order during checkout

---

### 4. Orders Service

**Responsibilities**:
- Order creation and management
- Stock validation
- Order history
- Publishes order events

**Technology**:
- Express.js + TypeScript
- MongoDB (orders)
- Kafka (event publishing/consumption)

**API Endpoints**:
- `POST /api/orders` - Create order (called by Cart service)
- `GET /api/orders` - List user's orders
- `GET /api/orders/:id` - Get order details
- `DELETE /api/orders/:id` - Cancel order
- `GET /api/orders/admin/all` - Admin view all orders

**Data Model**:
```typescript
Order {
  id: string
  userId: string
  userEmail: string
  status: 'created' | 'pending' | 'completed' | 'cancelled'
  items: OrderItem[]
  total: number
  version: number
}

OrderItem {
  productId: string
  quantity: number
  price: number (snapshot at purchase)
  title: string (snapshot at purchase)
}

Product (replica) {
  id: string
  title: string
  price: number
  quantity: number
}
```

**Events Published**:
- `order.created` - After order creation
- `order.cancelled` - After order cancellation

**Events Consumed**:
- `product.created` - Adds product to local cache
- `product.updated` - Updates cached product
- `payment.created` - Marks order as completed

---

### 5. Payments Service

**Responsibilities**:
- Stripe payment processing
- Create payment charges
- Publish payment events
- Replicate orders for validation

**Technology**:
- Express.js + TypeScript
- MongoDB (payment records)
- Kafka (event consumption + publishing)
- Stripe SDK

**API Endpoints**:
- `POST /api/charges` - Create payment charge

**Data Model**:
```typescript
Payment {
  id: string
  orderId: string
  stripeId: string (Stripe transaction ID)
}

Order (replica) {
  id: string
  userId: string
  status: string
  items: OrderItem[]
  total: number
}

Product (replica) {
  id: string
  title: string
  price: number
}
```

**Events Published**:
- `payment.created` - After successful charge

**Events Consumed**:
- `order.created` - Replicates order for payment validation
- `order.cancelled` - Marks order as cancelled

**External API**:
- Stripe API - Processes credit card charges

---

### 6. Notifications Service

**Responsibilities**:
- Real-time WebSocket notifications
- Broadcast events to connected clients
- User-specific notification routing

**Technology**:
- Express.js + TypeScript
- WebSocket (ws library)
- Kafka (event consumption)
- No database (in-memory tracking)

**API Endpoints**:
- `GET /api/notifications/health` - Health check
- WebSocket: `/ws/notifications` - WebSocket connection

**WebSocket Protocol**:
```json
// Client → Server (auth)
{
  "type": "auth",
  "userId": "user-id"
}

// Server → Client (notifications)
{
  "type": "product.created",
  "data": { ... }
}
```

**Events Consumed**:
- `product.created` - Broadcasts new product to clients
- `order.created` - Notifies user of order confirmation
- `payment.created` - Notifies user of payment success

---

### 7. Client Frontend (Next.js)

**Responsibilities**:
- Customer-facing UI
- Product browsing and shopping
- Cart and checkout
- Order history
- Real-time notifications

**Technology**:
- Next.js 16 (App Router)
- React 19
- Bootstrap 5.3.8
- Stripe Elements (payment UI)
- WebSocket client

**Key Features**:
- Server-side rendering (SEO)
- Client-side interactivity
- Context API state management
- Real-time WebSocket notifications

---

### 8. Admin Frontend (Next.js)

**Responsibilities**:
- Admin dashboard
- Product management
- Order monitoring
- User management

**Technology**:
- Next.js 16
- React 19
- Bootstrap 5.3.8

---

## Communication Patterns

### 1. Synchronous Communication (REST)

**Client → Services**: HTTP/HTTPS via NGINX Ingress
- User authentication via JWT cookies
- Cookie automatically forwarded by browser

**Service → Service**: Direct HTTP (rare)
- Cart → Orders: HTTP POST during checkout
- Forwards JWT cookie for authentication context

### 2. Asynchronous Communication (Kafka)

**Event Flow**:

```
Product Created:
  Products Service
    └─> product.created event
         ├─> Cart Service (cache product)
         ├─> Orders Service (cache product)
         └─> Notifications Service (notify clients)

Order Created:
  Orders Service
    └─> order.created event
         ├─> Payments Service (prepare for payment)
         └─> Notifications Service (notify user)

Payment Created:
  Payments Service
    └─> payment.created event
         ├─> Products Service (decrement inventory)
         ├─> Orders Service (mark order completed)
         ├─> Cart Service (clear cart)
         └─> Notifications Service (notify user)
```

**Consumer Groups**:
- Each service has unique consumer group per topic
- Enables horizontal scaling (multiple replicas share workload)
- Example: `cart-product-created`, `orders-product-created`

### 3. Real-time Communication (WebSocket)

**Notifications Service ↔ Client**:
- Persistent WebSocket connection
- User authentication via userId
- Broadcasts product, order, payment events

---

## Data Architecture

### Database per Service Pattern

**Principle**: Each microservice owns its database

**Benefits**:
- Loose coupling between services
- Independent scaling
- Technology choice flexibility
- Prevents shared database anti-pattern

**Databases**:
- auth-mongo: User credentials
- product-mongo: Product catalog
- cart-mongo: Shopping carts
- order-mongo: Orders
- payment-mongo: Payment records

### Data Replication via Events

**Problem**: Services need data from other services

**Solution**: Event-driven replication
- Products Service publishes `product.created` event
- Cart and Orders consume event and cache product data locally
- No direct database access between services

**Example**:
```
Products DB:                Cart DB:
┌──────────────┐           ┌──────────────┐
│ Product      │  event    │ Product      │
│ - id         │ ────────> │ - id         │
│ - title      │           │ - title      │
│ - price      │           │ - price      │
│ - quantity   │           │ - quantity   │
└──────────────┘           └──────────────┘
```

**Trade-offs**:
- ✅ Loose coupling
- ✅ High availability (no service-to-service calls)
- ❌ Eventual consistency (slight delay in updates)
- ❌ Storage overhead (duplicated data)

---

## Deployment Architecture

### Kubernetes Resources

**Namespaces**: Default (all resources in default namespace)

**Deployments**:
- Frontend: client, admin
- Backend: auth, products, cart, orders, payments, notifications
- Data: MongoDB (per service), Redis, Kafka, Zookeeper, MinIO

**Services (ClusterIP)**:
- Internal communication within cluster
- Example: `auth-svc:3000`, `product-svc:3001`

**Ingress (NGINX)**:
- External access point
- TLS termination
- Path-based routing

**Secrets**:
- jwt-secret: JWT signing key
- stripe-secret: Stripe API credentials
- MongoDB credentials (per service)

**ConfigMaps**:
- MongoDB connection strings
- Service URLs

### Resource Allocation

**Microservices**:
```yaml
resources:
  requests:
    cpu: 100m
    memory: 256Mi
  limits:
    cpu: 500m
    memory: 512Mi
```

**MongoDB**:
```yaml
resources:
  requests:
    cpu: 100m
    memory: 256Mi
```

**Kafka**:
```yaml
resources:
  requests:
    cpu: 500m
    memory: 1Gi
```

### Scaling Strategy

**Horizontal Pod Autoscaler (HPA)** - Future Enhancement:
```yaml
autoscaling:
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
```

**Manual Scaling**:
```bash
kubectl scale deployment products-depl --replicas=3
```

---

## Security Architecture

### Transport Security

**TLS/HTTPS**:
- NGINX Ingress handles TLS termination
- Certificates stored in Kubernetes secrets
- Development: Self-signed via mkcert
- Production: Let's Encrypt or cloud provider certs

### Authentication Flow

```
1. User → POST /api/users/signin
         ↓
2. Auth Service validates credentials
         ↓
3. Generate access token (15m) + refresh token (7d)
         ↓
4. Set HTTP-only cookies:
   - session (access token)
   - refreshToken (refresh token)
         ↓
5. Client stores cookies automatically
         ↓
6. Subsequent requests include cookies
         ↓
7. Auth middleware validates token
         ↓
8. Token expired? → POST /api/users/refresh
```

### Authorization

**Role-Based Access Control (RBAC)**:
- User role: Default for customers
- Admin role: For admin operations

**Middleware Chain**:
```typescript
router.delete('/api/products/:id',
  requireAuth,      // Ensure authenticated
  requireAdmin,     // Ensure admin role
  requireNotRevoked, // Check token not revoked
  handler
);
```

### Token Revocation

**Redis-Backed Blacklist**:
- On logout: Add token to Redis with TTL
- On request: Check if token in blacklist
- Automatic cleanup via TTL expiration

---

## Resilience Patterns

### 1. Circuit Breaker

**Status**: Not implemented (future enhancement)

**Use Case**: Protect against cascading failures when calling external APIs (Stripe)

### 2. Retry Logic

**Kafka Consumers**:
- Automatic retry on connection failure
- Exponential backoff (max 30s)
- 8 retry attempts

**Database Connections**:
- Retry with exponential backoff
- Server startup fails if connection unavailable

### 3. Graceful Shutdown

**SIGTERM/SIGINT Handling**:
```typescript
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await kafkaWrapper.disconnect();
  await mongoose.connection.close();
  process.exit(0);
});
```

### 4. Health Checks

**Kubernetes Probes**:
```yaml
livenessProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /api/ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

---

## Performance Considerations

### 1. Database Optimization

**Indexing**:
- User email (unique index)
- Product ID, User ID (indexes on foreign keys)
- Order userId, status (composite index)

**Query Optimization**:
- Use `.lean()` for read-only queries (skip Mongoose overhead)
- Pagination for large result sets (future enhancement)

### 2. Caching

**Redis**:
- Token revocation list (TTL-based cleanup)
- Future: Product catalog caching

### 3. Event Processing

**Kafka Partitioning**:
- Partition key: Entity ID (product ID, order ID)
- Ensures ordering within partition
- Enables parallel processing across partitions

**Consumer Groups**:
- Multiple replicas share workload
- Auto-rebalancing on scale up/down

### 4. Frontend Performance

**Next.js Optimizations**:
- Server-side rendering (faster initial load)
- Code splitting (smaller bundles)
- Image optimization (Next.js Image component)

---

## Monitoring & Observability (Future)

### Metrics (Prometheus)
- Request rate, latency, error rate
- Kafka consumer lag
- Database connection pool size

### Logging (ELK Stack)
- Centralized log aggregation
- Structured logging (JSON format)
- Log levels: ERROR, WARN, INFO, DEBUG

### Tracing (OpenTelemetry)
- Distributed tracing across services
- Request correlation via trace ID
- Identify bottlenecks in event flows

---

## Known Architectural Limitations

1. **No API Gateway**: Services exposed directly via Ingress
   - Future: Kong or Ambassador for rate limiting, auth

2. **No Service Mesh**: Basic service-to-service networking
   - Future: Istio for mTLS, traffic management, observability

3. **No Distributed Transactions**: Eventual consistency only
   - Acceptable for e-commerce use case

4. **Single Kafka Replica**: Not fault-tolerant
   - Future: 3-replica Kafka cluster with replication

5. **Non-Persistent Storage**: emptyDir volumes (data loss on restart)
   - Future: PersistentVolumeClaims for MongoDB and MinIO

6. **No Rate Limiting**: Vulnerable to abuse
   - Future: Implement at API Gateway level

---

## Future Architecture Enhancements

### Phase 2
- [ ] API Gateway (Kong/Ambassador)
- [ ] Rate limiting and throttling
- [ ] PersistentVolumeClaims for databases
- [ ] Horizontal Pod Autoscaler
- [ ] Prometheus + Grafana monitoring

### Phase 3
- [ ] Service Mesh (Istio)
- [ ] Distributed tracing (Jaeger)
- [ ] ELK stack for centralized logging
- [ ] Circuit breaker pattern (Hystrix/Resilience4j)
- [ ] Multi-region deployment

---

This architecture supports a scalable, resilient, and maintainable e-commerce platform built on modern cloud-native principles.
