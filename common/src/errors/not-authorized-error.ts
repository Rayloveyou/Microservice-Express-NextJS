import { CustomError } from './custom-error.js'

export class NotAuthorizedError extends CustomError {
  statusCode = 401
  reason = 'Not authorized'

  constructor() {
    super('Not authorized')

    // Vì chúng ta kế thừa từ built-in class (Error) nên cần set lại prototype
    // để nói rằng object hiện tại thuộc về NotAuthorizedError chứ không phải CustomError
    Object.setPrototypeOf(this, NotAuthorizedError.prototype)
  }

  // using serializeErrors to format errors for response
  serializeErrors() {
    return [{ message: this.reason }]
  }
}
