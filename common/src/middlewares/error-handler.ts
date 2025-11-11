import { Request, Response, NextFunction } from 'express'
import { CustomError } from '../errors/custom-error'

const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    
    // check xem có phải con cháu của CustomError không
    if (err instanceof CustomError) {
        return res.status(err.statusCode).send({ errors: err.serializeErrors() });
    }

    // Generic error handler for other types of errors
    res.status(400).send({
       errors: [{ message: 'Something went wrong' }]
    })
}

export { errorHandler }