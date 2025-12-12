/**
 * Auth Service - Database Migrations
 *
 * === DANH SÁCH MIGRATIONS ===
 *
 * Quy tắc đặt tên: YYYYMMDD_XXX_mô_tả
 * - YYYYMMDD: Ngày tạo migration
 * - XXX: Số thứ tự trong ngày (001, 002, ...)
 * - mô_tả: Mô tả ngắn gọn migration làm gì
 *
 * Ví dụ: 20251212_001_create_indexes
 */

import mongoose from 'mongoose'
import { MigrationDefinition, runMigrations, rollbackLastMigration } from './migration-runner'

// ============================================================================
// MIGRATION 001: Tạo indexes cho User collection
// ============================================================================
const migration_001_create_indexes: MigrationDefinition = {
  name: '20251212_001_create_user_indexes',

  /**
   * UP: Tạo các indexes cần thiết
   *
   * Index là gì?
   * - Index giống như mục lục của sách - giúp tìm kiếm nhanh hơn
   * - Không có index: MongoDB phải scan toàn bộ collection (COLLSCAN) → chậm
   * - Có index: MongoDB chỉ scan index rồi lấy document trực tiếp (IXSCAN) → nhanh
   *
   * Khi nào cần index?
   * - Fields được query thường xuyên (WHERE, find)
   * - Fields dùng trong sort
   * - Fields cần unique constraint
   */
  up: async () => {
    const db = mongoose.connection.db
    if (!db) throw new Error('Database connection not established')

    const collection = db.collection('users')

    // Index 1: Email (unique)
    // - Mục đích: Đảm bảo không có 2 users trùng email
    // - Tự động tạo bởi Mongoose schema { unique: true }
    // - Nhưng ta define ở đây để rõ ràng và có thể rollback
    await collection.createIndex({ email: 1 }, { unique: true, name: 'idx_email_unique' })

    // Index 2: Role
    // - Mục đích: Query nhanh users theo role (admin, user)
    // - Hữu ích cho admin dashboard: lấy tất cả admins
    await collection.createIndex({ role: 1 }, { name: 'idx_role' })

    // Index 3: isBlocked
    // - Mục đích: Query nhanh users bị block
    // - Sparse: chỉ index documents có field isBlocked
    await collection.createIndex({ isBlocked: 1 }, { name: 'idx_is_blocked', sparse: true })

    // Index 4: refreshToken (cho logout/token revocation)
    // - Mục đích: Tìm nhanh user theo refreshToken
    // - Sparse: không phải user nào cũng có refreshToken
    await collection.createIndex(
      { refreshToken: 1 },
      { name: 'idx_refresh_token', sparse: true }
    )

    console.log('[Auth Migration] Created indexes for users collection')
  },

  /**
   * DOWN: Xóa các indexes đã tạo
   * - Dùng khi cần rollback migration
   * - QUAN TRỌNG: Luôn viết down() để có thể rollback an toàn
   */
  down: async () => {
    const db = mongoose.connection.db
    if (!db) throw new Error('Database connection not established')

    const collection = db.collection('users')

    // Xóa các indexes (trừ _id index - không thể xóa)
    try {
      await collection.dropIndex('idx_email_unique')
    } catch (e) {
      /* Index might not exist */
    }
    try {
      await collection.dropIndex('idx_role')
    } catch (e) {
      /* Index might not exist */
    }
    try {
      await collection.dropIndex('idx_is_blocked')
    } catch (e) {
      /* Index might not exist */
    }
    try {
      await collection.dropIndex('idx_refresh_token')
    } catch (e) {
      /* Index might not exist */
    }

    console.log('[Auth Migration] Dropped indexes from users collection')
  }
}

// ============================================================================
// MIGRATION 002: Thêm default values cho existing users
// ============================================================================
const migration_002_add_default_values: MigrationDefinition = {
  name: '20251212_002_add_default_user_values',

  /**
   * UP: Set default values cho users cũ không có các fields mới
   *
   * Khi nào cần migration này?
   * - Khi thêm field mới vào schema
   * - Existing documents không có field đó
   * - Cần set default value cho chúng
   */
  up: async () => {
    const db = mongoose.connection.db
    if (!db) throw new Error('Database connection not established')

    const collection = db.collection('users')

    // Set role = 'user' cho users chưa có role
    const roleResult = await collection.updateMany(
      { role: { $exists: false } },
      { $set: { role: 'user' } }
    )
    console.log(`[Auth Migration] Set default role for ${roleResult.modifiedCount} users`)

    // Set isBlocked = false cho users chưa có field này
    const blockedResult = await collection.updateMany(
      { isBlocked: { $exists: false } },
      { $set: { isBlocked: false } }
    )
    console.log(`[Auth Migration] Set default isBlocked for ${blockedResult.modifiedCount} users`)
  },

  down: async () => {
    // Không cần rollback vì không xóa data
    // Chỉ unset các fields nếu thực sự cần
    console.log('[Auth Migration] No rollback needed for default values')
  }
}

// ============================================================================
// DANH SÁCH TẤT CẢ MIGRATIONS
// ============================================================================
export const migrations: MigrationDefinition[] = [
  migration_001_create_indexes,
  migration_002_add_default_values
]

// ============================================================================
// EXPORTED FUNCTIONS
// ============================================================================

/**
 * Chạy tất cả pending migrations
 */
export async function runAuthMigrations(): Promise<number> {
  return runMigrations(migrations)
}

/**
 * Rollback migration cuối cùng
 */
export async function rollbackAuthMigration(): Promise<string | null> {
  return rollbackLastMigration(migrations)
}
