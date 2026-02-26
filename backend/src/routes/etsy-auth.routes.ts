import { Router, Request, Response } from 'express';
import { env } from '../config/env';
import { AppDataSource } from '../config/database';
import { EtsyShop, ShopStatus } from '../entities/EtsyShop';
import { EtsyToken } from '../entities/EtsyToken';
import { authMiddleware } from '../middleware/auth';
import { generateCodeVerifier, generateCodeChallenge, generateState } from '../utils/pkce';
import { encrypt } from '../utils/crypto';
import { EtsyApiService } from '../services/etsy-api.service';
import redis from '../config/redis';

const router = Router();

// Store PKCE verifiers temporarily in Redis (5 min TTL)
const PKCE_PREFIX = 'etsy_pkce:';

// GET /api/etsy/connect - Start Etsy OAuth flow
router.get('/connect', authMiddleware, async (req: Request, res: Response) => {
    try {
        const codeVerifier = generateCodeVerifier();
        const codeChallenge = generateCodeChallenge(codeVerifier);
        const state = generateState();

        // Store verifier + userId in Redis
        await redis.set(
            `${PKCE_PREFIX}${state}`,
            JSON.stringify({ codeVerifier, userId: req.user!.userId }),
            'EX',
            300
        );

        const authUrl = new URL('https://www.etsy.com/oauth/connect');
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('client_id', env.etsy.apiKey);
        authUrl.searchParams.set('redirect_uri', env.etsy.redirectUri);
        authUrl.searchParams.set('scope', env.etsy.scopes);
        authUrl.searchParams.set('state', state);
        authUrl.searchParams.set('code_challenge', codeChallenge);
        authUrl.searchParams.set('code_challenge_method', 'S256');

        res.json({ authUrl: authUrl.toString() });
    } catch (error: any) {
        console.error('Etsy connect error:', error);
        res.status(500).json({ error: 'Failed to initiate Etsy OAuth' });
    }
});

// GET /api/etsy/callback - Etsy OAuth callback
router.get('/callback', async (req: Request, res: Response) => {
    try {
        const { code, state, error } = req.query;

        if (error) {
            res.redirect(`${env.appUrl}/shops?error=${error}`);
            return;
        }

        if (!code || !state) {
            res.redirect(`${env.appUrl}/shops?error=missing_params`);
            return;
        }

        // Retrieve PKCE data from Redis
        const pkceData = await redis.get(`${PKCE_PREFIX}${state}`);
        if (!pkceData) {
            res.redirect(`${env.appUrl}/shops?error=invalid_state`);
            return;
        }

        const { codeVerifier, userId } = JSON.parse(pkceData);
        await redis.del(`${PKCE_PREFIX}${state}`);

        // Exchange code for tokens
        const tokenResponse = await EtsyApiService.exchangeCodeForToken(
            code as string,
            codeVerifier
        );

        // Get user/shop info from Etsy
        const etsyUser = await EtsyApiService.getUser(tokenResponse.access_token);
        const shops = await EtsyApiService.getUserShops(
            tokenResponse.access_token,
            etsyUser.user_id
        );

        if (!shops || shops.length === 0) {
            res.redirect(`${env.appUrl}/shops?error=no_shops`);
            return;
        }

        const shopRepo = AppDataSource.getRepository(EtsyShop);
        const tokenRepo = AppDataSource.getRepository(EtsyToken);

        // Save each shop
        for (const etsyShop of shops) {
            let shop = await shopRepo.findOne({
                where: { etsyShopId: etsyShop.shop_id },
            });

            if (!shop) {
                shop = shopRepo.create({
                    userId,
                    etsyShopId: etsyShop.shop_id,
                    shopName: etsyShop.shop_name,
                    etsyUserId: etsyUser.user_id,
                    shopUrl: etsyShop.url,
                    shopIcon: etsyShop.icon_url_fullxfull,
                    status: ShopStatus.ACTIVE,
                });
                await shopRepo.save(shop);
            } else {
                shop.status = ShopStatus.ACTIVE;
                shop.shopName = etsyShop.shop_name;
                await shopRepo.save(shop);
            }

            // Save/update token
            let token = await tokenRepo.findOne({ where: { shopId: shop.id } });
            if (!token) {
                token = tokenRepo.create({ shopId: shop.id });
            }

            token.accessTokenEncrypted = encrypt(tokenResponse.access_token);
            token.refreshTokenEncrypted = encrypt(tokenResponse.refresh_token);
            token.expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);
            token.scopes = env.etsy.scopes;
            await tokenRepo.save(token);
        }

        res.redirect(`${env.appUrl}/shops?connected=true`);
    } catch (error: any) {
        console.error('Etsy callback error:', error);
        res.redirect(`${env.appUrl}/shops?error=callback_failed`);
    }
});

export default router;
