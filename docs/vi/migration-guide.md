# 🔄 Hướng Dẫn Database Migration

Tài liệu này mô tả hệ thống migration được implement cho tất cả services.

---

## 1. Tổng Quan

### 1.1 Migration là gì?

Migration là cơ chế để:
- **Tạo indexes** tối ưu performance queries
- **Seed data** mặc định khi cần
- **Thay đổi schema** có kiểm soát (thêm/đổi tên fields)
- **Version control** cho database changes

### 1.2 Migration System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Service Startup                         │
│                                                             │
│  1. Connect MongoDB                                         │
│  2. Check _migrations collection                            │
│  3. Run pending migrations (sorted by name)                 │
│  4. Record completed migrations                             │
│  5. Start Express server                                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    _migrations Collection                   │
│                                                             │
│  { name: "20251212_001_create_user_indexes", createdAt }   │
│  { name: "20251212_002_add_default_values", createdAt }    │
│  { name: "20251213_001_add_new_field", createdAt }         │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Migration Structure

### 2.1 Cấu Trúc Thư Mục

```
<service>/
├── src/
│   ├── migrations/
│   │   ├── migration-runner.ts    # Core runner logic
│   │   └── index.ts               # Service-specific migrations
│   └── index.ts                   # Gọi runMigrations() sau khi connect DB
```

### 2.2 Migration Runner

```typescript
// migrations/migration-runner.ts

import mongoose from 'mongoose'

// Schema cho tracking migrations đã chạy
const migrationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true }
  },
  { timestamps: true }
)

const Migration = mongoose.model('Migration', migrationSchema)

// Interface định nghĩa một migration
export interface MigrationDefinition {
  name: string              // Format: YYYYMMDD_NNN_description
  up: () => Promise<void>   // Logic chạy migration
  down: () => Promise<void> // Logic rollback (optional)
}

// Hàm chính chạy migrations
export async function runMigrations(
  migrations: MigrationDefinition[]
): Promise<number> {
  // Sort migrations theo tên (chronological order)
  const sortedMigrations = [...migrations].sort((a, b) =>
    a.name.localeCompare(b.name)
  )

  let executedCount = 0

  for (const migration of sortedMigrations) {
    // Check đã chạy chưa
    const existing = await Migration.findOne({ name: migration.name })
    if (existing) {
      console.log(`⏭️  Skipping: ${migration.name} (already executed)`)
      continue
    }

    // Run migration
    console.log(`▶️  Running: ${migration.name}`)
    try {
      await migration.up()

      // Record success
      await Migration.create({ name: migration.name })
      console.log(`✅ Completed: ${migration.name}`)
      executedCount++
    } catch (error) {
      console.error(`❌ Failed: ${migration.name}`, error)
      throw error
    }
  }

  return executedCount
}
```

### 2.3 Migration Definition

```typescript
// migrations/index.ts

import { MigrationDefinition, runMigrations } from './migration-runner'
import mongoose from 'mongoose'

const db = mongoose.connection.db!

// Migration 001: Tạo indexes
const migration_001_create_indexes: MigrationDefinition = {
  name: '20251212_001_create_user_indexes',

  up: async () => {
    const collection = db.collection('users')

    // Email unique index
    await collection.createIndex(
      { email: 1 },
      { unique: true, name: 'idx_email_unique' }
    )

    // Role index cho admin filtering
    await collection.createIndex(
      { role: 1 },
      { name: 'idx_role' }
    )
  },

  down: async () => {
    const collection = db.collection('users')
    await collection.dropIndex('idx_email_unique')
    await collection.dropIndex('idx_role')
  }
}

// Migration 002: Add default values
const migration_002_add_defaults: MigrationDefinition = {
  name: '20251212_002_add_default_values',

  up: async () => {
    const collection = db.collection('users')

    // Add isBlocked: false for users without it
    await collection.updateMany(
      { isBlocked: { $exists: false } },
      { $set: { isBlocked: false } }
    )
  },

  down: async () => {
    // No rollback needed - field stays
  }
}

// Export runner function
export async function runAuthMigrations(): Promise<void> {
  const count = await runMigrations([
    migration_001_create_indexes,
    migration_002_add_defaults
  ])

  if (count > 0) {
    console.log(`🎉 Executed ${count} migration(s)`)
  } else {
    console.log('📋 No pending migrations')
  }
}
```

