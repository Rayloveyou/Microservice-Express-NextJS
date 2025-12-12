/**
 * Migration Runner - Hệ thống chạy database migrations
 *
 * === GIẢI THÍCH ===
 * Migration là gì?
 * - Migration là cách quản lý thay đổi database schema theo thời gian
 * - Mỗi migration là một "version" của database
 * - Cho phép rollback (quay lại) nếu có lỗi
 *
 * Tại sao cần Migration?
 * - Đồng bộ schema giữa các môi trường (dev, staging, production)
 * - Theo dõi lịch sử thay đổi database
 * - Tự động hóa việc setup database cho team members mới
 * - An toàn khi deploy: có thể rollback nếu có vấn đề
 *
 * Cách hoạt động:
 * 1. Mỗi migration có timestamp unique (ví dụ: 20251212_001)
 * 2. System lưu các migration đã chạy vào collection `_migrations`
 * 3. Khi chạy, chỉ những migration chưa chạy mới được thực thi
 * 4. Migrations chạy theo thứ tự timestamp (cũ → mới)
 */

import mongoose from 'mongoose'

// Schema lưu trữ lịch sử migrations đã chạy
const migrationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    executedAt: { type: Date, default: Date.now }
  },
  { collection: '_migrations' }
)

const Migration = mongoose.model('Migration', migrationSchema)

// Interface định nghĩa một migration
export interface MigrationDefinition {
  name: string // Tên migration (ví dụ: "20251212_001_create_indexes")
  up: () => Promise<void> // Hàm thực thi migration
  down: () => Promise<void> // Hàm rollback (optional nhưng nên có)
}

/**
 * Chạy tất cả migrations chưa được thực thi
 *
 * @param migrations - Danh sách các migration definitions
 * @returns Số lượng migrations đã chạy thành công
 */
export async function runMigrations(migrations: MigrationDefinition[]): Promise<number> {
  // Sắp xếp theo tên (timestamp đầu tiên → chạy theo thứ tự)
  const sortedMigrations = [...migrations].sort((a, b) => a.name.localeCompare(b.name))

  let executedCount = 0

  for (const migration of sortedMigrations) {
    // Kiểm tra migration đã chạy chưa
    const existing = await Migration.findOne({ name: migration.name })

    if (existing) {
      console.log(`[Migration] Skipping "${migration.name}" - already executed`)
      continue
    }

    try {
      console.log(`[Migration] Running "${migration.name}"...`)

      // Thực thi migration
      await migration.up()

      // Lưu vào database
      await Migration.create({ name: migration.name })

      console.log(`[Migration] ✓ Completed "${migration.name}"`)
      executedCount++
    } catch (error) {
      console.error(`[Migration] ✗ Failed "${migration.name}":`, error)
      throw error // Stop và throw để không chạy tiếp các migration sau
    }
  }

  if (executedCount === 0) {
    console.log('[Migration] No pending migrations')
  } else {
    console.log(`[Migration] Successfully executed ${executedCount} migration(s)`)
  }

  return executedCount
}

/**
 * Rollback migration cuối cùng
 *
 * @param migrations - Danh sách các migration definitions
 * @returns Tên migration đã rollback, hoặc null nếu không có gì để rollback
 */
export async function rollbackLastMigration(
  migrations: MigrationDefinition[]
): Promise<string | null> {
  // Tìm migration cuối cùng đã chạy
  const lastExecuted = await Migration.findOne().sort({ executedAt: -1 })

  if (!lastExecuted) {
    console.log('[Migration] No migrations to rollback')
    return null
  }

  // Tìm definition của migration đó
  const migrationDef = migrations.find(m => m.name === lastExecuted.name)

  if (!migrationDef) {
    console.error(`[Migration] Definition not found for "${lastExecuted.name}"`)
    throw new Error(`Migration definition not found: ${lastExecuted.name}`)
  }

  try {
    console.log(`[Migration] Rolling back "${lastExecuted.name}"...`)

    // Thực thi rollback
    await migrationDef.down()

    // Xóa record khỏi database
    await Migration.deleteOne({ name: lastExecuted.name })

    console.log(`[Migration] ✓ Rolled back "${lastExecuted.name}"`)
    return lastExecuted.name
  } catch (error) {
    console.error(`[Migration] ✗ Rollback failed "${lastExecuted.name}":`, error)
    throw error
  }
}

/**
 * Lấy trạng thái của tất cả migrations
 */
export async function getMigrationStatus(migrations: MigrationDefinition[]): Promise<
  Array<{
    name: string
    executed: boolean
    executedAt: Date | null
  }>
> {
  const executedMigrations = await Migration.find()
  const executedMap = new Map(executedMigrations.map(m => [m.name, m.executedAt]))

  return migrations.map(m => ({
    name: m.name,
    executed: executedMap.has(m.name),
    executedAt: executedMap.get(m.name) || null
  }))
}
