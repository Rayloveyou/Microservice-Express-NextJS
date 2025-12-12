# 🧪 Hướng Dẫn Unit Testing

Tài liệu này mô tả cách viết và chạy unit tests cho các services.

---

## 1. Test Setup

### 1.1 Dependencies

```json
// package.json
{
  "devDependencies": {
    "@types/jest": "^29.5.12",
    "@types/supertest": "^6.0.2",
    "jest": "^29.7.0",
    "mongodb-memory-server": "^10.0.0",
    "supertest": "^7.0.0",
    "ts-jest": "^29.2.4"
  }
}
```

### 1.2 Jest Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./src/test/setup.ts'],
  testMatch: ['**/__test__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js'],
  clearMocks: true
}
```

### 1.3 Test Setup File

```typescript
// src/test/setup.ts

import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'

// Mock Kafka
jest.mock('../kafka-wrapper')

let mongo: MongoMemoryServer

// Chạy trước tất cả tests
beforeAll(async () => {
  // Set env variables cho tests
  process.env.JWT_KEY = 'test_jwt_key'
  process.env.NODE_ENV = 'test'

  // Tạo in-memory MongoDB
  mongo = await MongoMemoryServer.create()
  const mongoUri = mongo.getUri()

  await mongoose.connect(mongoUri)
})

// Chạy trước mỗi test
beforeEach(async () => {
  // Clear all mocks
  jest.clearAllMocks()

  // Clear all collections
  const collections = await mongoose.connection.db.collections()
  for (let collection of collections) {
    await collection.deleteMany({})
  }
})

// Chạy sau tất cả tests
afterAll(async () => {
  if (mongo) {
    await mongo.stop()
  }
  await mongoose.connection.close()
})

// Helper function: Tạo authenticated request
declare global {
  var signin: (userId?: string, role?: string) => string[]
}

global.signin = (userId?: string, role: string = 'user') => {
  // Build JWT payload
  const payload = {
    id: userId || new mongoose.Types.ObjectId().toHexString(),
    email: 'test@test.com',
    role: role
  }

  // Create JWT
  const token = jwt.sign(payload, process.env.JWT_KEY!)

  // Build session object
  const session = { jwt: token }

  // Encode as base64
  const sessionJSON = JSON.stringify(session)
  const base64 = Buffer.from(sessionJSON).toString('base64')

  // Return cookie string
  return [`session=${base64}`]
}
```

---

## 2. Kafka Mock

### 2.1 Mock File

```typescript
// src/__mocks__/kafka-wrapper.ts

export const kafkaWrapper = {
  // Mock producer
  producer: {
    send: jest.fn().mockResolvedValue(undefined),
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined)
  },

  // Mock consumer factory
  createConsumer: jest.fn().mockReturnValue({
    subscribe: jest.fn().mockResolvedValue(undefined),
    run: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    connect: jest.fn().mockResolvedValue(undefined)
  }),

  // Mock connection methods
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined)
}
```

### 2.2 Verify Event Published

```typescript
// Trong test file
import { kafkaWrapper } from '../../kafka-wrapper'

it('publishes product.created event', async () => {
  await request(app)
    .post('/api/products')
    .set('Cookie', global.signin())
    .send({ title: 'Test', price: 99, quantity: 10 })
    .expect(201)

  // Verify producer.send được gọi
  expect(kafkaWrapper.producer.send).toHaveBeenCalled()

  // Verify topic đúng
  const sendCall = (kafkaWrapper.producer.send as jest.Mock).mock.calls[0][0]
  expect(sendCall.topic).toEqual('product.created')
})
```

---

## 3. Route Testing Patterns

### 3.1 Basic Route Test Structure

```typescript
// src/routes/__test__/new.test.ts

import request from 'supertest'
import { app } from '../../app'
import { Product } from '../../models/product'