---

## 3. Migrations Chi Tiết Từng Service

### 3.1 Auth Service

```typescript
// auth/src/migrations/index.ts

// Migration 001: User indexes
const migration_001: MigrationDefinition = {
  name: '20251212_001_create_user_indexes',
  up: async () => {
    const collection = db.collection('users')

    // Email unique - dùng cho login lookup
    await collection.createIndex(
      { email: 1 },
      { unique: true, name: 'idx_email_unique' }
    )

    // Role index - filter admin users
    await collection.createIndex(
      { role: 1 },
      { name: 'idx_role' }
    )

    // isBlocked sparse index - chỉ index documents có field này
    await collection.createIndex(
      { isBlocked: 1 },
      { name: 'idx_is_blocked', sparse: true }
    )

    // Refresh token - nếu implement token rotation
    await collection.createIndex(
      { refreshToken: 1 },
      { name: 'idx_refresh_token', sparse: true }
    )
  },
  down: async () => { /* drop indexes */ }
}

// Migration 002: Default values
const migration_002: MigrationDefinition = {
  name: '20251212_002_add_default_values',
  up: async () => {
    const collection = db.collection('users')

    // Set role = 'user' cho users chưa có role
    await collection.updateMany(
      { role: { $exists: false } },
      { $set: { role: 'user' } }
    )

    // Set isBlocked = false
    await collection.updateMany(
      { isBlocked: { $exists: false } },
      { $set: { isBlocked: false } }
    )
  },
  down: async () => { /* no rollback */ }
}
```

### 3.2 Products Service

```typescript
// products/src/migrations/index.ts

// Migration 001: Product indexes
const migration_001: MigrationDefinition = {
  name: '20251212_001_create_product_indexes',
  up: async () => {
    const collection = db.collection('products')

    // userId index - filter products by seller
    await collection.createIndex(
      { userId: 1 },
      { name: 'idx_user_id' }
    )

    // Category + Price compound index - browse/filter
    await collection.createIndex(
      { category: 1, price: 1 },
      { name: 'idx_category_price' }
    )

    // Version index - OCC queries
    await collection.createIndex(
      { _id: 1, version: 1 },
      { name: 'idx_id_version' }
    )

    // Title text index - search functionality
    await collection.createIndex(
      { title: 'text' },
      { name: 'idx_title_text' }
    )

    // Category partial index - chỉ products còn hàng
    await collection.createIndex(
      { category: 1 },
      {
        name: 'idx_category_in_stock',
        partialFilterExpression: { quantity: { $gt: 0 } }
      }
    )
  },
  down: async () => { /* drop indexes */ }
}

// Migration 002: Seed default category
const migration_002: MigrationDefinition = {
  name: '20251212_002_seed_default_category',
  up: async () => {
    const collection = db.collection('products')

    // Set category = 'other' cho products chưa có
    await collection.updateMany(
      { category: { $exists: false } },
      { $set: { category: 'other' } }
    )
  },
  down: async () => { /* no rollback */ }
}
```

### 3.3 Orders Service

```typescript
// orders/src/migrations/index.ts

// Migration 001: Order indexes
const migration_001: MigrationDefinition = {
  name: '20251212_001_create_order_indexes',
  up: async () => {
    const orders = db.collection('orders')

    // User + Status compound - filter user's orders by status
    await orders.createIndex(
      { userId: 1, status: 1 },
      { name: 'idx_user_status' }
    )

    // Status + CreatedAt - admin dashboard queries
    await orders.createIndex(
      { status: 1, createdAt: -1 },
      { name: 'idx_status_created_at' }
    )

    // Version index - OCC
    await orders.createIndex(
      { _id: 1, version: 1 },
      { name: 'idx_id_version' }
    )

    // Products replica indexes
    const products = db.collection('products')
    await products.createIndex(
      { _id: 1, version: 1 },
      { name: 'idx_id_version' }
    )
  },
  down: async () => { /* drop indexes */ }
}
```

