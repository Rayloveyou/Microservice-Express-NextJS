/**
 * Cart Service - Database Migrations
 *
 * Collection: carts
 * Fields: userId (unique), items[], version
 */

import mongoose from 'mongoose'
import { MigrationDefinition, runMigrations, rollbackLastMigration } from './migration-runner'

// ============================================================================
// MIGRATION 001: Tạo indexes cho Carts collection
// ============================================================================
const migration_001_create_indexes: MigrationDefinition = {
  name: '20251212_001_create_cart_indexes',

  up: async () => {
    const db = mongoose.connection.db
    if (!db) throw new Error('Database connection not established')

    const collection = db.collection('carts')

    // Index 1: userId (unique) - mỗi user chỉ có 1 cart
    // Đã được Mongoose tạo tự động, nhưng ta define ở đây để rõ ràng
    await collection.createIndex({ userId: 1 }, { unique: true, name: 'idx_user_id_unique' })

    // Index 2: updatedAt - để xác định carts không hoạt động
    // Hữu ích cho: "Xóa carts không có activity trong 30 ngày"
    await collection.createIndex({ updatedAt: 1 }, { name: 'idx_updated_at' })

    // Index 3: TTL Index - tự động xóa carts sau 30 ngày không hoạt động
    // TTL (Time To Live): MongoDB tự động xóa document sau thời gian chỉ định
    // expireAfterSeconds: 2592000 = 30 ngày * 24 giờ * 60 phút * 60 giây
    // UNCOMMENT nếu muốn enable tính năng này:
    // await collection.createIndex(
    //   { updatedAt: 1 },
    //   { name: 'idx_cart_ttl', expireAfterSeconds: 2592000 }
    // )

    console.log('[Cart Migration] Created indexes for carts collection')
  },

  down: async () => {
    const db = mongoose.connection.db
    if (!db) throw new Error('Database connection not established')

    const collection = db.collection('carts')

    const indexesToDrop = ['idx_user_id_unique', 'idx_updated_at']

    for (const idx of indexesToDrop) {
      try {
        await collection.dropIndex(idx)
      } catch (e) {
        /* Index might not exist */
      }
    }

    console.log('[Cart Migration] Dropped indexes from carts collection')
  }
}

// ============================================================================
// MIGRATION 002: Tạo indexes cho Products collection (replicated data)
// ============================================================================
const migration_002_create_product_indexes: MigrationDefinition = {
  name: '20251212_002_create_replicated_product_indexes',

  up: async () => {
    const db = mongoose.connection.db
    if (!db) throw new Error('Database connection not established')

    // Cart service có replicated products collection
    const collection = db.collection('products')

    // Index cho product lookup khi view cart
    await collection.createIndex({ _id: 1 }, { name: 'idx_product_id' })

    // Index cho title search (khi hiển thị cart items)
    await collection.createIndex({ title: 1 }, { name: 'idx_product_title' })

    console.log('[Cart Migration] Created indexes for replicated products collection')
  },

  down: async () => {
    const db = mongoose.connection.db
    if (!db) throw new Error('Database connection not established')

    const collection = db.collection('products')

    try {
      await collection.dropIndex('idx_product_id')
    } catch (e) {
      /* */
    }
    try {
      await collection.dropIndex('idx_product_title')
    } catch (e) {
      /* */
    }

    console.log('[Cart Migration] Dropped indexes from replicated products collection')
  }
}

// ============================================================================
// DANH SÁCH MIGRATIONS
// ============================================================================
export const migrations: MigrationDefinition[] = [
  migration_001_create_indexes,
  migration_002_create_product_indexes
]

export async function runCartMigrations(): Promise<number> {
  return runMigrations(migrations)
}

export async function rollbackCartMigration(): Promise<string | null> {
  return rollbackLastMigration(migrations)
}
