# 🧱 Ticketing Microservices Platform

Microservices-based e-commerce stack designed for local Kubernetes (Minikube) with full TLS via mkcert, event-driven coordination over NATS Streaming, per-service MongoDB clusters, Stripe-powered checkout, and MinIO object storage served over `https://minio.local` and `https://minio-api.local`.

---

## 🗺️ High-Level Architecture
```
Browser (Next.js SSR @ https://ecommerce.local)
        │
        ▼
Ingress (NGINX + mkcert certs)
        │─────────────────────────────────────────────────────────────────────┐
        │                                                                     │
  Client Service (Next.js) ──calls──► Auth / Products / Cart / Orders / Payments APIs
        │                                                                     │
        └──────────────────────────────► NATS Streaming ◄──────────────────────┘
                                        │        │        │
                                        ▼        ▼        ▼
                                Products   Cart   Orders   Payments
                                 Mongo      Mongo   Mongo    Mongo
                                        │
                                        ▼
                              MinIO (media bucket)
```
- **Pattern:** Independent Node.js/Express services communicating with at-least-once events, each owning a Mongo database + schema migration via Mongoose.
- **State changes:** Orders stay unlocked; inventory is decremented only after `PaymentCreated`. Cart state persists until payment success.
- **Media:** Product service streams uploads to MinIO; objects are publicly served over `https://minio-api.local/<bucket>/<key>`.
- **Security:** All user flows go through HTTPS domains issued by mkcert; cookies are Secure + HTTP-only.

---

## 🧩 Service Catalog
| Service | Responsibilities | Key APIs | Data | Events |
|---------|------------------|----------|------|--------|
| `auth` | User signup/signin/signout, JWT issuance via cookie, password hashing with scrypt | `POST /api/users/signup`, `POST /api/users/signin`, `POST /api/users/signout`, `GET /api/users/currentuser` | Mongo `auth.users` | n/a |
| `products` | CRUD products, inventory enforcement post-payment, MinIO upload orchestration | `GET/POST/PUT /api/products` | Mongo `products.products` | Publishes `ProductCreated`, `ProductUpdated`; consumes `PaymentCreated` |
| `cart` | Persist user carts, add/remove items, clear after payment | `GET /api/cart`, `POST /api/cart/items`, `DELETE /api/cart/items/:productId` | Mongo `cart.carts` | Consumes `PaymentCreated` |
| `orders` | Build orders from cart snapshot, manual cancel, mark complete when paid | `POST/GET/DELETE /api/orders` | Mongo `orders.orders` | Publishes `OrderCreated`, `OrderCancelled`; consumes `PaymentCreated` |
| `payments` | Validate ownership, charge Stripe, emit payment events | `POST /api/payments` | Mongo `payments.payments` + replica of `orders` | Publishes `PaymentCreated`; consumes `OrderCreated`, `OrderCancelled` |
| `client` | Next.js 16 SSR storefront with Stripe Elements, cookie session hydration | `/` pages + auth/product/order routes | N/A | n/a |
| `minio` | S3-compatible storage for product assets | Console `https://minio.local`, API `https://minio-api.local` | Buckets per service (default `product-images`) | n/a |
| `common` | Shared npm package: typing, base Publisher/Listener, middlewares | - | - | - |
| `nats-test` | Utility publishers/subscribers for local debugging | CLI | - | - |

---

## 🗄️ Data Design
### Auth (`auth.users`)
- `_id`, `email` (unique, lowercase), `password` (scrypt hash), `__v`.
- JWT payload: `{ id, email, iat }` stored in cookie named `session`.

### Products (`products.products`)
- Fields: `title`, `price`, `quantity`, `userId`, `version` (OCC), `imageUrl` (MinIO), timestamps.
- Quantity only decremented inside `PaymentCreated` listener to avoid phantom reserves.

### Cart (`cart.carts`)
- `userId`, `items[]` with `{ productId, quantity }` plus metadata for rendering.
- Items removed when `PaymentCreated` arrives; no TTL.

