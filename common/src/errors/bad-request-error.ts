import { CustomError } from "./custom-error.js"

export class BadRequestError extends CustomError {
    statusCode = 400

    constructor(public message: string) {
        super(message)

        // Vì chúng ta kế thừa từ built-in class (Error) nên cần set lại prototype
        // để nói rằng object hiện tại thuộc về BadRequestError chứ không phải CustomError
        Object.setPrototypeOf(this, BadRequestError.prototype)
    }
    
    // using serializeErrors to format errors for response
    serializeErrors() {
        return [{ message: this.message }]
    }
}