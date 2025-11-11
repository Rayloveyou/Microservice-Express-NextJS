import { Request, Response, NextFunction } from 'express'
import * as jwt from 'jsonwebtoken'

// Define an interface for the payload structure
interface UserPayload {
    id: string;
    email: string;
}

// Extend Express Request interface to include currentUser property
declare global {
    namespace Express {
        interface Request {
            currentUser?: UserPayload; // optional property
            // cookie-session will attach a `session` object at runtime; declare a minimal shape
            // cookie-session sets `req.session = null` to clear the session, so allow null here
            session?: { jwt?: string } | null
        }
    }
}

const currentUser = (req: Request, res: Response, next: NextFunction) => {
    // Nếu không có jwt trong session, trả về currentUser: null
    if (!req.session?.jwt) {
        return next()
    }

    try {
        // Xác thực JWT và lấy payload
        const payload = jwt.verify(req.session.jwt, process.env.JWT_KEY!) as UserPayload

        // Gán payload vào req.currentUser
        req.currentUser = payload
    } catch (err) {}

    next()
}

export { currentUser }