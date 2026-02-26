import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../entities/User';

export function requireRole(...roles: UserRole[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        if (!roles.includes(req.user.role as UserRole)) {
            res.status(403).json({ error: 'Insufficient permissions' });
            return;
        }

        next();
    };
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
    return requireRole(UserRole.ADMIN)(req, res, next);
}

export function requireManager(req: Request, res: Response, next: NextFunction): void {
    return requireRole(UserRole.ADMIN, UserRole.MANAGER)(req, res, next);
}