describe('POST /api/products', () => {
  // Test authentication
  it('returns 401 if user is not authenticated', async () => {
    await request(app)
      .post('/api/products')
      .send({})
      .expect(401)
  })

  // Test validation
  it('returns 400 if title is empty', async () => {
    await request(app)
      .post('/api/products')
      .set('Cookie', global.signin())
      .send({ title: '', price: 10, quantity: 5 })
      .expect(400)
  })

  it('returns 400 if price is negative', async () => {
    await request(app)
      .post('/api/products')
      .set('Cookie', global.signin())
      .send({ title: 'Test', price: -10, quantity: 5 })
      .expect(400)
  })

  // Test success case
  it('creates product with valid inputs', async () => {
    let products = await Product.find({})
    expect(products.length).toEqual(0)

    const response = await request(app)
      .post('/api/products')
      .set('Cookie', global.signin())
      .send({ title: 'Test Product', price: 99, quantity: 10 })
      .expect(201)

    products = await Product.find({})
    expect(products.length).toEqual(1)
    expect(products[0].title).toEqual('Test Product')
    expect(response.body.title).toEqual('Test Product')
  })
})
```

### 3.2 Test Authorization

```typescript
// Test chỉ owner mới update được

describe('PUT /api/products/:id', () => {
  it('returns 401 if user is not authenticated', async () => {
    const id = new mongoose.Types.ObjectId().toHexString()
    await request(app)
      .put(`/api/products/${id}`)
      .send({ title: 'Updated' })
      .expect(401)
  })

  it('returns 404 if product not found', async () => {
    const id = new mongoose.Types.ObjectId().toHexString()
    await request(app)
      .put(`/api/products/${id}`)
      .set('Cookie', global.signin())
      .send({ title: 'Updated', price: 50 })
      .expect(404)
  })

  it('returns 401 if user does not own the product', async () => {
    // User 1 creates product
    const response = await request(app)
      .post('/api/products')
      .set('Cookie', global.signin())
      .send({ title: 'Test', price: 99, quantity: 10 })
      .expect(201)

    // User 2 tries to update
    await request(app)
      .put(`/api/products/${response.body.id}`)
      .set('Cookie', global.signin())  // Different user
      .send({ title: 'Hacked', price: 1 })
      .expect(401)
  })

  it('updates product if user is owner', async () => {
    const cookie = global.signin()

    // Create product
    const createResponse = await request(app)
      .post('/api/products')
      .set('Cookie', cookie)
      .send({ title: 'Original', price: 99, quantity: 10 })
      .expect(201)

    // Update with same user
    await request(app)
      .put(`/api/products/${createResponse.body.id}`)
      .set('Cookie', cookie)
      .send({ title: 'Updated', price: 150 })
      .expect(200)

    // Verify update
    const product = await Product.findById(createResponse.body.id)
    expect(product!.title).toEqual('Updated')
    expect(product!.price).toEqual(150)
  })
})
```

### 3.3 Test Admin Routes

```typescript
describe('GET /api/admin/users', () => {
  it('returns 401 if not authenticated', async () => {
    await request(app)
      .get('/api/admin/users')
      .expect(401)
  })

  it('returns 403 if user is not admin', async () => {
    await request(app)
      .get('/api/admin/users')
      .set('Cookie', global.signin())  // role = 'user'
      .expect(403)
  })

  it('returns users list for admin', async () => {
    const response = await request(app)
      .get('/api/admin/users')
      .set('Cookie', global.signin(undefined, 'admin'))  // role = 'admin'
      .expect(200)

    expect(Array.isArray(response.body)).toBe(true)
  })
})
```

---

## 4. Consumer Testing

### 4.1 Test Consumer Logic

```typescript
// src/events/consumers/__test__/product-created-consumer.test.ts

import mongoose from 'mongoose'
import { ProductCreatedConsumer } from '../product-created-consumer'
import { Product } from '../../../models/product'
import { EachMessagePayload } from 'kafkajs'

