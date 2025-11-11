import { CustomError } from "./custom-error.js"

export class NotFoundError extends CustomError {
    statusCode = 404
    reason = 'Resource not found'

    constructor() {
        super('Resource not found')

        // Vì chúng ta kế thừa từ built-in class (Error) nên cần set lại prototype
        // để nói rằng object hiện tại thuộc về NotFoundError chứ không phải CustomError
        Object.setPrototypeOf(this, NotFoundError.prototype)
    }
    
    // using serializeErrors to format errors for response
    serializeErrors() {
        return [{ message: this.reason }]
    }
}