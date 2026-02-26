import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AuthPayload {
    userId: string;
    email: string;
    role: string;
}

declare global {
    namespace Express {
        // eslint-disable-next-line @typescript-eslint/no-empty-interface
        interface User extends AuthPayload { }
    }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
    try {
        // Check Authorization header
        const authHeader = req.headers.authorization;
        let token: string | undefined;

        if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.slice(7);
        }

        // Fallback to cookie
        if (!token) {
            token = req.cookies?.accessToken;
        }

        if (!token) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        const payload = jwt.verify(token, env.jwt.secret) as AuthPayload;
        req.user = payload;
        next();
    } catch (error: any) {
        if (error.name === 'TokenExpiredError') {
            res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
            return;
        }
        res.status(401).json({ error: 'Invalid token' });
    }
}

export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
    try {
        const authHeader = req.headers.authorization;
        let token: string | undefined;

        if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.slice(7);
        }

        if (!token) {
            token = req.cookies?.accessToken;
        }

        if (token) {
            req.user = jwt.verify(token, env.jwt.secret) as AuthPayload;
        }
    } catch {
        // Ignore errors for optional auth
    }
    next();
}