describe('ProductCreatedConsumer', () => {
  it('creates a product', async () => {
    // Setup
    const consumer = new ProductCreatedConsumer({} as any)

    const data = {
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'Test Product',
      price: 99,
      quantity: 10,
      category: 'electronics',
      userId: new mongoose.Types.ObjectId().toHexString(),
      version: 0
    }

    // Mock payload
    const payload = {
      topic: 'product.created',
      partition: 0,
      message: {
        value: Buffer.from(JSON.stringify(data)),
        offset: '0'
      }
    } as EachMessagePayload

    // Execute
    await consumer.onMessage(data, payload)

    // Verify
    const product = await Product.findById(data.id)
    expect(product).not.toBeNull()
    expect(product!.title).toEqual('Test Product')
    expect(product!.price).toEqual(99)
  })

  it('handles duplicate events (idempotent)', async () => {
    const consumer = new ProductCreatedConsumer({} as any)

    const data = {
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'Test Product',
      price: 99,
      quantity: 10,
      category: 'electronics',
      userId: new mongoose.Types.ObjectId().toHexString(),
      version: 0
    }

    const payload = {} as EachMessagePayload

    // Process twice
    await consumer.onMessage(data, payload)
    await consumer.onMessage(data, payload)  // Should not throw

    // Verify only 1 product exists
    const products = await Product.find({ _id: data.id })
    expect(products.length).toEqual(1)
  })
})
```

### 4.2 Test Version Ordering

```typescript
describe('ProductUpdatedConsumer', () => {
  it('updates product with correct version', async () => {
    const consumer = new ProductUpdatedConsumer({} as any)

    // Create product with version 0
    const product = Product.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'Original',
      price: 50,
      quantity: 5,
      version: 0
    })
    await product.save()

    // Update data with version 1
    const updateData = {
      id: product.id,
      title: 'Updated',
      price: 100,
      quantity: 10,
      version: 1
    }

    await consumer.onMessage(updateData, {} as any)

    const updatedProduct = await Product.findById(product.id)
    expect(updatedProduct!.title).toEqual('Updated')
    expect(updatedProduct!.version).toEqual(1)
  })

  it('skips out-of-order events', async () => {
    const consumer = new ProductUpdatedConsumer({} as any)

    // Create product with version 0
    const product = Product.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'Original',
      price: 50,
      quantity: 5,
      version: 0
    })
    await product.save()

    // Try to apply version 2 (skipping version 1)
    const outOfOrderData = {
      id: product.id,
      title: 'Skipped',
      price: 200,
      version: 2  // Expected version 1
    }

    await consumer.onMessage(outOfOrderData, {} as any)

    // Verify no update happened
    const unchangedProduct = await Product.findById(product.id)
    expect(unchangedProduct!.title).toEqual('Original')
    expect(unchangedProduct!.version).toEqual(0)
  })
})
```

---

## 5. Test Helpers

### 5.1 Create Test Data

```typescript
// src/test/helpers.ts

import mongoose from 'mongoose'
import { Product } from '../models/product'
import { Order, OrderStatus } from '../models/order'

export const createProduct = async (attrs: Partial<{
  title: string
  price: number
  quantity: number
  userId: string
}> = {}) => {
  const product = Product.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    title: attrs.title || 'Test Product',
    price: attrs.price ?? 99,
    quantity: attrs.quantity ?? 10,
    userId: attrs.userId || new mongoose.Types.ObjectId().toHexString(),
    version: 0
  })
  await product.save()
  return product
}

export const createOrder = async (userId: string, product: any) => {
  const order = Order.build({
    userId,
    status: OrderStatus.Created,
    items: [{
      product: product.id,
      quantity: 1,
      priceSnapshot: product.price,
      titleSnapshot: product.title
    }],
    total: product.price
  })
  await order.save()
  return order
}
```

### 5.2 Use Helpers in Tests

```typescript
import { createProduct, createOrder } from '../../test/helpers'

describe('POST /api/payments', () => {
  it('returns 404 for non-existent order', async () => {
    await request(app)
      .post('/api/payments')
      .set('Cookie', global.signin())
      .send({
        orderId: new mongoose.Types.ObjectId().toHexString(),
        token: 'tok_visa'
      })
      .expect(404)
  })

  it('returns 401 when paying for another users order', async () => {
    const product = await createProduct()
    const order = await createOrder('user123', product)

    // Different user tries to pay
    await request(app)
      .post('/api/payments')
      .set('Cookie', global.signin('differentUser'))
      .send({ orderId: order.id, token: 'tok_visa' })
      .expect(401)
  })
})
```

---

## 6. Running Tests

### 6.1 npm Scripts

```json
// package.json
{
  "scripts": {
    "test": "jest --watchAll --no-cache",
    "test:ci": "jest --ci --coverage",
    "test:coverage": "jest --coverage"
  }
}
```

### 6.2 Command Line

```bash
# Chạy tests với watch mode
npm test

# Chạy một test file cụ thể
npm test -- routes/__test__/new.test.ts

