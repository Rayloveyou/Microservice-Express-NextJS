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

    // Helper: tạo index an toàn, skip nếu đã tồn tại
    const safeCreateIndex = async (
      keys: Record<string, 1 | -1 | 'text'>,
      options: { name: string; unique?: boolean; sparse?: boolean }
    ) => {
      try {
        await collection.createIndex(keys, options)
        console.log(`[Auth Migration] Created index: ${options.name}`)
      } catch (err: any) {
        // Error code 85: IndexOptionsConflict - index đã tồn tại với tên khác
        // Error code 86: IndexKeySpecsConflict
        if (err.code === 85 || err.code === 86) {
          console.log(`[Auth Migration] Index already exists (skipping): ${options.name}`)
        } else {
          throw err
        }
      }
    }

    // Index 1: Email (unique)
    // - Mongoose có thể đã tạo email_1 index tự động
    // - Nếu đã có, skip để tránh conflict
    await safeCreateIndex({ email: 1 }, { unique: true, name: 'idx_email_unique' })

    // Index 2: Role
    await safeCreateIndex({ role: 1 }, { name: 'idx_role' })

    // Index 3: isBlocked
    await safeCreateIndex({ isBlocked: 1 }, { name: 'idx_is_blocked', sparse: true })

    // Index 4: refreshToken
    await safeCreateIndex({ refreshToken: 1 }, { name: 'idx_refresh_token', sparse: true })

    console.log('[Auth Migration] Finished creating indexes for users collection')
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
