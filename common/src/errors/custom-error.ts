export abstract class CustomError extends Error { // extend built-in Error class
    abstract statusCode: number // ← Bắt buộc có statusCode

    constructor(message: string) {
        super(message)

        // Vì chúng ta kế thừa từ built-in class (Error) nên cần set lại prototype
        // để nói rằng object hiện tại thuộc về CustomError chứ không phải Error
        Object.setPrototypeOf(this, CustomError.prototype)
    }
    
    abstract serializeErrors(): Array<{ // ← Bắt buộc implement func for formatting errors
        message: string
        field?: string
    }>
}



