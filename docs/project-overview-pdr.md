# E-Commerce Microservices Platform - Project Overview & PDR

## Executive Summary

A modern, scalable e-commerce platform built with microservices architecture, featuring real-time notifications, secure payments via Stripe, and event-driven communication using Apache Kafka.

## Product Vision

Build a production-ready e-commerce platform that demonstrates modern cloud-native architecture patterns, including:
- Microservices with independent scaling
- Event-driven communication
- Real-time user notifications
- Secure authentication and authorization
- Payment processing integration

## Tech Stack

### Backend Services
- **Runtime**: Node.js v18+
- **Framework**: Express.js 5.1.0
- **Language**: TypeScript 5.9.3
- **Database**: MongoDB 8.19.2 (one instance per service)
- **Cache**: Redis 4.7.0
- **Message Broker**: Apache Kafka 7.5.0 (KafkaJS 2.2.4)
- **Testing**: Jest 30.2.0

### Frontend
- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19.2.0
- **Styling**: Bootstrap 5.3.8 + Custom CSS
- **Payment UI**: Stripe Elements (@stripe/react-stripe-js 5.3.0)
- **HTTP Client**: Axios 1.13.1

### Infrastructure
- **Orchestration**: Kubernetes (Minikube for local dev)
- **Ingress**: NGINX Ingress Controller
- **Object Storage**: MinIO (S3-compatible)
- **Containerization**: Docker
- **CI/CD**: Skaffold
- **TLS**: mkcert (local CA for development)

## System Architecture

### Microservices

1. **Auth Service** (Port 3000)
   - User registration and authentication
   - JWT token generation (15-min access, 7-day refresh)
   - Role-based access control (User/Admin)
   - Token revocation via Redis

2. **Products Service** (Port 3001)
   - Product catalog CRUD operations
   - Image upload to MinIO
   - Inventory management
   - Publishes product events

3. **Cart Service** (Port 3003)
   - Shopping cart management
   - Add/remove items
   - Checkout initiation
   - Publishes cart.checkout events

4. **Orders Service** (Port 3002)
   - Order creation and management
   - Stock validation
   - Order history
   - Publishes order events

5. **Payments Service** (Port 3004)
   - Stripe integration
   - Payment processing
   - Transaction records
   - Publishes payment.created events

6. **Notifications Service** (Port 3005)
   - WebSocket server for real-time notifications
   - Broadcasts product/order/payment events to clients
   - User-specific notification routing

7. **Client** (Port 3006)
   - Customer-facing Next.js frontend
   - Shopping experience
   - Real-time notifications via WebSocket

8. **Admin** (Port 3007)
   - Admin dashboard (Next.js)
   - Product and order management
   - User management

### Common Library
- **@datnxecommerce/common**: Shared utilities across microservices
  - Error classes
  - Middlewares (auth, validation, error handling)
  - Kafka wrapper (producer/consumer base classes)
  - Event type definitions
  - Redis client and revocation services

## Communication Patterns

### Synchronous (REST API)
- Client ↔ Services: HTTP/HTTPS via NGINX Ingress
- Cart → Orders: Direct HTTP call during checkout (with cookie forwarding)

### Asynchronous (Kafka Events)
- **product.created**: Products → Cart, Orders, Notifications
- **product.updated**: Products → Cart, Orders
- **cart.checkout**: Cart → Logging/Analytics
- **order.created**: Orders → Payments, Notifications
- **order.cancelled**: Orders → Payments
- **payment.created**: Payments → Products (inventory update), Cart, Notifications

### Real-time (WebSocket)
- Notifications Service → Client: Push notifications for new products, orders, payments

## Data Architecture

### Database per Service Pattern
Each microservice has an isolated MongoDB instance:
- auth-mongo: User credentials and profiles
- product-mongo: Product catalog
- cart-mongo: Shopping carts
- order-mongo: Orders and items
- payment-mongo: Payment transactions

### Data Replication via Events
Services maintain local replicas of data from other services:
- Cart/Orders replicate Products for validation
- Payments replicates Orders for charge validation
- Prevents direct database access across services

## Security

### Authentication
- JWT-based with access tokens (15-min) and refresh tokens (7-day)
- HTTP-only cookies to prevent XSS
- Secure flag for HTTPS-only transmission

### Authorization
- Role-based access control (User, Admin)
- Middleware: `requireAuth`, `requireAdmin`, `requireNotRevoked`

### Token Revocation
- Redis-backed blacklist
- TTL-based expiration
- Checked on every authenticated request

