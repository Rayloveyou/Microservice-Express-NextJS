/**
 * Products Service - Database Migrations
 *
 * Collection: products
 * Fields: title, price, userId, quantity, category, imageUrl, version
 */

import mongoose from 'mongoose'
import { MigrationDefinition, runMigrations, rollbackLastMigration } from './migration-runner'

// ============================================================================
// MIGRATION 001: Tạo indexes cho Products collection
// ============================================================================
const migration_001_create_indexes: MigrationDefinition = {
  name: '20251212_001_create_product_indexes',

  up: async () => {
    const db = mongoose.connection.db
    if (!db) throw new Error('Database connection not established')

    const collection = db.collection('products')

    // Index 1: userId - để query products của một user
    // Hữu ích cho: "Lấy tất cả sản phẩm của seller X"
    await collection.createIndex({ userId: 1 }, { name: 'idx_user_id' })

    // Index 2: category - để filter theo danh mục
    // Hữu ích cho: "Lấy tất cả sản phẩm Electronics"
    await collection.createIndex({ category: 1 }, { name: 'idx_category' })

    // Index 3: price - để sort theo giá
    // Hữu ích cho: "Sắp xếp sản phẩm theo giá tăng/giảm dần"
    await collection.createIndex({ price: 1 }, { name: 'idx_price' })

    // Index 4: Compound index (category + price) - query phổ biến
    // Hữu ích cho: "Lấy sản phẩm Electronics, sắp xếp theo giá"
    await collection.createIndex({ category: 1, price: 1 }, { name: 'idx_category_price' })

    // Index 5: Text index cho search
    // Hữu ích cho: "Tìm kiếm sản phẩm theo từ khóa"
    await collection.createIndex({ title: 'text' }, { name: 'idx_title_text' })

    // Index 6: createdAt - để sort theo thời gian tạo
    await collection.createIndex({ createdAt: -1 }, { name: 'idx_created_at' })

    // Index 7: quantity > 0 (partial index) - chỉ index sản phẩm còn hàng
    // Partial index: chỉ index documents thỏa điều kiện
    // Tiết kiệm space và cải thiện performance
    await collection.createIndex(
      { category: 1 },
      {
        name: 'idx_category_in_stock',
        partialFilterExpression: { quantity: { $gt: 0 } }
      }
    )

    console.log('[Products Migration] Created indexes for products collection')
  },

  down: async () => {
    const db = mongoose.connection.db
    if (!db) throw new Error('Database connection not established')

    const collection = db.collection('products')

    const indexesToDrop = [
      'idx_user_id',
      'idx_category',
      'idx_price',
      'idx_category_price',
      'idx_title_text',
      'idx_created_at',
      'idx_category_in_stock'
    ]

    for (const idx of indexesToDrop) {
      try {
        await collection.dropIndex(idx)
      } catch (e) {
        /* Index might not exist */
      }
    }

    console.log('[Products Migration] Dropped indexes from products collection')
  }
}

// ============================================================================
// MIGRATION 002: Set default category cho products cũ
// ============================================================================
const migration_002_set_default_category: MigrationDefinition = {
  name: '20251212_002_set_default_category',

  up: async () => {
    const db = mongoose.connection.db
    if (!db) throw new Error('Database connection not established')

    const collection = db.collection('products')

    // Set category = 'other' cho products chưa có category
    const result = await collection.updateMany(
      { category: { $exists: false } },
      { $set: { category: 'other' } }
    )

    console.log(`[Products Migration] Set default category for ${result.modifiedCount} products`)
  },

  down: async () => {
    console.log('[Products Migration] No rollback needed for default category')
  }
}

// ============================================================================
// DANH SÁCH MIGRATIONS
// ============================================================================
export const migrations: MigrationDefinition[] = [
  migration_001_create_indexes,
  migration_002_set_default_category
]

export async function runProductsMigrations(): Promise<number> {
  return runMigrations(migrations)
}

export async function rollbackProductsMigration(): Promise<string | null> {
  return rollbackLastMigration(migrations)
}