### 3.4 Cart Service

```typescript
// cart/src/migrations/index.ts

// Migration 001: Cart indexes
const migration_001: MigrationDefinition = {
  name: '20251212_001_create_cart_indexes',
  up: async () => {
    const carts = db.collection('carts')

    // userId unique - mỗi user chỉ có 1 cart
    await carts.createIndex(
      { userId: 1 },
      { unique: true, name: 'idx_user_id_unique' }
    )

    // UpdatedAt - potential TTL cleanup (commented)
    await carts.createIndex(
      { updatedAt: 1 },
      { name: 'idx_updated_at' }
      // Nếu muốn TTL: { expireAfterSeconds: 30 * 24 * 60 * 60 }
    )

    // Products replica
    const products = db.collection('products')
    await products.createIndex(
      { _id: 1, version: 1 },
      { name: 'idx_id_version' }
    )
  },
  down: async () => { /* drop indexes */ }
}
```

### 3.5 Payments Service

```typescript
// payments/src/migrations/index.ts

// Migration 001: Payment indexes
const migration_001: MigrationDefinition = {
  name: '20251212_001_create_payment_indexes',
  up: async () => {
    const payments = db.collection('payments')

    // orderId unique - mỗi order chỉ có 1 payment
    await payments.createIndex(
      { orderId: 1 },
      { unique: true, name: 'idx_order_id_unique' }
    )

    // stripeId unique - track Stripe charges
    await payments.createIndex(
      { stripeId: 1 },
      { unique: true, name: 'idx_stripe_id_unique' }
    )

    // Orders replica
    const orders = db.collection('orders')
    await orders.createIndex(
      { userId: 1, status: 1 },
      { name: 'idx_user_status' }
    )
    await orders.createIndex(
      { _id: 1, version: 1 },
      { name: 'idx_id_version' }
    )
  },
  down: async () => { /* drop indexes */ }
}
```

---

## 4. Tích Hợp Vào Service Startup

### 4.1 Service Index.ts Pattern

```typescript
// <service>/src/index.ts

import mongoose from 'mongoose'

const connectMongo = async (): Promise<void> => {
  const mongoUri = `mongodb://...`

  try {
    await mongoose.connect(mongoUri)
    console.log('Connected to MongoDB')

    // ✅ Run migrations sau khi connect
    const { runXxxMigrations } = await import('./migrations')
    await runXxxMigrations()

  } catch (err) {
    console.error('MongoDB connection failed:', err)
    // Retry logic...
  }
}

const start = async () => {
  await connectKafka()
  await connectMongo()  // Migrations chạy ở đây

  app.listen(PORT, () => {
    console.log(`Service listening on port ${PORT}`)
  })
}

start()
```

### 4.2 Dynamic Import Reason

```typescript
// Dùng dynamic import để đảm bảo mongoose.connection.db đã có
const { runXxxMigrations } = await import('./migrations')

// Nếu import static ở đầu file:
// - mongoose.connection.db có thể là undefined
// - Migration sẽ fail
```

---

## 5. Migration Naming Convention

### 5.1 Format

```
YYYYMMDD_NNN_description

Ví dụ:
- 20251212_001_create_user_indexes
- 20251212_002_add_default_values
- 20251213_001_add_new_field
```

### 5.2 Tại Sao Format Này?

```
YYYYMMDD  → Chronological sorting
NNN       → Multiple migrations cùng ngày
_         → Readable separator
description → Mô tả ngắn gọn

Khi sort by name:
1. 20251212_001_create_user_indexes
2. 20251212_002_add_default_values
3. 20251213_001_add_new_field
```

---

## 6. Index Types Explained

### 6.1 Unique Index

```typescript
// Đảm bảo không có 2 documents có cùng value
await collection.createIndex(
  { email: 1 },
  { unique: true }
)

