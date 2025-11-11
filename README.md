# 🎫 Ticketing Microservices Platform

A modern, event-driven microservices architecture built with **Node.js**, **TypeScript**, **React (Next.js)**, and **Kubernetes**. This platform demonstrates production-grade patterns for distributed systems including authentication, product management, order processing, and real-time event streaming.

---

## 📋 Table of Contents

- [Architecture Overview](#-architecture-overview)
- [Tech Stack](#-tech-stack)
- [Services](#-services)
- [Getting Started](#-getting-started)
- [Development](#-development)
- [Deployment](#-deployment)
- [API Documentation](#-api-documentation)
- [Event-Driven Architecture](#-event-driven-architecture)
- [Testing](#-testing)
- [Contributing](#-contributing)

---

## 🏗 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (Next.js)                        │
│                      https://ticketing.local                    │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Ingress NGINX     │
                    │   (SSL/TLS)         │
                    └──────────┬──────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
┌───────▼────────┐   ┌────────▼────────┐   ┌────────▼────────┐
│  Auth Service  │   │ Products Service│   │ Orders Service  │
│   + MongoDB    │   │   + MongoDB     │   │   + MongoDB     │
└───────┬────────┘   └────────┬────────┘   └────────┬────────┘
        │                     │                      │
        └─────────────────────┼──────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  NATS Streaming   │
                    │  (Event Bus)      │
                    └───────────────────┘
```

**Key Design Patterns:**
- ✅ **Microservices Architecture** - Independent, loosely coupled services
- ✅ **Event-Driven Communication** - Asynchronous messaging via NATS Streaming
- ✅ **Database Per Service** - Each service owns its data
- ✅ **API Gateway Pattern** - Ingress as single entry point
- ✅ **CQRS** - Command Query Responsibility Segregation
- ✅ **Optimistic Concurrency Control** - Version-based conflict resolution

---

## 🛠 Tech Stack

### Backend
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js 5
- **Database**: MongoDB (via Mongoose)
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

### 4. **Client** (`/client`)
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

## 🚀 Getting Started

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
cd auth  # or products, orders
npm install @datnxtickets/common@latest
```

---

## 🐳 Deployment

### Kubernetes Resources

Each service deploys with:
- **Deployment** - Pod replicas (1 for dev, scale in prod)
- **Service** - Internal ClusterIP
- **MongoDB Deployment + Service** - Dedicated database per service

**Environment Variables** (configured via ConfigMaps/Secrets):
- `JWT_KEY` - JWT signing secret
- `MONGO_URI` - MongoDB connection string
- `NATS_URL` - NATS server URL
- `NATS_CLUSTER_ID` - NATS cluster identifier
- `NATS_CLIENT_ID` - Unique client ID (uses pod name)

### Building for Production

```bash
# Build all images
docker build -t yourregistry/auth:latest ./auth
docker build -t yourregistry/products:latest ./products
docker build -t yourregistry/orders:latest ./orders
docker build -t yourregistry/client:latest ./client

# Push to registry
docker push yourregistry/auth:latest
# ... repeat for other services

# Apply manifests
kubectl apply -f infra/k8s/
```

---

## 📡 Event-Driven Architecture

### NATS Streaming Events

**Event Flow Example** (Create Order):

```
1. User creates order
   └─> Orders Service
       ├─> Check product availability
       ├─> Create order in MongoDB
       └─> Publish "order:created" event

2. NATS Streaming broadcasts event
   ├─> Products Service (lock product)
   ├─> Expiration Service (start countdown) [TODO]
   └─> Payments Service (prepare for payment) [TODO]

3. Order expires after 15 minutes
   └─> Expiration Service publishes "expiration:complete"
       └─> Orders Service cancels order
           └─> Publish "order:cancelled"
               └─> Products Service releases product
```

### Event Subjects

| Subject | Publisher | Consumers | Purpose |
|---------|-----------|-----------|---------|
| `product:created` | Products | Orders | Replicate product data |
| `product:updated` | Products | Orders | Sync product changes |
| `order:created` | Orders | Products, Payments* | Lock product, initiate payment |
| `order:cancelled` | Orders | Products, Payments* | Release product, refund |
| `expiration:complete`* | Expiration* | Orders | Auto-cancel expired orders |

*_Services marked with * are planned but not yet implemented_

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

- [ ] **Expiration Service** - Auto-cancel orders after 15 minutes
- [ ] **Payments Service** - Stripe integration for checkout

### Infrastructure Improvements

- [ ] **OpenTelemetry Tracing** - Distributed tracing with Tempo/Jaeger
- [ ] **Centralized Logging** - ELK/Loki stack
- [ ] **Metrics & Monitoring** - Prometheus + Grafana
- [ ] **API Rate Limiting** - Redis-backed throttling
- [ ] **Service Mesh** - Istio for advanced networking
- [ ] **CI/CD Pipeline** - GitHub Actions + ArgoCD
- [ ] **Horizontal Pod Autoscaling** - Based on CPU/Memory

### Features

- [ ] Product categories and search
- [ ] User profiles and order history
- [ ] Admin dashboard
- [ ] Email notifications
- [ ] Webhook support for third-party integrations

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
