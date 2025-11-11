import { CustomError } from "./custom-error.js"

export class DatabaseConnectionError extends CustomError {
    statusCode = 500
    reason = 'Error connecting to database'

    constructor() {
        super('Error connecting to database')

        // Vì chúng ta kế thừa từ built-in class (Error) nên cần set lại prototype
        // để nói rằng object hiện tại thuộc về DatabaseConnectionError chứ không phải CustomError
        Object.setPrototypeOf(this, DatabaseConnectionError.prototype)
    }
    
    // using serializeErrors to format errors for response
    serializeErrors() {
        return [{ message: this.reason }]
    }
}