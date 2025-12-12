/**
 * Orders Service - Database Migrations
 *
 * Collection: orders
 * Fields: userId, userEmail, status, items[], total, version
 */

import mongoose from 'mongoose'
import { MigrationDefinition, runMigrations, rollbackLastMigration } from './migration-runner'

// ============================================================================
// MIGRATION 001: Tạo indexes cho Orders collection
// ============================================================================
const migration_001_create_indexes: MigrationDefinition = {
  name: '20251212_001_create_order_indexes',

  up: async () => {
    const db = mongoose.connection.db
    if (!db) throw new Error('Database connection not established')

    const collection = db.collection('orders')

    // Index 1: userId - để query orders của một user
    // Hữu ích cho: "Lấy tất cả đơn hàng của user X"
    await collection.createIndex({ userId: 1 }, { name: 'idx_user_id' })

    // Index 2: status - để filter theo trạng thái
    // Hữu ích cho: "Lấy tất cả đơn hàng pending"
    await collection.createIndex({ status: 1 }, { name: 'idx_status' })

    // Index 3: Compound (userId + status) - query phổ biến
    // Hữu ích cho: "Lấy đơn hàng pending của user X"
    await collection.createIndex({ userId: 1, status: 1 }, { name: 'idx_user_status' })

    // Index 4: createdAt - để sort theo thời gian
    // Hữu ích cho: "Đơn hàng mới nhất"
    await collection.createIndex({ createdAt: -1 }, { name: 'idx_created_at' })

    // Index 5: Compound (userId + createdAt) - query orders gần đây của user
    await collection.createIndex({ userId: 1, createdAt: -1 }, { name: 'idx_user_created_at' })

    // Index 6: userEmail - để admin search theo email
    await collection.createIndex({ userEmail: 1 }, { name: 'idx_user_email', sparse: true })

    // Index 7: total - để analytics (tổng doanh thu, etc.)
    await collection.createIndex({ total: 1 }, { name: 'idx_total' })

    // Index 8: Compound (status + createdAt) - cho admin dashboard
    // Hữu ích cho: "Đơn hàng complete trong tháng này"
    await collection.createIndex({ status: 1, createdAt: -1 }, { name: 'idx_status_created_at' })

    console.log('[Orders Migration] Created indexes for orders collection')
  },

  down: async () => {
    const db = mongoose.connection.db
    if (!db) throw new Error('Database connection not established')

    const collection = db.collection('orders')

    const indexesToDrop = [
      'idx_user_id',
      'idx_status',
      'idx_user_status',
      'idx_created_at',
      'idx_user_created_at',
      'idx_user_email',
      'idx_total',
      'idx_status_created_at'
    ]

    for (const idx of indexesToDrop) {
      try {
        await collection.dropIndex(idx)
      } catch (e) {
        /* Index might not exist */
      }
    }

    console.log('[Orders Migration] Dropped indexes from orders collection')
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

    // Orders service có replicated products collection
    const collection = db.collection('products')

    // Index cho product lookup khi tạo order
    await collection.createIndex({ _id: 1 }, { name: 'idx_product_id' })

    console.log('[Orders Migration] Created indexes for replicated products collection')
  },

  down: async () => {
    const db = mongoose.connection.db
    if (!db) throw new Error('Database connection not established')

    const collection = db.collection('products')

    try {
      await collection.dropIndex('idx_product_id')
    } catch (e) {
      /* Index might not exist */
    }

    console.log('[Orders Migration] Dropped indexes from replicated products collection')
  }
}

// ============================================================================
// DANH SÁCH MIGRATIONS
// ============================================================================
export const migrations: MigrationDefinition[] = [
  migration_001_create_indexes,
  migration_002_create_product_indexes
]

export async function runOrdersMigrations(): Promise<number> {
  return runMigrations(migrations)
}

export async function rollbackOrdersMigration(): Promise<string | null> {
  return rollbackLastMigration(migrations)
}
