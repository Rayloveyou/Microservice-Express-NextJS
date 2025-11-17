# 🛒 E‑Commerce Microservices (Production‑like, Minikube)

A complete multi‑service e‑commerce system running on Kubernetes (Minikube) with TLS via mkcert. The system uses event‑driven communication (NATS), per‑service MongoDB, and a Next.js client. The architecture has been redesigned to remove expiration/locking: stock is only decremented after Stripe payment succeeds.

Highlights
- No product locking or expiration service
- Stripe Elements on client; PaymentCreated drives inventory updates
- Shared NPM package: `@datnxecommerce/common`
- Ingress domain: `ecommerce.local` (TLS via mkcert)
- Dev loop: Skaffold, containers built in prod mode


## Contents
- Architecture & Directory
- Services (responsibilities, routes, envs, DB schemas, events)
- Events (contracts)
- Local dev on Minikube with mkcert
- Secrets and credentials
- Postman test scenarios (end‑to‑end)
- Kubernetes resources & ingress
- Troubleshooting


## Architecture

```
Browser (Next.js) → NGINX Ingress (TLS, ecommerce.local)
                             │
        ┌──────────┬─────────┼──────────┬──────────┬──────────┐
        │          │         │          │          │          │
      Auth      Products    Orders    Payments     Cart      NATS
      Mongo       Mongo      Mongo      Mongo      Mongo     (bus)
        ▲           ▲          ▲          ▲          ▲          
        └─────────────── Event messages over NATS ─────────────┘
```

Directory (top‑level)
```
auth/ products/ orders/ payments/ cart/ client/ common/ infra/k8s/ skaffold.yaml
```


## Services (deep dive)

Shared NPM package: `@datnxecommerce/common`
- Errors, middlewares (auth/validation), event base classes & typings.

Auth (image `datnx/auth`)
- Routes: POST `/api/users/signup`, POST `/signin`, POST `/signout`, GET `/currentuser`
- Env: `JWT_KEY`, Mongo creds via ConfigMap/Secret
- DB (Mongo `auth`): `users` { _id, email unique, password, __v }
- Events: none

Products (image `datnx/product`)
- Routes: `GET /api/products`, `GET /:id`, `POST /api/products`, `PUT /:id`
- Env: `JWT_KEY`, `NATS_URL`, `NATS_CLUSTER_ID=ticketing`, `NATS_CLIENT_ID` (pod name)
- DB (Mongo `products`): `products` { _id, title, price, quantity, userId, version, __v }
- Events: publish ProductCreated/ProductUpdated; consume PaymentCreated (to reduce quantity)

Cart (image `datnx/cart`)
- Routes: `GET /api/cart`, `POST /api/cart/items`, `DELETE /api/cart/items/:productId`
- Env: `JWT_KEY`, NATS settings, Mongo creds
- DB (Mongo `cart`): `carts` { _id, userId, items: [ { productId, quantity } ] }
- Events: consume PaymentCreated (remove purchased items)

Orders (image `datnx/order`)
- Routes: `POST /api/orders`, `GET /api/orders`, `GET /api/orders/:id`, `DELETE /api/orders/:id`
- Env: `JWT_KEY`, NATS settings, Mongo creds
- DB (Mongo `orders`): `orders` { _id, userId, status, items[ { productId, titleSnapshot, priceSnapshot, quantity } ], total, version }
- Events: publish OrderCreated/OrderCancelled (no expiredAt);

Payments (image `datnx/payment`)
- Routes: `POST /api/payments` { token, orderId }
- Env: `JWT_KEY`, `STRIPE_SECRET_KEY`, NATS settings, Mongo creds
- DB (Mongo `payments`): `payments` { _id, orderId, stripeId, __v }
- Events: publish PaymentCreated { orderId, items[], stripeId }

Client (image `datnx/client`)
- Next.js 16, production build, custom `server.js`
- Stripe Elements (`@stripe/react-stripe-js` & `@stripe/stripe-js`)
- Env: `NEXT_PUBLIC_STRIPE_KEY` injected from K8s `stripe-secret` (publishable)

NATS (nats-streaming:0.17.0)
- Cluster id: `ticketing`, svc `nats-svc` (4222)


## Events (contracts)

ProductCreated
```json
{ "id": "...", "title": "...", "price": 999, "quantity": 10, "userId": "...", "version": 0 }
```

ProductUpdated
```json
{ "id": "...", "title": "...", "price": 899, "quantity": 6, "userId": "...", "version": 2 }
```

OrderCreated
```json
{ "id": "...", "userId": "...", "status": "Created", "items": [ { "productId": "...", "quantity": 1, "priceSnapshot": 999, "titleSnapshot": "..." } ], "total": 999, "version": 0 }
```

OrderCancelled
```json
{ "id": "...", "version": 1 }
```

PaymentCreated
```json
{ "id": "...", "orderId": "...", "stripeId": "ch_...", "items": [ { "productId": "...", "quantity": 1 } ] }
```


## Local development (Minikube + mkcert)

Prereqs: Docker Desktop/Minikube, kubectl, Skaffold, Node 20+, mkcert

1) Start cluster & ingress
```bash
minikube start --cpus=4 --memory=8192
minikube addons enable ingress
minikube tunnel   # keep this terminal running
```

2) TLS & hosts
```bash
mkcert -install
mkcert ecommerce.local
kubectl create secret tls ecommerce-local-tls \
  --cert=ecommerce.local.pem \
  --key=ecommerce.local-key.pem
echo "127.0.0.1 ecommerce.local" | sudo tee -a /etc/hosts
```

