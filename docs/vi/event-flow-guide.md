# 📨 Hướng Dẫn Luồng Event Chi Tiết

Tài liệu này mô tả chi tiết luồng events giữa các services trong hệ thống.

---

## 1. Event Types & Payloads

### 1.1 ProductCreatedEvent

**Khi nào publish:** Admin/seller tạo product mới

```typescript
interface ProductCreatedEvent {
  subject: 'product.created'
  data: {
    id: string
    title: string
    price: number
    quantity: number
    category: string
    imageUrl?: string
    userId: string
    version: number
  }
}
```

**Consumers:**
| Consumer Group | Service | Action |
|----------------|---------|--------|
| `cart-product-created` | Cart | Tạo bản copy product trong Cart DB |
| `orders-product-created` | Orders | Tạo bản copy product trong Orders DB |

### 1.2 ProductUpdatedEvent

**Khi nào publish:**
- Admin/seller update product info
- Sau payment, quantity giảm

```typescript
interface ProductUpdatedEvent {
  subject: 'product.updated'
  data: {
    id: string
    title: string
    price: number
    quantity: number
    category: string
    imageUrl?: string
    userId: string
    version: number
  }
}
```

**Consumers:**
| Consumer Group | Service | Action |
|----------------|---------|--------|
| `cart-product-updated` | Cart | Update local product copy |
| `orders-product-updated` | Orders | Update local product copy |

### 1.3 OrderCreatedEvent

**Khi nào publish:** User checkout cart thành công

```typescript
interface OrderCreatedEvent {
  subject: 'order.created'
  data: {
    id: string
    userId: string
    status: OrderStatus
    items: Array<{
      productId: string
      title: string
      price: number
      quantity: number
    }>
    total: number
    version: number
  }
}
```

**Consumers:**
| Consumer Group | Service | Action |
|----------------|---------|--------|
| `payments-order-created` | Payments | Tạo bản copy order để validate payment |

### 1.4 OrderCancelledEvent

**Khi nào publish:** User hủy order (trước khi pay)

```typescript
interface OrderCancelledEvent {
  subject: 'order.cancelled'
  data: {
    id: string
    version: number
  }
}
```

**Consumers:**
| Consumer Group | Service | Action |
|----------------|---------|--------|
| `payments-order-cancelled` | Payments | Đánh dấu order cancelled trong local DB |

### 1.5 PaymentCreatedEvent

**Khi nào publish:** Thanh toán Stripe thành công

```typescript
interface PaymentCreatedEvent {
  subject: 'payment.created'
  data: {
    id: string
    orderId: string
    stripeId: string
    items: Array<{
      productId: string
      title: string
      price: number
      quantity: number
    }>
  }
}
```

**Consumers:**
| Consumer Group | Service | Action |
|----------------|---------|--------|
| `orders-service` | Orders | Đánh dấu order = Complete |
| `products-service` | Products | Giảm inventory, publish product.updated |
| `cart-payment-created` | Cart | Xóa items đã mua khỏi cart |

---

## 2. Sequence Diagrams

### 2.1 Tạo Product Mới

```
Admin/Seller          Products Svc         Kafka           Cart Svc         Orders Svc
    │                      │                 │                │                 │
    │ POST /api/products   │                 │                │                 │
    │─────────────────────►│                 │                │                 │
    │                      │                 │                │                 │
    │                      │ Save to DB      │                │                 │
    │                      │─────────┐       │                │                 │
    │                      │         │       │                │                 │
    │                      │◄────────┘       │                │                 │
    │                      │                 │                │                 │
    │                      │ Publish         │                │                 │
    │                      │ product.created │                │                 │
    │                      │────────────────►│                │                 │
    │                      │                 │                │                 │
    │◄─────────────────────│                 │                │                 │
    │     201 Created      │                 │ cart-product   │                 │
    │                      │                 │ -created       │                 │
    │                      │                 │───────────────►│                 │
    │                      │                 │                │ Create local    │
    │                      │                 │                │ product copy    │
    │                      │                 │                │                 │
    │                      │                 │ orders-product │                 │
    │                      │                 │ -created       │                 │
    │                      │                 │───────────────────────────────►│
    │                      │                 │                │                 │
    │                      │                 │                │  Create local   │
    │                      │                 │                │  product copy   │
```

### 2.2 Checkout Flow

