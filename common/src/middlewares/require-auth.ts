import { Request, Response, NextFunction } from 'express'
import { NotAuthorizedError } from '../errors/not-authorized-error'

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  // Nếu không có currentUser (đã được middleware currentUser gán vào)
  if (!req.currentUser) {
    throw new NotAuthorizedError()
  }

  next() // Người dùng đã xác thực, tiếp tục
}

export { requireAuth }