### Orders (`orders.orders`)
- Snapshot of products: `items[].titleSnapshot`, `priceSnapshot`, `quantity` to maintain history.
- Status enum: `Created`, `AwaitingPayment`, `Cancelled`, `Complete`. No `expiresAt` field.

### Payments (`payments.payments`, `payments.orders` replica)
- Payment doc stores `orderId`, `stripeId` response, audit timestamps.
- Replica order collection stays in sync through `OrderCreated`/`OrderCancelled` to validate ownership and status before hitting Stripe.

### MinIO Buckets
- Default bucket `product-images` created lazily at startup.
- Public read policy applied programmatically (`products/src/config/cloudinary.ts`).

---

## 🔔 Event-Driven Contracts
| Event | Payload | Publisher | Consumers | Effects |
|-------|---------|-----------|-----------|---------|
| `product:created` | `{ id,title,price,quantity,userId,version,imageUrl }` | Products | (future listeners) | Broadcast catalog change |
| `product:updated` | Same as above | Products | (future listeners) | Keep caches in sync |
| `order:created` | `{ id,userId,status,items[],total,version }` | Orders | Payments | Payments caches order data |
| `order:cancelled` | `{ id,version }` | Orders | Payments | Payments marks local copy cancelled |
| `payment:created` | `{ id,orderId,stripeId,items[] }` | Payments | Products, Cart, Orders | Inventory decrement, cart purge, order status `Complete` |

**Delivery semantics:** NATS Streaming, queue groups per service, manual `ack()` after durable processing. New pods derive client IDs from pod metadata to avoid collisions.

---

## 🔁 Business Flows
### Checkout Happy Path
1. User adds items (`POST /api/cart/items`).
2. `POST /api/orders` snapshots cart → status `Created`, publishes `order:created`.
3. Payments service caches order and exposes it for Stripe.
4. User submits Stripe token via `POST /api/payments { token, orderId }`.
5. Payments charges test card, stores record, emits `payment:created` containing purchased item quantities.
6. Downstream effects:
   - Products decrements `quantity` per item.
   - Cart removes purchased products.
   - Orders marks `Complete`.

### Order Cancellation
- `DELETE /api/orders/:id` flips status to `Cancelled`, emits `order:cancelled`, which causes Payments to reject future charges for that order. Inventory remains untouched (never decremented pre-payment).

### Media Upload Flow
1. Seller attaches file when creating/updating product.
2. Product service streams buffer to MinIO via internal endpoint (`minio-svc:9000`).
3. Public URL `https://minio-api.local/product-images/<key>` returned in response and rendered on client.

---

## ☸️ Deploying on Minikube with mkcert & MinIO
### Prerequisites
- macOS or Linux with Docker.
- `minikube`, `kubectl`, `skaffold`, `mkcert`, `helm` (optional for tooling).
- Node.js 20+, npm 10+ for local builds.

### 1. Start/prepare cluster
```bash
minikube start --cpus=4 --memory=8192
minikube addons enable ingress
minikube tunnel  # keep running for LoadBalancer IPs
```

### 2. Generate TLS certificates
```bash
mkcert -install
mkcert ecommerce.local
mkcert minio.local
mkcert minio-api.local
```
Create secrets:
```bash
kubectl create secret tls ecommerce-local-tls \
  --cert=ecommerce.local.pem --key=ecommerce.local-key.pem
kubectl create secret tls minio-local-tls \
  --cert=minio.local.pem --key=minio.local-key.pem
kubectl create secret tls minio-api-local-tls \
  --cert=minio-api.local.pem --key=minio-api.local-key.pem
```

### 3. Map domains
Add to `/etc/hosts`:
```
127.0.0.1 ecommerce.local minio.local minio-api.local
```

### 4. Secrets & Config
```bash
kubectl create secret generic jwt-secret --from-literal=JWT_KEY='dev_jwt_key'
kubectl create secret generic stripe-secret \
  --from-literal=STRIPE_SECRET_KEY='sk_test_xxx' \
  --from-literal=STRIPE_PUBLISHABLE_KEY='pk_test_xxx'
# MinIO credentials (use values in infra/k8s/minio/minio-secret.example.yaml)
kubectl apply -f infra/k8s/config/  # Mongo configs/secrets
kubectl apply -f infra/k8s/minio/minio-depl.yaml
kubectl apply -f infra/k8s/ingress/minio-ingress.yaml
```

