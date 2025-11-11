# TLS Certificates cho Môi Trường Development

Thư mục này chứa các chứng chỉ TLS (HTTPS) để test local với Minikube và Ingress-NGINX.

## 📁 Cấu trúc file

```
tls-certs/
├── README.md                    # File này
├── ticketing.local.pem          # Certificate (public key)
└── ticketing.local-key.pem      # Private key
```

⚠️ **LƯU Ý:** Thư mục này đã được thêm vào `.gitignore` - không commit các file `.pem` lên git!

---

## 🔧 Cách tạo TLS Certificate cho Local Development

### Bước 1: Cài đặt mkcert

```bash
# macOS
brew install mkcert

# Linux
sudo apt install libnss3-tools
brew install mkcert
# hoặc download binary từ: https://github.com/FiloSottile/mkcert/releases

# Windows
choco install mkcert
```

### Bước 2: Cài đặt local CA (Certificate Authority)

```bash
mkcert -install
```

Lệnh này sẽ:
- Tạo một local CA và cài vào system trust store
- Trình duyệt sẽ tin tưởng các cert do CA này ký
- Không còn cảnh báo "Not Secure" khi truy cập HTTPS local

### Bước 3: Tạo certificate cho domain

```bash
cd /Users/datnx/Downloads/DatNX/Learning/Microservice-NodeJS-React/ticketing/tls-certs

# Tạo cert cho ticketing.local
mkcert ticketing.local

# Kết quả tạo ra 2 file:
# ✅ ticketing.local.pem (certificate)
# ✅ ticketing.local-key.pem (private key)
```

### Bước 4: Tạo Kubernetes TLS Secret

```bash
# Từ thư mục tls-certs
cd /Users/datnx/Downloads/DatNX/Learning/Microservice-NodeJS-React/ticketing/tls-certs

kubectl create secret tls ticketing-local-tls \
  --cert=ticketing.local.pem \
  --key=ticketing.local-key.pem

# Kiểm tra secret đã tạo
kubectl get secret ticketing-local-tls
kubectl describe secret ticketing-local-tls
```

### Bước 5: Cấu hình /etc/hosts

```bash
# Lấy IP của Minikube
minikube ip
# Ví dụ output: 192.168.49.2

# Thêm vào /etc/hosts (thay IP bằng IP thực tế)
echo "192.168.49.2 ticketing.local" | sudo tee -a /etc/hosts

# Hoặc edit thủ công
sudo nano /etc/hosts
# Thêm dòng: 192.168.49.2 ticketing.local
```

### Bước 6: Áp dụng Ingress với TLS

File `infra/k8s/ingress.yaml` đã được cấu hình:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ingress-service
  annotations:
    kubernetes.io/ingress.class: "nginx"
spec:
  tls:
    - hosts:
        - ticketing.local
      secretName: ticketing-local-tls
  ingressClassName: nginx
  rules:
  - host: ticketing.local
    http:
      paths:
      - path: /api/users
        pathType: Prefix
        backend:
          service:
            name: auth-svc
            port:
              number: 3000
```

Apply Ingress:

```bash
cd /Users/datnx/Downloads/DatNX/Learning/Microservice-NodeJS-React/ticketing
kubectl apply -f infra/k8s/ingress.yaml
```

### Bước 7: Kiểm tra HTTPS hoạt động

```bash
# Test bằng curl
curl -I https://ticketing.local/api/users/currentuser

# Hoặc mở trình duyệt
open https://ticketing.local
```

Kiểm tra trong DevTools:
1. Mở https://ticketing.local
2. DevTools > Security > View certificate
3. DevTools > Application > Cookies (kiểm tra Secure cookie)

---

## 🔄 Tái tạo certificate (khi hết hạn hoặc thay đổi domain)

```bash
cd /Users/datnx/Downloads/DatNX/Learning/Microservice-NodeJS-React/ticketing/tls-certs

# Xóa cert cũ
rm ticketing.local.pem ticketing.local-key.pem

# Tạo cert mới
mkcert ticketing.local

# Xóa secret cũ trong Kubernetes
kubectl delete secret ticketing-local-tls

# Tạo secret mới
kubectl create secret tls ticketing-local-tls \
  --cert=ticketing.local.pem \
  --key=ticketing.local-key.pem

# Restart pods để reload (nếu cần)
kubectl rollout restart deployment auth-depl
```

---

## 🌐 Tạo certificate cho nhiều domain/subdomain

```bash
# Wildcard certificate
mkcert "*.ticketing.local" ticketing.local

# Nhiều domain cụ thể
mkcert ticketing.local api.ticketing.local admin.ticketing.local

# Kết quả: _wildcard.ticketing.local.pem và _wildcard.ticketing.local-key.pem
```

---

## 🐛 Troubleshooting

### Lỗi: "certificate is not trusted"

```bash
# Cài lại local CA
mkcert -install

# macOS: restart trình duyệt sau khi install
```

### Lỗi: "secret not found"

```bash
# Kiểm tra secret có đúng namespace không
kubectl get secret ticketing-local-tls -n default

# Nếu Ingress ở namespace khác, tạo secret ở namespace đó
kubectl create secret tls ticketing-local-tls \
  --cert=ticketing.local.pem \
  --key=ticketing.local-key.pem \
  -n <namespace>
```

### Lỗi: 404 default backend

```bash
# Kiểm tra Ingress
kubectl get ingress
kubectl describe ingress ingress-service

# Kiểm tra Host header (phải truy cập đúng domain)
curl -H "Host: ticketing.local" http://$(minikube ip)/api/users/currentuser
```

### Cookie không được set (secure: true)

- ✅ Đảm bảo truy cập qua **https://** (không phải http://)
- ✅ Kiểm tra `app.set('trust proxy', true)` trong Express
- ✅ Kiểm tra `secure: true` trong cookie-session config

---

## 📚 Tài liệu tham khảo

- [mkcert GitHub](https://github.com/FiloSottile/mkcert)
- [Kubernetes TLS Secrets](https://kubernetes.io/docs/concepts/configuration/secret/#tls-secrets)
- [Ingress-NGINX TLS/HTTPS](https://kubernetes.github.io/ingress-nginx/user-guide/tls/)

---

## 🔒 Bảo mật

- ⚠️ **KHÔNG** commit file `.pem` lên Git
- ⚠️ **KHÔNG** dùng cert này cho production
- ✅ Cert này CHỈ dùng cho local development
- ✅ Mỗi developer nên tự gen cert riêng trên máy mình
- ✅ Production dùng cert-manager hoặc AWS Certificate Manager

---

## ✅ Checklist sau khi setup

- [ ] Đã cài mkcert: `mkcert -version`
- [ ] Đã install local CA: `mkcert -install`
- [ ] Đã gen cert: `ls -la *.pem`
- [ ] Đã tạo K8s secret: `kubectl get secret ticketing-local-tls`
- [ ] Đã cấu hình /etc/hosts: `cat /etc/hosts | grep ticketing`
- [ ] Đã apply Ingress với TLS: `kubectl get ingress`
- [ ] HTTPS hoạt động: `curl -I https://ticketing.local`
- [ ] Cookie secure được set: kiểm tra trong DevTools

---

**Tạo bởi:** DatNX  
**Ngày:** 28/10/2025  
**Mục đích:** Local HTTPS development cho microservice ticketing