```
User          Cart Svc        Orders Svc       Kafka        Payments Svc
 │                │                │              │               │
 │ POST checkout  │                │              │               │
 │───────────────►│                │              │               │
 │                │                │              │               │
 │                │ POST /orders   │              │               │
 │                │───────────────►│              │               │
 │                │                │              │               │
 │                │                │ Create order │               │
 │                │                │──────┐       │               │
 │                │                │      │       │               │
 │                │                │◄─────┘       │               │
 │                │                │              │               │
 │                │                │ Publish      │               │
 │                │                │ order.created│               │
 │                │                │─────────────►│               │
 │                │                │              │               │
 │                │◄───────────────│              │               │
 │                │   order data   │              │payments-order │
 │                │                │              │ -created      │
 │◄───────────────│                │              │──────────────►│
 │  201 + order   │                │              │               │
 │                │                │              │  Replicate    │
 │                │                │              │  order        │
```

### 2.3 Payment Flow

```
User       Payments Svc      Stripe         Kafka        Orders    Products    Cart
 │              │              │               │            │          │         │
 │ POST /pay    │              │               │            │          │         │
 │─────────────►│              │               │            │          │         │
 │              │              │               │            │          │         │
 │              │ Validate     │               │            │          │         │
 │              │ order        │               │            │          │         │
 │              │──────┐       │               │            │          │         │
 │              │      │       │               │            │          │         │
 │              │◄─────┘       │               │            │          │         │
 │              │              │               │            │          │         │
 │              │ Charge       │               │            │          │         │
 │              │─────────────►│               │            │          │         │
 │              │              │               │            │          │         │
 │              │◄─────────────│               │            │          │         │
 │              │   charge.id  │               │            │          │         │
 │              │              │               │            │          │         │
 │              │ Save payment │               │            │          │         │
 │              │──────┐       │               │            │          │         │
 │              │      │       │               │            │          │         │
 │              │◄─────┘       │               │            │          │         │
 │              │              │               │            │          │         │
 │              │ Publish payment.created      │            │          │         │
 │              │─────────────────────────────►│            │          │         │
 │              │              │               │            │          │         │
 │◄─────────────│              │               │orders-svc  │          │         │
 │  201 payment │              │               │───────────►│          │         │
 │              │              │               │            │ Complete │         │
 │              │              │               │            │          │         │
 │              │              │               │products-svc│          │         │
 │              │              │               │───────────────────────►         │
 │              │              │               │            │ Giảm qty │         │
 │              │              │               │            │          │         │
 │              │              │               │            │ Publish  │         │
 │              │              │               │◄───────────│product   │         │
 │              │              │               │            │.updated  │         │
 │              │              │               │            │          │         │
 │              │              │               │cart-payment│          │         │
 │              │              │               │-created    │          │         │
 │              │              │               │────────────────────────────────►│
 │              │              │               │            │          │ Clear   │
 │              │              │               │            │          │ items   │
```

---

## 3. Error Handling & Retry

### 3.1 Consumer Error Handling

```typescript
// Nếu consumer throw error, offset không commit
// Message sẽ được re-deliver khi consumer restart

async onMessage(data: ProductUpdatedEvent['data'], payload: EachMessagePayload) {
  try {
    const product = await Product.findOne({
      _id: data.id,
      version: data.version - 1
    })

    if (!product) {
      // Không throw - message đã xử lý hoặc out of order
      // Log và skip
      console.log(`Product ${data.id} not found or version mismatch`)
      return
    }

    product.set({ ...data })
    await product.save()

    // Success - offset auto-committed
  } catch (error) {
    // Throw error - offset không commit, message sẽ retry
    console.error('Failed to process message:', error)
    throw error
  }
}
```

### 3.2 Producer Retry

```typescript
// KafkaJS có built-in retry mechanism

const kafka = new Kafka({
  clientId: 'products-service',
  brokers: ['kafka-svc:9092'],
  retry: {
    initialRetryTime: 100,     // 100ms
    retries: 8,                // Max 8 retries
    maxRetryTime: 30000,       // Max 30s between retries
    factor: 2                  // Exponential backoff
  }
})
```

---

## 4. Ordering & Partitioning

### 4.1 Message Keys

```typescript
// Sử dụng entity ID làm message key
// Messages cùng key → cùng partition → đảm bảo ordering

// Product events
await producer.send({
  topic: 'product.updated',
  messages: [{
    key: product.id,        // Product ID làm key
    value: JSON.stringify(data)
  }]
})

// Order events
await producer.send({
  topic: 'order.created',
  messages: [{
    key: order.id,          // Order ID làm key
    value: JSON.stringify(data)
  }]
})
```

