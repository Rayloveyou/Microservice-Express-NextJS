/**
 * Payments Service - Database Migrations
 *
 * Collections: payments, orders (replicated), products (replicated)
 */

import mongoose from 'mongoose'
import { MigrationDefinition, runMigrations, rollbackLastMigration } from './migration-runner'

// ============================================================================
// MIGRATION 001: Tạo indexes cho Payments collection
// ============================================================================
const migration_001_create_indexes: MigrationDefinition = {
  name: '20251212_001_create_payment_indexes',

  up: async () => {
    const db = mongoose.connection.db
    if (!db) throw new Error('Database connection not established')

    const collection = db.collection('payments')

    // Index 1: orderId - để lookup payment theo order
    // Mỗi order chỉ có 1 payment thành công
    await collection.createIndex({ orderId: 1 }, { unique: true, name: 'idx_order_id_unique' })

    // Index 2: stripeId - để lookup payment theo Stripe payment ID
    // Hữu ích cho: Webhook processing, refunds
    await collection.createIndex({ stripeId: 1 }, { unique: true, name: 'idx_stripe_id_unique' })

    console.log('[Payments Migration] Created indexes for payments collection')
  },

  down: async () => {
    const db = mongoose.connection.db
    if (!db) throw new Error('Database connection not established')

    const collection = db.collection('payments')

    try {
      await collection.dropIndex('idx_order_id_unique')
    } catch (e) {
      /* */
    }
    try {
      await collection.dropIndex('idx_stripe_id_unique')
    } catch (e) {
      /* */
    }

    console.log('[Payments Migration] Dropped indexes from payments collection')
  }
}

// ============================================================================
// MIGRATION 002: Tạo indexes cho Orders collection (replicated data)
// ============================================================================
const migration_002_create_order_indexes: MigrationDefinition = {
  name: '20251212_002_create_replicated_order_indexes',

  up: async () => {
    const db = mongoose.connection.db
    if (!db) throw new Error('Database connection not established')

    const collection = db.collection('orders')

    // Index cho order lookup khi process payment
    await collection.createIndex({ _id: 1 }, { name: 'idx_order_id' })

    // Index cho userId - để verify ownership
    await collection.createIndex({ userId: 1 }, { name: 'idx_user_id' })

    // Index cho status - để filter orders pending payment
    await collection.createIndex({ status: 1 }, { name: 'idx_status' })

    console.log('[Payments Migration] Created indexes for replicated orders collection')
  },

  down: async () => {
    const db = mongoose.connection.db
    if (!db) throw new Error('Database connection not established')

    const collection = db.collection('orders')

    const indexes = ['idx_order_id', 'idx_user_id', 'idx_status']
    for (const idx of indexes) {
      try {
        await collection.dropIndex(idx)
      } catch (e) {
        /* */
      }
    }

    console.log('[Payments Migration] Dropped indexes from replicated orders collection')
  }
}

// ============================================================================
// DANH SÁCH MIGRATIONS
// ============================================================================
export const migrations: MigrationDefinition[] = [
  migration_001_create_indexes,
  migration_002_create_order_indexes
]

export async function runPaymentsMigrations(): Promise<number> {
  return runMigrations(migrations)
}

export async function rollbackPaymentsMigration(): Promise<string | null> {
  return rollbackLastMigration(migrations)
}
