# Domain Configuration

Dự án đã được cấu hình với 2 domains:

## 🛒 Main Application
- **URL**: https://ecommerce.local
- **Description**: E-commerce application chính (shop, cart, checkout, payment)

## 🗄️ MinIO Console
- **URL**: https://minio.local
- **Description**: MinIO Web Console để quản lý object storage
- **Credentials**:
  - Username: `minioadmin`
  - Password: `minioadmin123`

## Setup

### 1. Hosts File
Đã được thêm vào `/etc/hosts`:
```
127.0.0.1 ecommerce.local minio.local
```

### 2. TLS Certificates
Certificates được tạo bằng `mkcert`:
- `ecommerce.local.pem` + `ecommerce.local-key.pem`
- `minio.local.pem` + `minio.local-key.pem`

### 3. Kubernetes Secrets
```bash
kubectl create secret tls ecommerce-local-tls --cert=ecommerce.local.pem --key=ecommerce.local-key.pem
kubectl create secret tls minio-local-tls --cert=minio.local.pem --key=minio.local-key.pem
```

## Access

1. **Shopping**: https://ecommerce.local
   - Sign up / Sign in
   - Browse products
   - Add to cart
   - Checkout & pay

2. **MinIO Console**: https://minio.local
   - View uploaded product images
   - Browse buckets (product-images)
   - Manage objects

## Architecture

```
Browser
  ├─ https://ecommerce.local → Nginx Ingress → Client Service
  │                             ├─ /api/users → Auth Service
  │                             ├─ /api/products → Products Service
  │                             ├─ /api/cart → Cart Service
  │                             ├─ /api/orders → Orders Service
  │                             └─ /api/payments → Payments Service
  │
  └─ https://minio.local → Nginx Ingress → MinIO Service (Console)
```

## Notes

- Tất cả cookies được set với `Secure` flag (chỉ work qua HTTPS)
- MinIO storage sử dụng `emptyDir` (data sẽ mất khi pod restart)
- Product images được serve từ MinIO với public read access
