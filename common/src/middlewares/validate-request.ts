import { Request, Response, NextFunction } from 'express'
import { validationResult } from 'express-validator'
import { RequestValidationError } from '../errors/request-validation-error'

const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    // if validation errors exist
    throw new RequestValidationError(errors.array()) // throw custom error
  }

  next() // proceed to the next middleware/route handler
}

export { validateRequest }