// Insert duplicate email → Error
// Tối ưu cho: login lookup, prevent duplicates
```

### 6.2 Compound Index

```typescript
// Index trên nhiều fields
await collection.createIndex(
  { category: 1, price: 1 }
)

// Tối ưu queries như:
// db.products.find({ category: 'electronics' })
// db.products.find({ category: 'electronics', price: { $lt: 500 } })
// db.products.find({ category: 'electronics' }).sort({ price: 1 })
```

### 6.3 Text Index

```typescript
// Full-text search
await collection.createIndex(
  { title: 'text', description: 'text' }
)

// Query:
// db.products.find({ $text: { $search: "iphone pro" } })
```

### 6.4 Sparse Index

```typescript
// Chỉ index documents CÓ field này
await collection.createIndex(
  { refreshToken: 1 },
  { sparse: true }
)

// Không index documents không có refreshToken
// Tiết kiệm storage, tối ưu queries
```

### 6.5 Partial Index

```typescript
// Index với điều kiện filter
await collection.createIndex(
  { category: 1 },
  {
    partialFilterExpression: { quantity: { $gt: 0 } }
  }
)

// Chỉ index products còn hàng
// Tối ưu cho browse pages chỉ show in-stock items
```

### 6.6 TTL Index

```typescript
// Auto-delete documents sau thời gian
await collection.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 3600 }  // 1 hour
)

// Documents tự xóa sau 1 giờ
// Use case: sessions, OTPs, temporary data
```

---

## 7. Rollback Migrations

### 7.1 Manual Rollback

```typescript
// Chạy down() của migration cụ thể

async function rollbackMigration(name: string) {
  const migration = migrations.find(m => m.name === name)
  if (!migration) throw new Error('Migration not found')

  await migration.down()

  // Xóa record từ _migrations
  await Migration.deleteOne({ name })

  console.log(`Rolled back: ${name}`)
}
```

### 7.2 Rollback Script

```bash
# Tạo script rollback
# scripts/rollback-migration.ts

import { rollbackMigration } from '../src/migrations/migration-runner'

const migrationName = process.argv[2]
if (!migrationName) {
  console.error('Usage: npx ts-node scripts/rollback-migration.ts <migration_name>')
  process.exit(1)
}

rollbackMigration(migrationName)
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
```

---

## 8. Best Practices

### 8.1 Migration Rules

| Rule | Explanation |
|------|-------------|
| ✅ Idempotent | Migration chạy nhiều lần không lỗi |
| ✅ Backward compatible | Không break existing queries |
| ✅ Reversible | Có down() để rollback |
| ✅ Small & focused | Mỗi migration làm 1 việc |
| ❌ Data-dependent | Tránh depend vào data cụ thể |

### 8.2 Testing Migrations

```typescript
// Test migration trong test environment

describe('Migration: create_user_indexes', () => {
  beforeAll(async () => {
    await mongoose.connect(mongoUri)
  })

  it('creates email unique index', async () => {
    await migration_001.up()

    const indexes = await db.collection('users').indexes()
    const emailIndex = indexes.find(i => i.name === 'idx_email_unique')

    expect(emailIndex).toBeDefined()
    expect(emailIndex.unique).toBe(true)
  })

  it('rollback removes indexes', async () => {
    await migration_001.down()

    const indexes = await db.collection('users').indexes()
    const emailIndex = indexes.find(i => i.name === 'idx_email_unique')

    expect(emailIndex).toBeUndefined()
  })
})
```

---

## Tổng Kết

### Migration System Features:

1. **Version Tracking**: `_migrations` collection lưu migrations đã chạy
2. **Chronological Execution**: Sorted by name, chạy theo thứ tự
3. **Idempotent**: Skip migrations đã chạy
4. **Rollback Support**: Mỗi migration có `down()` method
5. **Error Handling**: Throw error nếu migration fail

### Files Created Per Service:

```
<service>/src/migrations/
├── migration-runner.ts   # Shared runner logic
└── index.ts              # Service-specific migrations
```

### Startup Flow:

```
MongoDB Connect → Run Migrations → Start Server
```
