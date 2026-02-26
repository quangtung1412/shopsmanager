import { Router, Request, Response } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../entities/User';
import { authMiddleware } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();
const userRepo = () => AppDataSource.getRepository(User);

// Configure Passport Google Strategy
passport.use(
    new GoogleStrategy(
        {
            clientID: env.google.clientId,
            clientSecret: env.google.clientSecret,
            callbackURL: env.google.callbackUrl,
        },
        async (_accessToken, _refreshToken, profile, done) => {
            try {
                const email = profile.emails?.[0]?.value;
                if (!email) {
                    return done(new Error('No email found in Google profile'));
                }

                let user = await userRepo().findOne({ where: { googleId: profile.id } });

                if (!user) {
                    // Check if first user → make admin
                    const userCount = await userRepo().count();
                    user = userRepo().create({
                        googleId: profile.id,
                        email,
                        name: profile.displayName || email,
                        avatar: profile.photos?.[0]?.value,
                        role: userCount === 0 ? UserRole.ADMIN : UserRole.VIEWER,
                    });
                    await userRepo().save(user);
                } else {
                    // Update name/avatar
                    user.name = profile.displayName || user.name;
                    user.avatar = profile.photos?.[0]?.value || user.avatar;
                    await userRepo().save(user);
                }

                return done(null, user as unknown as Express.User);
            } catch (err) {
                return done(err as Error);
            }
        }
    )
);

function generateTokens(user: User) {
    const payload = { userId: user.id, email: user.email, role: user.role };

    const accessToken = jwt.sign(payload, env.jwt.secret, {
        expiresIn: env.jwt.expiresIn as any,
    });

    const refreshToken = jwt.sign(
        { userId: user.id },
        env.jwt.refreshSecret,
        { expiresIn: env.jwt.refreshExpiresIn as any }
    );

    return { accessToken, refreshToken };
}

// GET /api/auth/google - Redirect to Google
router.get(
    '/google',
    authLimiter,
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        session: false,
        accessType: 'offline',
        prompt: 'select_account',
    })
);

// GET /api/auth/google/callback - Google callback
router.get(
    '/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/login?error=auth_failed' }),
    (req: Request, res: Response) => {
        const user = req.user as unknown as User;
        const { accessToken, refreshToken } = generateTokens(user);

        // Set refresh token as httpOnly cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: env.nodeEnv === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            path: '/api/auth',
        });

        // Redirect to frontend with access token
        res.redirect(`${env.appUrl}/auth/callback?token=${accessToken}`);
    }
);

// POST /api/auth/refresh - Refresh access token
router.post('/refresh', async (req: Request, res: Response) => {
    try {
        const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

        if (!refreshToken) {
            res.status(401).json({ error: 'Refresh token required' });
            return;
        }

        const payload = jwt.verify(refreshToken, env.jwt.refreshSecret) as { userId: string };
        const user = await userRepo().findOne({ where: { id: payload.userId } });

        if (!user || !user.isActive) {
            res.status(401).json({ error: 'User not found or inactive' });
            return;
        }

        const tokens = generateTokens(user);

        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: env.nodeEnv === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/api/auth',
        });

        res.json({ accessToken: tokens.accessToken, user: { id: user.id, email: user.email, name: user.name, role: user.role, avatar: user.avatar } });
    } catch {
        res.status(401).json({ error: 'Invalid refresh token' });
    }
});

// GET /api/auth/me - Get current user
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
    try {
        const user = await userRepo().findOne({ where: { id: req.user!.userId } });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        res.json({
            id: user.id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
            role: user.role,
        });
    } catch {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/auth/logout
router.post('/logout', (_req: Request, res: Response) => {
    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.json({ message: 'Logged out' });
});

export default router;
