import { Request, Response, NextFunction } from 'express'
import { NotAuthorizedError } from '../errors/not-authorized-error'
import { isUserRevoked } from '../services/revocation'

// Middleware để bảo vệ API khỏi user đã bị revoke/block.
// - Nếu không có currentUser => bỏ qua (route có thể tự requireAuth nếu cần).
// - Nếu userId nằm trong danh sách revoked trên Redis => throw NotAuthorizedError.
export const requireNotRevoked = async (req: Request, _res: Response, next: NextFunction) => {
  if (!req.currentUser) {
    return next()
  }

  const revoked = await isUserRevoked(req.currentUser.id)
  if (revoked) {
    throw new NotAuthorizedError()
  }

  next()
}

