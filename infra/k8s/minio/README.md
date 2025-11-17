# Image Upload with MinIO

This application uses **MinIO** - a self-hosted S3-compatible object storage for product images.

## Features

- ✅ Upload ảnh từ file (không cần nhập URL)
- ✅ MinIO chạy trong Kubernetes cluster (không cần service bên ngoài)
- ✅ Tự động tạo bucket khi khởi động
- ✅ Public URL cho mỗi ảnh được upload
- ✅ Fallback về ảnh placeholder nếu không có ảnh

## MinIO Setup

MinIO đã được cấu hình sẵn và sẽ tự động deploy khi chạy `skaffold dev`.

### Credentials mặc định:
- **Username**: minioadmin
- **Password**: minioadmin123

### Ports:
- **API**: 9000 (S3-compatible API)
- **Console**: 9001 (Web UI)

## Accessing MinIO

### Qua Kubernetes port-forward:

```bash
# Access MinIO Console (Web UI)
kubectl port-forward svc/minio-svc 9001:9001

# Mở browser: http://localhost:9001
# Login với minioadmin / minioadmin123
```

### Qua Ingress:

MinIO API được expose qua: `https://ticketing.local/minio`

## Cách hoạt động

1. User chọn file ảnh trong form "Create Product"
2. Frontend gửi `multipart/form-data` với file
3. Backend (products service):
   - Nhận file qua Multer middleware
   - Upload file lên MinIO bucket `product-images`
   - Tạo unique filename với UUID
   - Trả về public URL
4. URL được lưu trong MongoDB
5. Frontend hiển thị ảnh từ MinIO URL

## Files quan trọng

- `infra/k8s/minio/minio-depl.yaml` - MinIO deployment
- `infra/k8s/minio/minio-secret.yaml` - Credentials (gitignored)
- `products/src/config/cloudinary.ts` - MinIO client config
- `products/src/middlewares/upload.ts` - Multer file upload middleware
- `client/pages/products/new.js` - Upload form

## Giới hạn

- Max file size: **5MB**
- Chỉ chấp nhận: **image/*** (jpg, png, gif, webp, etc.)
- Storage: EmptyDir (sẽ mất khi pod restart - production nên dùng PersistentVolume)

## Production Considerations

Để production, nên:
1. Sử dụng PersistentVolumeClaim thay vì emptyDir
2. Setup backup cho MinIO data
3. Hoặc dùng managed S3 (AWS S3, DigitalOcean Spaces, Cloudflare R2)