### 4.2 Tại Sao Ordering Quan Trọng?

```
Scenario: Product updated 2 lần liên tiếp

Without ordering:
  Message 1: { version: 1, price: 100 }  → Partition 1
  Message 2: { version: 2, price: 150 }  → Partition 2

  Consumer có thể nhận Message 2 trước Message 1
  → Kết quả: price = 100 (sai!)

With ordering (same key → same partition):
  Message 1: { version: 1, price: 100 }  → Partition 1
  Message 2: { version: 2, price: 150 }  → Partition 1

  Messages được xử lý theo thứ tự
  → Kết quả: price = 150 (đúng!)
```

---

## 5. Consumer Group Strategy

### 5.1 Naming Convention

```
Format: <service>-<topic-name>

Ví dụ:
- cart-product-created      → Cart service lắng nghe product.created
- cart-product-updated      → Cart service lắng nghe product.updated
- payments-order-created    → Payments service lắng nghe order.created
- orders-service            → Orders service lắng nghe payment.created
```

### 5.2 Scaling với Consumer Groups

```
┌─────────────────────────────────────────────────────────────┐
│                     Kafka Cluster                            │
│                                                             │
│    Topic: product.updated                                   │
│    ┌──────────────┬──────────────┬──────────────┐          │
│    │ Partition 0  │ Partition 1  │ Partition 2  │          │
│    └──────┬───────┴──────┬───────┴──────┬───────┘          │
│           │              │              │                   │
└───────────┼──────────────┼──────────────┼───────────────────┘
            │              │              │
            ▼              ▼              ▼
┌───────────────────────────────────────────────────────────┐
│            Consumer Group: cart-product-updated            │
│                                                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │ Cart Pod 1  │  │ Cart Pod 2  │  │ Cart Pod 3  │       │
│  │ Partition 0 │  │ Partition 1 │  │ Partition 2 │       │
│  └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                           │
│  Mỗi partition chỉ được xử lý bởi 1 consumer trong group  │
└───────────────────────────────────────────────────────────┘
```

---

## 6. Debugging Events

### 6.1 Log Consumer Events

```typescript
class ProductCreatedConsumer extends Consumer<ProductCreatedEvent> {
  async onMessage(data: ProductCreatedEvent['data'], payload: EachMessagePayload) {
    console.log({
      event: 'ProductCreated',
      topic: payload.topic,
      partition: payload.partition,
      offset: payload.message.offset,
      data: data
    })

    // Process...
  }
}
```

### 6.2 Check Kafka Topics

```bash
# List topics
kubectl exec -it <kafka-pod> -- kafka-topics.sh --list --bootstrap-server localhost:9092

# Describe topic
kubectl exec -it <kafka-pod> -- kafka-topics.sh \
  --describe \
  --topic product.created \
  --bootstrap-server localhost:9092

# Consume messages từ beginning (debug)
kubectl exec -it <kafka-pod> -- kafka-console-consumer.sh \
  --topic product.created \
  --from-beginning \
  --bootstrap-server localhost:9092
```

### 6.3 Check Consumer Group Lag

```bash
# Check consumer group offset lag
kubectl exec -it <kafka-pod> -- kafka-consumer-groups.sh \
  --describe \
  --group cart-product-created \
  --bootstrap-server localhost:9092

# Output:
# GROUP                TOPIC            PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG
# cart-product-created product.created  0          150             152             2
# cart-product-created product.created  1          148             148             0
# cart-product-created product.created  2          145             147             2
```

---

## Tổng Kết

### Key Takeaways:

1. **Event Types**: 5 event types chính điều phối toàn bộ business logic
2. **Consumer Groups**: Mỗi service có consumer group riêng cho mỗi topic
3. **Message Keys**: Entity ID làm key đảm bảo ordering
4. **Idempotency**: Version check tránh xử lý duplicate/out-of-order
5. **Error Handling**: Offset chỉ commit khi xử lý thành công

### Best Practices:

- Luôn include version trong event payload
- Sử dụng entity ID làm message key
- Log đầy đủ thông tin để debug
- Handle errors gracefully, chỉ throw khi cần retry
- Monitor consumer lag để phát hiện bottlenecks