3) Required secrets
```bash
kubectl create secret generic jwt-secret \
  --from-literal=JWT_KEY='dev_jwt_secret'

kubectl create secret generic stripe-secret \
  --from-literal=STRIPE_SECRET_KEY='sk_test_xxx' \
  --from-literal=STRIPE_PUBLISHABLE_KEY='pk_test_xxx'
```

4) Dev loop
```bash
skaffold dev
```

Open: https://ecommerce.local


## Kubernetes resources & ingress

Ingress: `infra/k8s/ingress/ingress.yaml`
- Host `ecommerce.local`
- Routes:
  - `/` → `client-svc`
  - `/api/users` → `auth-svc`
  - `/api/products` → `product-svc`
  - `/api/cart` → `cart-svc`
  - `/api/orders` → `order-svc`
  - `/api/payments` → `payment-svc`

Deployments & Services (per service): see `infra/k8s/*/*-depl.yaml`
- Each service uses its own Mongo deployment/service + ConfigMap/Secret for creds
- NATS at `nats-svc:4222`

Client deployment injects env:
```yaml
env:
- name: NEXT_PUBLIC_STRIPE_KEY
  valueFrom:
    secretKeyRef:
      name: stripe-secret
      key: STRIPE_PUBLISHABLE_KEY
```


## Secrets & credentials

You must provide:
- `jwt-secret` → `JWT_KEY`
- `stripe-secret` → `STRIPE_SECRET_KEY` (secret), `STRIPE_PUBLISHABLE_KEY` (publishable)
- Mongo usernames/passwords (already templated in `infra/k8s/**` ConfigMaps/Secrets)

Client runtime gets publishable key via SSR props; if the key is wrong you’ll see Stripe 401/invalid key.


## Postman test scenarios

Environment
- `baseUrl` = `https://ecommerce.local`
- Accept self‑signed certificate

Import collection
- File: `infra/postman/ecommerce.postman_collection.json`

1) Auth
- POST `{{baseUrl}}/api/users/signup` { email, password }
- POST `{{baseUrl}}/api/users/signin`
- GET `{{baseUrl}}/api/users/currentuser`

2) Products
- POST `{{baseUrl}}/api/products` { title, price, quantity }
- GET `{{baseUrl}}/api/products`
- GET `{{baseUrl}}/api/products/:id`

3) Cart
- POST `{{baseUrl}}/api/cart/items` { productId, quantity }
- GET `{{baseUrl}}/api/cart`

4) Orders & payments
- POST `{{baseUrl}}/api/orders` { items: [{ productId, quantity }] }
- GET `{{baseUrl}}/api/orders/:orderId`
- POST `{{baseUrl}}/api/payments` { token: "tok_visa", orderId }
  - `tok_visa` works in Stripe test mode (no need to generate token manually)
- Verify order becomes Complete, product quantity decreases, cart clears


## Stripe integration (client)

- Uses Stripe Elements; card form embedded on order page.
- We pass `NEXT_PUBLIC_STRIPE_KEY` to the page via server‑side props (runtime‑safe).
- Test card: `4242 4242 4242 4242`, any future date, any CVC.


## Troubleshooting

- Invalid publishable key: `kubectl exec -it $(kubectl get pods -l app=client -o jsonpath='{.items[0].metadata.name}') -- printenv | grep STRIPE`
- 401 from `api.stripe.com/v1/tokens`: publishable key wrong/disabled
- Next.js dev vs prod env: client runs `node server.js` and uses SSR to expose the key
- If Stripe popup appears with legacy warning, ensure `react-stripe-checkout` is removed and Elements is used


## Contributing & license

- Shared changes → publish new `@datnxecommerce/common` and bump services
- Keep event contracts backward compatible
- License: ISC

Author: DatNX · Host: https://ecommerce.local · Org: @datnxecommerce

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
│ 4. Set expiredAt = now + 15 minutes            │
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
│ 1. Find product│   │    expireAt - now = 15min │
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
# JWT secret for auth
kubectl create secret generic jwt-secret --from-literal=JWT_KEY=your-secret-key

# Stripe secret for payments (use your test key)
kubectl create secret generic stripe-secret --from-literal=STRIPE_SECRET_KEY=sk_test_your_stripe_key
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
npm install @datnxecommerce/common@latest
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
  "expiredAt": "2025-11-12T10:15:00.000Z",
  "product": {
    "id": "507f191e810c19729de860ea",
    "title": "Taylor Swift Eras Tour - VIP + Meet & Greet",
    "price": 499.99
  },
  "version": 0
}
```

**⚠️ Copy `expiredAt` - you have 15 minutes to complete payment!**

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
    "expiredAt": "2025-11-12T10:15:00.000Z",
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
  "expiredAt": "2025-11-12T10:15:00.000Z",
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

After `expireAt` timestamp:

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
   - For faster testing, modify `expiredAt` calculation in Orders Service
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

**Payments Service:**
- `MONGO_URI` - `mongodb://payment-mongo-srv:27017/payments`
- `NATS_URL` - `http://nats-srv:4222`
- `NATS_CLUSTER_ID` - `ticketing`
- `NATS_CLIENT_ID` - Auto-generated from pod name
- `STRIPE_SECRET_KEY` - Stripe API key (from Secret) - test mode: `sk_test_...`

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

### Completed Services ✅

- [x] **Auth Service** - JWT authentication with HTTP-only cookies
- [x] **Products Service** - Product CRUD with event publishing
- [x] **Orders Service** - Order management with reservation logic
- [x] **Expiration Service** - Auto-cancel orders after 15 minutes using Redis Bull
- [x] **Payments Service** - Stripe Charges API integration (test mode)
- [x] **Client** - Next.js SSR with Bootstrap UI

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