### Transport Security
- TLS/HTTPS via NGINX Ingress
- Self-signed certificates (mkcert) for local development

## Development Requirements

### Prerequisites
- Node.js v18+
- npm v10+
- Docker & Docker Compose
- Kubernetes (Minikube) with Ingress addon
- Skaffold
- mkcert (for TLS certificates)

### Local Development Setup

#### Option 1: Docker Compose
```bash
cd infra/docker
docker-compose up
```
Access at: http://localhost:8080

#### Option 2: Kubernetes (Minikube)
```bash
# Start Minikube
minikube start

# Enable Ingress
minikube addons enable ingress

# Generate TLS certificates
cd infra/tls-certs
mkcert ecommerce.local admin.ecommerce.local

# Create secrets
kubectl create secret tls ecommerce-local-tls --cert=ecommerce.local.pem --key=ecommerce.local-key.pem
kubectl create secret tls admin-ecommerce-local-tls --cert=admin.ecommerce.local.pem --key=admin.ecommerce.local-key.pem

# Deploy with Skaffold
skaffold dev
```

Add to /etc/hosts:
```
<MINIKUBE_IP> ecommerce.local admin.ecommerce.local
```

Access at: https://ecommerce.local

## Product Requirements

### Core Features
1. **User Management**
   - Registration and login
   - Profile management
   - Admin user management

2. **Product Catalog**
   - Browse products
   - Product details
   - Admin: Create/edit/delete products with images

3. **Shopping Cart**
   - Add/remove items
   - Quantity management
   - Persistent cart per user

4. **Order Processing**
   - Create orders from cart
   - Order history
   - Stock validation

5. **Payment Processing**
   - Stripe integration
   - Secure checkout
   - Payment confirmation

6. **Real-time Notifications**
   - New product notifications
   - Order status updates
   - Payment confirmations

### Non-Functional Requirements
- **Scalability**: Horizontal scaling via Kubernetes
- **Availability**: Service isolation prevents cascading failures
- **Consistency**: Event-driven eventual consistency
- **Performance**: Sub-second API response times
- **Security**: HTTPS, JWT, role-based access

## Deployment Architecture

### Kubernetes Resources
- **Deployments**: One per microservice + MongoDB + Redis + Kafka + MinIO
- **Services**: ClusterIP for internal communication
- **Ingress**: NGINX for external access with TLS
- **Secrets**: JWT keys, Stripe API keys, MongoDB credentials
- **ConfigMaps**: MongoDB hosts/ports

### Resource Allocation
- **Microservices**: 100m CPU, 256Mi RAM per replica
- **MongoDB**: 100m CPU, 256Mi RAM per instance
- **Kafka**: 500m CPU, 1Gi RAM
- **MinIO**: 200m CPU, 512Mi RAM

## Monitoring & Logging

### Current State
- Console logging in each service
- Kafka consumer group monitoring
- Health check endpoints

### Future Enhancements
- Prometheus metrics
- Grafana dashboards
- ELK stack for centralized logging
- Distributed tracing (OpenTelemetry)

## Known Limitations

1. **Storage**: MongoDB and MinIO use emptyDir (non-persistent) - data lost on pod restart
2. **Secrets**: Simple JWT key ("asdf") for development only
3. **Kafka**: Single replica (not fault-tolerant)
4. **No API Gateway**: Direct service routing via Ingress (consider Kong/Ambassador)
5. **No Service Mesh**: Basic networking (consider Istio for advanced routing/security)

## Roadmap

### Phase 1 (Current)
- ✅ Core microservices architecture
- ✅ Event-driven communication
- ✅ Real-time notifications
- ✅ Stripe payment integration
- ✅ Kubernetes deployment

### Phase 2 (Planned)
- [ ] Persistent storage (PVCs)
- [ ] API Gateway (Kong/Ambassador)
- [ ] Rate limiting
- [ ] Comprehensive monitoring (Prometheus/Grafana)
- [ ] CI/CD pipeline (GitHub Actions)

### Phase 3 (Future)
- [ ] Service mesh (Istio)
- [ ] Multi-region deployment
- [ ] Advanced analytics
- [ ] Recommendation engine
- [ ] Mobile app (React Native)

## Success Metrics

- **Performance**: API response time < 500ms (p95)
- **Reliability**: 99.9% uptime
- **Scalability**: Support 1000 concurrent users
- **Security**: Zero critical vulnerabilities
- **Developer Experience**: < 5 minutes local setup time