# Chạy tests matching pattern
npm test -- --testNamePattern="creates product"

# Chạy với coverage report
npm test -- --coverage

# CI mode (no watch, exit after tests)
npm run test:ci
```

### 6.3 Coverage Report

```bash
$ npm run test:coverage

 PASS  src/routes/__test__/new.test.ts
 PASS  src/routes/__test__/show.test.ts
 PASS  src/routes/__test__/update.test.ts
 PASS  src/routes/__test__/delete.test.ts

---------------------------|---------|----------|---------|---------|
File                       | % Stmts | % Branch | % Funcs | % Lines |
---------------------------|---------|----------|---------|---------|
All files                  |   85.42 |    78.26 |   90.91 |   85.71 |
 src/routes                |   92.31 |    84.62 |  100.00 |   92.31 |
  delete.ts                |  100.00 |  100.00  |  100.00 |  100.00 |
  index.ts                 |  100.00 |  100.00  |  100.00 |  100.00 |
  new.ts                   |   85.71 |    75.00 |  100.00 |   85.71 |
  show.ts                  |   90.00 |    80.00 |  100.00 |   90.00 |
  update.ts                |   87.50 |    83.33 |  100.00 |   87.50 |
---------------------------|---------|----------|---------|---------|
```

---

## 7. Test Files Summary

### 7.1 Tests Đã Tạo

| Service | Test Files | Coverage Areas |
|---------|------------|----------------|
| **Auth** | 4 files | signin, signup, signout, current-user |
| **Products** | 7 files | index, new, show, update, delete, reserve |
| **Orders** | 6 files | index, new, show, delete, admin-index, admin-analytics |
| **Cart** | 4 files | add-to-cart, remove-from-cart, view-cart, checkout |
| **Payments** | 1 file | new (payment processing) |

### 7.2 Test Coverage Goals

| Metric | Target | Current |
|--------|--------|---------|
| Statements | > 80% | ~85% |
| Branches | > 75% | ~78% |
| Functions | > 90% | ~91% |
| Lines | > 80% | ~86% |

---

## 8. Best Practices

### 8.1 Test Organization

```
routes/__test__/
├── index.test.ts      # GET /api/resource (list)
├── new.test.ts        # POST /api/resource (create)
├── show.test.ts       # GET /api/resource/:id (detail)
├── update.test.ts     # PUT /api/resource/:id (update)
└── delete.test.ts     # DELETE /api/resource/:id (delete)
```

### 8.2 Test Naming

```typescript
// Mô tả rõ scenario
describe('POST /api/products', () => {
  it('returns 401 if user is not authenticated', ...)
  it('returns 400 if title is missing', ...)
  it('returns 400 if price is negative', ...)
  it('creates product with valid inputs', ...)
  it('publishes product.created event', ...)
})
```

### 8.3 AAA Pattern

```typescript
it('updates product successfully', async () => {
  // Arrange - Setup test data
  const cookie = global.signin()
  const product = await createProduct({ userId: 'user123' })

  // Act - Execute the action
  const response = await request(app)
    .put(`/api/products/${product.id}`)
    .set('Cookie', cookie)
    .send({ title: 'Updated' })

  // Assert - Verify results
  expect(response.status).toEqual(200)
  expect(response.body.title).toEqual('Updated')
})
```

### 8.4 Isolation

```typescript
// Mỗi test độc lập, không depend vào test khác
beforeEach(async () => {
  // Clear database
  const collections = await mongoose.connection.db.collections()
  for (let collection of collections) {
    await collection.deleteMany({})
  }
})
```

---

## Tổng Kết

### Key Components:

1. **MongoMemoryServer**: In-memory MongoDB cho fast, isolated tests
2. **Kafka Mock**: Mock Kafka để test event publishing
3. **global.signin()**: Helper tạo authenticated requests
4. **Test Helpers**: Functions tạo test data

### Test Categories:

- **Authentication**: 401 for unauthenticated
- **Authorization**: 401/403 for unauthorized
- **Validation**: 400 for invalid inputs
- **Success Cases**: 200/201 for valid requests
- **Event Publishing**: Verify Kafka producer called

### Commands:

```bash
npm test                    # Watch mode
npm test -- --coverage      # Coverage report
npm run test:ci             # CI mode
```