### 5. Developer loop with Skaffold
```bash
skaffold dev
```
- Builds Docker images for each service, feeds them into Minikube registry, applies manifests, and streams pod logs.
- Rebuilds incrementally on file changes.

### 6. Validate
```bash
kubectl get pods -A
kubectl get ingress
open https://ecommerce.local
open https://minio.local
```
MinIO console login defaults: `minioadmin` / `minioadmin123` (override via secret). API bucket endpoints live at `https://minio-api.local`.

---

## 🧪 API Testing Playbook
### Recommended tools
- **Postman**: Import `infra/postman/ecommerce.postman_collection.json`, set environment variable `baseUrl = https://ecommerce.local`.
- **HTTPie / curl**: pass `-k` for self-signed certs.

### Smoke script (curl)
```bash
BASE=https://ecommerce.local
COOKIE_JAR=/tmp/ecommerce.cookie

# Signup / signin
curl -k -c $COOKIE_JAR -X POST $BASE/api/users/signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"password"}'

# Create product (with optional image URL)
PRODUCT_ID=$(curl -k -b $COOKIE_JAR -X POST $BASE/api/products \
  -H 'Content-Type: application/json' \
  -d '{"title":"iPhone 15 Pro","price":999,"quantity":5}' | jq -r '.id')

# Add to cart and create order
curl -k -b $COOKIE_JAR -X POST $BASE/api/cart/items \
  -H 'Content-Type: application/json' \
  -d "{\"productId\":\"$PRODUCT_ID\",\"quantity\":1}"
ORDER_ID=$(curl -k -b $COOKIE_JAR -X POST $BASE/api/orders \
  -H 'Content-Type: application/json' \
  -d "{\"items\":[{\"productId\":\"$PRODUCT_ID\",\"quantity\":1}]}" | jq -r '.id')

# Pay with Stripe test token
toJSON='{ "token": "tok_visa", "orderId": "'$ORDER_ID'" }'
curl -k -b $COOKIE_JAR -X POST $BASE/api/payments \
  -H 'Content-Type: application/json' -d "$toJSON"

# Verify inventory/order/cart
curl -k -b $COOKIE_JAR $BASE/api/orders/$ORDER_ID | jq '.status'
curl -k -b $COOKIE_JAR $BASE/api/products/$PRODUCT_ID | jq '.quantity'
curl -k -b $COOKIE_JAR $BASE/api/cart | jq '.items'
```

### Postman scenarios
1. **Auth** – Signup → Signin → Current user (cookie session maintained automatically).
2. **Product lifecycle** – Create, list, get, update; verify MinIO image URL resolves via `https://minio-api.local` (use `-k` or trust root CA).
3. **Cart & Order** – Add multiple items, create order, cancel order, confirm statuses.
4. **Payment happy path** – Use `tok_visa`, inspect Stripe Dashboard (test mode) for created charges.
5. **Negative cases** – Attempt payment on cancelled order (`400`), request other user’s order (`401`), or reuse token after quantity depleted.

---

## 🔧 Operational Notes
- **Scaling:** Each service may scale independently; NATS queue groups ensure only one pod handles a message copy.
- **Observability:** Tail logs via `kubectl logs -l app=<service> -f`. Consider enabling NATS monitoring on port `8222`.
- **Stateful components:** MongoDB and MinIO currently use ephemeral volumes (suitable for dev). Swap `emptyDir` with PersistentVolumeClaims for durability.
- **Secrets management:** All sensitive values (JWT/Stripe/MinIO creds) live in Kubernetes secrets. Never commit them.

---

## 📚 References
- `infra/k8s/**` – Kubernetes manifests for every component, including MinIO ingress.
- `DOMAINS.md` – Quick domain/TLS checklist.
- `common/` – Shared npm library + publishing workflow.

Happy shipping! 🚀
