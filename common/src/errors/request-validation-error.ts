import { ValidationError } from 'express-validator'
import { CustomError } from './custom-error.js'

// Custom Error Class để handle validation errors specifically
export class RequestValidationError extends CustomError {
  statusCode = 400
  // 🎯 PHÂN BIỆT LOẠI LỖI: Đây là validation error, không phải generic error

  // 🧬 KẾ THỪA TỪ ERROR CLASS:
  // - this.name (string)
  // - this.message (string)
  // - this.stack (string) - stack trace

  // 📦 THÊM THUỘC TÍNH RIÊNG:
  // - this.errors (ValidationError[]) - chi tiết validation errors

  constructor(public errors: ValidationError[]) {
    // Nhận vào array của ValidationError từ express-validator
    super('Invalid request parameters') // 🔗 Gọi constructor của Error class cha

    Object.setPrototypeOf(this, RequestValidationError.prototype)
  }
  // using serializeErrors to format errors for response
  serializeErrors() {
    return this.errors.map(err => {
      if (err.type === 'field') {
        return { message: err.msg, field: err.path }
      }
      return { message: err.msg, field: 'unknown' }
    })
  }
}
