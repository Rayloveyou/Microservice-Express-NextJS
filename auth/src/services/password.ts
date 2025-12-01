import { scrypt, randomBytes } from 'crypto'
import { promisify } from 'util' // to convert callback-based functions to promise-based

// Convert scrypt (callback-based) thành promise-based để dùng async/await
const scryptAsync = promisify(scrypt) // convert scrypt to return a promise

// ============================================================================
// CLASS PASSWORD - Utility để hash và compare password
// ============================================================================
export class Password {
  // ========================================================================
  // METHOD 1: toHash - Mã hóa password thành chuỗi hash
  // ========================================================================
  // Flow:
  // 1. Tạo random salt (8 bytes) để mỗi user có hash khác nhau dù password giống nhau
  // 2. Dùng scrypt để hash password với salt → tạo ra buffer 64 bytes
  // 3. Convert buffer thành hex string
  // 4. Kết hợp: hashedPassword.salt (ngăn cách bởi dấu chấm)
  //
  // Ví dụ output: "a1b2c3d4e5f6...12345678" (hash.salt)
  static async toHash(password: string) {
    // Tạo salt ngẫu nhiên 8 bytes, convert sang hex (16 ký tự)
    // Salt khác nhau mỗi lần → cùng password sẽ có hash khác nhau
    const salt = randomBytes(8).toString('hex')

    // Hash password với salt, tạo buffer 64 bytes
    // scrypt(password, salt, keyLength)
    const buf = (await scryptAsync(password, salt, 64)) as Buffer // scrypt returns Buffer

    // Trả về format: "hashedPassword.salt"
    // Lưu cả hash VÀ salt để sau này compare được
    return `${buf.toString('hex')}.${salt}`
  }

  // ========================================================================
  // METHOD 2: compare - So sánh password người dùng nhập với hash đã lưu
  // ========================================================================
  // Flow:
  // 1. Tách storedPassword thành [hashedPassword, salt]
  // 2. Dùng CHÍNH salt đã lưu để hash lại suppliedPassword
  // 3. So sánh hash mới với hash đã lưu
  // 4. Nếu giống nhau → password đúng
  //
  // Ví dụ:
  // - storedPassword: "a1b2c3...12345678" (từ DB)
  // - suppliedPassword: "mypassword" (user nhập)
  // → Hash "mypassword" với salt "12345678"
  // → So sánh kết quả với "a1b2c3..."
  static async compare(storedPassword: string, suppliedPassword: string) {
    // Tách chuỗi "hashedPassword.salt" thành 2 phần
    const [hashedPassword, salt] = storedPassword.split('.')

    // Nếu không có salt (format sai) → trả về false
    if (!salt) {
      return false
    }

    // Hash lại suppliedPassword với CHÍNH salt đã lưu
    // (salt giống nhau → password giống nhau sẽ cho hash giống nhau)
    const buf = (await scryptAsync(suppliedPassword, salt, 64)) as Buffer

    // So sánh hash mới với hash đã lưu
    // Nếu giống nhau → password đúng
    return buf.toString('hex') === hashedPassword
  }
}

// ============================================================================
// TẠI SAO PHẢI LƯU SALT CÙNG HASH?
// ============================================================================
// - Salt là random → mỗi lần hash sẽ khác nhau
// - Khi compare, PHẢI dùng chính salt đã dùng lúc hash
// - Nếu không lưu salt → không thể verify password
//
// Format lưu: "hash.salt"
// - hash: kết quả mã hóa (128 ký tự hex từ 64 bytes)
// - salt: chuỗi ngẫu nhiên (16 ký tự hex từ 8 bytes)
// ============================================================================

// ============================================================================
// VÍ DỤ SỬ DỤNG:
// ============================================================================
// // 1. Hash password khi user đăng ký
// const hashed = await Password.toHash('mypassword123')
// // → "a1b2c3d4e5f6...89abcdef" (lưu vào DB)
//
// // 2. Compare password khi user đăng nhập
// const isValid = await Password.compare(hashed, 'mypassword123')
// // → true (nếu password đúng)
//
// const isInvalid = await Password.compare(hashed, 'wrongpassword')
// // → false (nếu password sai)
// ============================================================================
