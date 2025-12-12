# Structured Logging Guide

## Overview

Tất cả services đã được tích hợp structured logging theo best practice, giúp:
- **Dễ parse**: JSON format, dễ dàng index vào ELK, Datadog, CloudWatch
- **Consistent**: Format thống nhất across tất cả services
- **Traceable**: Include context như service name, event type, duration, etc.

## Log Format

```json
{
  "timestamp": "2025-12-01T08:01:46.638Z",
  "level": "INFO",
  "application": "ecommerce",
  "service": "products-service",
  "message": "Kafka event received",
  "event_type": "kafka.consumed",
  "topic": "payment:created",
  "event_name": "payment:created",
  "partition": 0,
  "offset": "123",
  "consumer_group": "products-service"
}
```

## Usage

### 1. Import Logger

```typescript
import { Logger, createLogger } from '@datnxecommerce/common'
```

### 2. Create Logger Instance

```typescript
const logger = createLogger('ecommerce', 'products-service')
```

### 3. Basic Logging

```typescript
// Info
logger.info('User created successfully', {
  user_id: user.id,
  email: user.email
})

// Warning
logger.warn('Product stock low', {
  product_id: product.id,
  quantity: product.quantity
})

// Error
logger.error('Failed to process payment', error, {
  order_id: orderId,
  user_id: userId
})

// Debug
logger.debug('Cache hit', {
  key: cacheKey,
  ttl: 3600
})
```

### 4. Kafka Event Logging

Kafka events được tự động log bởi `BaseConsumer` và `BaseProducer`:

```typescript
// Consumer - automatic logging
export class PaymentCreatedConsumer extends Consumer<PaymentCreatedEvent> {
  constructor(consumer: any) {
    super(consumer, { serviceName: 'products-service' })
  }

  async onMessage(data: PaymentCreatedEvent['data']) {
    // Log thêm custom context
    this.logger.info('Processing payment', {
      order_id: data.orderId,
      amount: data.amount
    })
  }
}

// Producer - automatic logging
export class ProductCreatedProducer extends Producer<ProductCreatedEvent> {
  constructor(producer: any) {
    super(producer, 'products-service')
  }
}
```

## Log Levels

- **DEBUG**: Development debugging info (filtered out in production)
- **INFO**: Normal operational messages
- **WARN**: Warning messages, không ảnh hưởng service
- **ERROR**: Error messages, cần investigation

## Kafka Event Types

### Consumed Event
```json
{
  "event_type": "kafka.consumed",
  "topic": "product:created",
  "partition": 0,
  "offset": "123",
  "consumer_group": "cart-service"
}
```

### Published Event
```json
{
  "event_type": "kafka.published",
  "topic": "product:created",
  "partition": 1,
  "offset": "456",
  "duration_ms": 23
}
```

### Processing Event
```json
{
  "event_type": "kafka.processing",
  "topic": "order:created",
  "event_name": "order:created"
}
```

### Processed Successfully
```json
{
  "event_type": "kafka.processed",
  "topic": "order:created",
  "duration_ms": 145,
  "partition": 0,
  "offset": "789"
}
```

### Processing Failed
```json
{
  "level": "ERROR",
  "event_type": "kafka.failed",
  "topic": "payment:created",
  "error": {
    "name": "ValidationError",
    "message": "Invalid payment amount",
    "stack": "..."
  },
  "duration_ms": 45
}
```

## Best Practices

### 1. Use Structured Context
```typescript
// ❌ Bad
logger.info(`User ${userId} created order ${orderId}`)

// ✅ Good
logger.info('User created order', {
  user_id: userId,
  order_id: orderId
})
```

### 2. Include Duration for Operations
```typescript
const startTime = Date.now()
// ... do work
const duration = Date.now() - startTime

logger.info('Database query completed', {
  query: 'findProducts',
  duration_ms: duration,
  rows_returned: products.length
})
```

### 3. Log Important Business Events
```typescript
logger.info('Order completed', {
  order_id: order.id,
  user_id: order.userId,
  total_amount: order.total,
  items_count: order.items.length,
  payment_method: 'stripe'
})
```

### 4. Error Logging with Context
```typescript
try {
  await processPayment(order)
} catch (error) {
  logger.error('Payment processing failed', error, {
    order_id: order.id,
    amount: order.total,
    payment_provider: 'stripe'
  })
  throw error
}
```

## Filter Logs

### In Development
Tất cả logs được output ra console

### In Production
Sử dụng log aggregation service như:
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Datadog**
- **CloudWatch Logs**
- **Splunk**

Query example với Elasticsearch:
```json
{
  "query": {
    "bool": {
      "must": [
        { "match": { "service": "products-service" } },
        { "match": { "event_type": "kafka.failed" } },
        { "range": { "timestamp": { "gte": "now-1h" } } }
      ]
    }
  }
}
```

## Migration Guide

Update existing consumers/producers:

```typescript
// Old
export class MyConsumer extends Consumer<MyEvent> {
  async onMessage(data: MyEvent['data']) {
    console.log('Processing event:', data)
  }
}

// New
export class MyConsumer extends Consumer<MyEvent> {
  constructor(consumer: any) {
    super(consumer, { serviceName: 'my-service' })
  }

  async onMessage(data: MyEvent['data']) {
    this.logger.info('Processing event', {
      event_id: data.id,
      custom_field: data.customField
    })
  }
}

// Old
new MyProducer(kafkaWrapper.producer)

// New
new MyProducer(kafkaWrapper.producer, 'my-service')
```
