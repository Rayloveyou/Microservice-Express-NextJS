# 🛒 Ticketing Microservices Platform

A **modern e-commerce platform** built on microservices, designed for realistic production scenarios: **Node.js**, **TypeScript**, **Next.js 16**, **MongoDB**, **NATS Streaming**, **Stripe**, **MinIO**, and **Kubernetes** running on **Minikube** with TLS from **mkcert** covering `https://ecommerce.local`, `https://minio.local`, and `https://minio-api.local`.

This project demonstrates:

- 🔐 **User Authentication & Session Management** with JWT cookies
- 🧺 **Persistent Shopping Cart** that survives page refreshes and clears only after payment
- 🛍️ **Product Catalog & Inventory Management** backed by MinIO-hosted media
- 🧾 **Order Lifecycle** without product locking or automatic expiration (intentionally simplified)
- 💳 **Stripe Payments** with post-payment inventory reconciliation
- 📨 **Event-Driven Architecture** using NATS Streaming and shared event contracts
- 🚀 **Kubernetes-native workflow** powered by Skaffold, mkcert, and Minikube

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
- [Learning Resources](#-learning-resources)
- [Contributing](#-contributing)
- [License](#-license)
- [Author](#-author)
- [Acknowledgments](#-acknowledgments)
- [Support](#-support)

---

## 🏗 Architecture Overview
```
┌────────────────────────────────────────────────────────────────────────────┐
│                         Client (Next.js 16 SSR)                            │
│                      https://ecommerce.local                               │
└───────────────────────────────┬────────────────────────────────────────────┘
                                │
                       ┌────────▼─────────┐
                       │  NGINX Ingress   │
                       │  mkcert TLS      │
                       └────────┬─────────┘
                                │
       ┌─────────────────────────┼──────────────────────────┬──────────────┐
       │                         │                          │              │
┌──────▼──────┐         ┌────────▼────────┐         ┌────────▼────────┐    │
│ Auth Svc    │         │ Products Svc    │         │ Orders Svc      │    │
│ Mongo `auth`│         │ Mongo `products`│         │ Mongo `orders`  │    │
└──────┬──────┘         └────────┬────────┘         └────────┬────────┘    │
       │                         │                          │              │
       │                 ┌───────▼────────┐         ┌────────▼────────┐    │
       │                 │  Cart Svc      │         │ Payments Svc     │    │
       │                 │  Mongo `cart`  │         │ Mongo `payments` │    │
       │                 └───────┬────────┘         └────────┬────────┘    │
       │                         │                          │              │
       └─────────────────────────┴─────────────┬─────────────┴──────────────┘
                                               │
                                        ┌──────▼──────┐
                                        │  NATS Bus   │
                                        │ (Streaming) │
                                        └──────┬──────┘
                                               │
                                        ┌──────▼──────┐
                                        │   MinIO     │
                                        │  (media)    │
                                        └─────────────┘
```
**Key design decisions**
- ✅ **Microservices + Database Per Service** – each service owns its schema on dedicated Mongo deployments
- ✅ **Event-Driven Communication** – asynchronous coordination via NATS Streaming, shared contracts in `common`
- ✅ **No Product Locking** – inventory is reduced only after `payment:created`, allowing optimistic selling
- ✅ **MinIO Storage** – local S3-compatible storage for product images served via dedicated ingress
- ✅ **Single Ingress / Multiple Domains** – `ecommerce.local` for the shop, `minio.local` for console, `minio-api.local` for object storage

---

## 🛠 Tech Stack
### Backend
- **Runtime:** Node.js 20+, TypeScript 5
- **Framework:** Express 5 + express-validator
- **Data:** MongoDB (per service) via Mongoose 8
- **Events:** NATS Streaming 0.17.0
- **Payments:** Stripe SDK (test mode)
- **Auth:** JWT in HTTP-only secure cookies
- **Testing:** Jest + Supertest

### Frontend
- **Framework:** Next.js 16 (Pages Router) + React 19
- **UI:** Bootstrap 5, Stripe Elements (`@stripe/react-stripe-js`)
- **HTTP:** Axios with SSR-aware client helper

### Infrastructure
- **Cluster:** Kubernetes (Minikube or Docker Desktop)
- **Dev loop:** Skaffold for build/deploy/watch
- **Ingress:** NGINX Ingress Controller
- **Certificates:** mkcert-generated TLS secrets
- **Storage:** MinIO for product assets

### Shared Library
- **`@datnxecommerce/common`** (local npm package)
  - Custom errors & middlewares
  - Base Publisher/Listener classes
  - Event typings (`product:created`, `payment:created`, ...)

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
- Events: publishes `product:created`, `product:updated`; consumes `payment:created`

### 3. Cart Service (`cart/`)
- Per-user cart stored in Mongo
- Holds items until a payment succeeds
- Listens to `payment:created` to clear purchased items
- Routes: `GET /api/cart`, `POST /api/cart/items`, `DELETE /api/cart/items/:productId`

### 4. Orders Service (`orders/`)
- Builds orders from cart snapshot; no expiration or locking
- Status: `Created`, `Complete`, `Cancelled`
- Listens to `payment:created` to mark orders complete
- Routes: `POST /api/orders`, `GET /api/orders`, `GET /api/orders/:id`, `DELETE /api/orders/:id`
- Events: publishes `order:created`, `order:cancelled`

### 5. Payments Service (`payments/`)
- Validates ownership and status before charging Stripe
- Emits `payment:created` with purchased items for downstream consumers
- Routes: `POST /api/payments`
- Events: publishes `payment:created`; consumes `order:created`, `order:cancelled`

### 6. Client (`client/`)
- Next.js 16 SSR storefront
- Integrates Stripe Elements for modern card form
- Pages include `/`, `/auth/*`, `/products/new`, `/orders/*`

### 7. MinIO (`infra/k8s/minio/`)
- Provides S3-compatible object storage with console + API ingress
- Credentials via `minio-secret`

### 8. Shared Package (`common/`)
- Houses reusable logic, event contracts, and middlewares, published locally via `npm run pub`

---

## 🗄 Database Schemas
### Auth (`auth.users`)
| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | Primary key |
| `email` | string | Unique, lowercase |
| `password` | string | Scrypt hash |
| `__v` | number | Version key |

### Products (`products.products`)
| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId |
| `title` | string |
| `price` | number |
| `quantity` | number | Current stock |
| `imageUrl` | string | MinIO public URL |
| `userId` | string | Owner |
| `version` | number | OCC counter |

### Cart (`cart.carts`)
| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId |
| `userId` | string |
| `items[]` | array | `{ productId, quantity }` |

### Orders (`orders.orders`)
| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId |
| `userId` | string |
| `status` | enum | `Created`, `Complete`, `Cancelled` |
| `items[]` | array | Snapshot of product details (title, price, quantity) |
| `total` | number |
| `version` | number |

### Payments (`payments.payments`, `payments.orders` replica)
| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | Payment document |
| `orderId` | string |
| `stripeId` | string | Stripe charge ID |
| `items[]` | array | Duplicated from order (event payload) |

Replica `orders` collection mirrors orders for validation, synced via order events.

### MinIO Buckets
- Default bucket `product-images` auto-created at service startup with public-read policy

---

## 📨 Event Architecture
| Event Subject | Publisher | Consumers | Payload |
|---------------|-----------|-----------|---------|
| `product:created` | Products | (future) | `{ id, title, price, quantity, imageUrl, userId, version }` |
| `product:updated` | Products | (future) | Same as above |
| `order:created` | Orders | Payments | `{ id, userId, status, total, items[], version }` |
| `order:cancelled` | Orders | Payments | `{ id, version }` |
| `payment:created` | Payments | Products, Cart, Orders | `{ id, orderId, stripeId, items[] }` |

**Guarantees**
- At-least-once delivery thanks to NATS Streaming durable subscriptions
- Queue groups provide horizontal scaling while preventing duplicate handlers
- OCC version numbers stop out-of-order updates from corrupting state

---

## 🔄 Complete Flow Diagrams
### Flow 1: Create Product with MinIO Media
```
User ──POST /api/products──► Products Service
        │                    1. Validate JWT + payload
        │                    2. Upload image to MinIO (`minio-svc`)
        │                    3. Persist product (quantity untouched)
        │                    4. Publish `product:created`
        ▼
      Success ◄────────────── NATS (future consumers)
```

### Flow 2: Checkout Happy Path (Cart → Order → Payment)
```
┌──────────────┐
│ User Browser │
└─────┬────────┘
      │ POST /api/cart/items { productId, quantity }
      ▼
┌──────────────┐    POST /api/orders { items[] }      ┌──────────────────────┐
│  Cart Svc    │ ───────────────────────────────────► │ Orders Service       │
└──────────────┘                                     │ - Snapshot items     │
                                                     │ - Status=Created     │
                                                     │ - Publish order evt  │
                                                     └─────────┬────────────┘
                                                               │ order:created
                                                               ▼
                                                         Payments Service caches order

User submits Stripe token → POST /api/payments { token, orderId }
Payments Service:
 1. Validates order ownership/status
 2. Charges Stripe
 3. Stores payment doc
 4. Publishes `payment:created` (includes items)

Downstream reactions to `payment:created`:
 - Products Service decrements inventory per item
 - Cart Service removes purchased items
 - Orders Service sets status = Complete
```

### Flow 3: Manual Order Cancellation
```
User ──DELETE /api/orders/:id──► Orders Service
                                1. Verify ownership
                                2. Set status=Cancelled
                                3. Publish `order:cancelled`
Orders UI reflects cancellation; inventory stays unchanged because it never decreased pre-payment.
```

### Flow 4: Media Access via MinIO
```
Admin Upload (Products Svc) ──► MinIO via internal svc (`minio-svc:9000`)
Public Client Image Load ──► https://minio-api.local/product-images/<key>
```

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

# Mongo + MinIO configs
kubectl apply -f infra/k8s/config/
kubectl apply -f infra/k8s/minio/
```

### 5. Run Skaffold dev loop
```bash
skaffold dev
```
Wait for logs showing each service listening on port 3000.

### 6. Access portals
- Shop: `https://ecommerce.local`
- MinIO Console: `https://minio.local` (default creds `minioadmin` / `minioadmin123`)
- MinIO API (public objects): `https://minio-api.local`

---

## 💻 Development
### Repo Layout
```
├── auth/        # Auth service
├── products/    # Product + MinIO upload service
├── cart/        # Shopping cart service
├── orders/      # Orders service
├── payments/    # Stripe payments service
├── client/      # Next.js app
├── common/      # Shared npm package
├── infra/
│   ├── k8s/     # Kubernetes manifests (services, Mongo, ingress)
│   └── postman/ # API collection
└── skaffold.yaml
```

### Testing
```bash
cd auth && npm test
cd products && npm test
# ...repeat per service
```
Each service leverages Jest + Supertest, with helpers in `test/setup.ts`. NATS client is mocked for isolation.

### Updating the shared package
```bash
cd common
npm run pub  # build, version bump, npm publish (local registry optional)

cd ../products
npm install @datnxecommerce/common@latest
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
- `NATS_URL`, `NATS_CLUSTER_ID`, `NATS_CLIENT_ID` – event bus configuration
- `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_KEY` – payment secrets
- Mongo host/user/password pulled from ConfigMaps + Secrets per service
- MinIO creds injected into products deployment for uploads

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

## 🔮 Future Enhancements
- [ ] Reinstate product reservation + expiration service using Redis/Bull
- [ ] Add email notifications for order/payment events
- [ ] Persistent volumes for Mongo & MinIO (currently `emptyDir` for dev)
- [ ] Automated test coverage reports in CI
- [ ] Observability stack (Grafana + Prometheus + Loki)
- [ ] Admin dashboards for product moderation

---

## 📚 Learning Resources
- NATS Streaming Docs – https://docs.nats.io
- mkcert – https://github.com/FiloSottile/mkcert
- Stripe Payments – https://stripe.com/docs/payments
- Kubernetes Basics – https://kubernetes.io/docs/home/

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
- Thanks to the NATS.io, Kubernetes, and Next.js communities

---

## 📞 Support
- Open a GitHub issue with logs + reproduction steps
- Check `infra/postman` for ready-made API tests
- Reach out via repo discussions for architectural questions

**Happy coding! 🚀**
