import axios, { AxiosInstance } from 'axios';
import { env } from '../config/env';
import { AppDataSource } from '../config/database';
import { EtsyToken } from '../entities/EtsyToken';
import { EtsyShop, ShopStatus } from '../entities/EtsyShop';
import { encrypt, decrypt } from '../utils/crypto';
import { redis } from '../config/redis';

// Etsy ToS §4: default 10,000 API calls/day per API key
const DAILY_CALL_LIMIT = 10_000;
const DAILY_CALL_WARN  = 9_000;

async function checkDailyRateLimit(): Promise<void> {
    const day  = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const key  = `etsy:api_calls:${day}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 86400); // expire at end of day
    if (count > DAILY_CALL_LIMIT) {
        throw new Error(
            `Etsy API daily rate limit reached (${count}/${DAILY_CALL_LIMIT}). ` +
            'Requests are paused until midnight UTC. ' +
            'Contact developer@etsy.com to request a higher quota.'
        );
    }
    if (count >= DAILY_CALL_WARN) {
        console.warn(
            `⚠️  Etsy API daily calls: ${count}/${DAILY_CALL_LIMIT} — ` +
            'approaching limit. Consider contacting developer@etsy.com for a quota increase.'
        );
    }
}

const ETSY_API_BASE = 'https://api.etsy.com/v3/application';
const ETSY_TOKEN_URL = 'https://api.etsy.com/v3/public/oauth/token';

interface EtsyTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
}

export class EtsyApiService {
    private static getClient(accessToken: string): AxiosInstance {
        return axios.create({
            baseURL: ETSY_API_BASE,
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'x-api-key': env.etsy.apiKey,
            },
            timeout: 30000,
        });
    }

    static getPublicClient(): AxiosInstance {
        return axios.create({
            baseURL: ETSY_API_BASE,
            headers: {
                'x-api-key': env.etsy.apiKey,
            },
            timeout: 30000,
        });
    }

    // ---- OAuth Token Management ----

    static async exchangeCodeForToken(code: string, codeVerifier: string): Promise<EtsyTokenResponse> {
        const response = await axios.post(ETSY_TOKEN_URL, {
            grant_type: 'authorization_code',
            client_id: env.etsy.apiKey,
            redirect_uri: env.etsy.redirectUri,
            code,
            code_verifier: codeVerifier,
        });
        return response.data;
    }

    static async refreshAccessToken(shop: EtsyShop): Promise<string> {
        const tokenRepo = AppDataSource.getRepository(EtsyToken);
        const token = await tokenRepo.findOne({ where: { shopId: shop.id } });

        if (!token) {
            throw new Error(`No token found for shop ${shop.id}`);
        }

        const refreshToken = decrypt(token.refreshTokenEncrypted);

        const response = await axios.post(ETSY_TOKEN_URL, {
            grant_type: 'refresh_token',
            client_id: env.etsy.apiKey,
            refresh_token: refreshToken,
        });

        const data: EtsyTokenResponse = response.data;

        token.accessTokenEncrypted = encrypt(data.access_token);
        token.refreshTokenEncrypted = encrypt(data.refresh_token);
        token.expiresAt = new Date(Date.now() + data.expires_in * 1000);
        await tokenRepo.save(token);

        return data.access_token;
    }

    static async getAccessToken(shop: EtsyShop): Promise<string> {
        const tokenRepo = AppDataSource.getRepository(EtsyToken);
        const token = await tokenRepo.findOne({ where: { shopId: shop.id } });

        if (!token) {
            throw new Error(`No token found for shop ${shop.id}`);
        }

        // Refresh if token expires in less than 5 minutes
        if (new Date(token.expiresAt).getTime() - Date.now() < 5 * 60 * 1000) {
            return this.refreshAccessToken(shop);
        }

        return decrypt(token.accessTokenEncrypted);
    }

    // ---- API Calls with Auto-retry ----

    private static async callWithRetry<T>(
        shop: EtsyShop,
        apiCall: (client: AxiosInstance) => Promise<T>,
        retries = 3
    ): Promise<T> {
        // Etsy ToS §4: enforce 10,000 calls/day limit
        await checkDailyRateLimit();
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const accessToken = await this.getAccessToken(shop);
                const client = this.getClient(accessToken);
                return await apiCall(client);
            } catch (error: any) {
                if (error.response?.status === 429 && attempt < retries) {
                    const retryAfter = parseInt(error.response.headers['retry-after'] || '5', 10);
                    await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
                    continue;
                }
                if (error.response?.status === 401 && attempt < retries) {
                    // Token might be expired, force refresh
                    try {
                        await this.refreshAccessToken(shop);
                        continue;
                    } catch {
                        const shopRepo = AppDataSource.getRepository(EtsyShop);
                        shop.status = ShopStatus.TOKEN_EXPIRED;
                        await shopRepo.save(shop);
                        throw error;
                    }
                }
                throw error;
            }
        }
        throw new Error('Max retries exceeded');
    }

    // ---- User & Shop ----

    static async getUser(accessToken: string): Promise<any> {
        const client = this.getClient(accessToken);
        const response = await client.get('/users/me');
        return response.data;
    }

    static async getUserShops(accessToken: string, userId: number): Promise<any[]> {
        const client = this.getClient(accessToken);
        const response = await client.get(`/users/${userId}/shops`);
        return response.data.results || [];
    }

    static async getShop(shop: EtsyShop): Promise<any> {
        return this.callWithRetry(shop, async (client) => {
            const response = await client.get(`/shops/${shop.etsyShopId}`);
            return response.data;
        });
    }

    // ---- Listings (Products) ----

    static async getShopListings(
        shop: EtsyShop,
        params: { limit?: number; offset?: number; state?: string } = {}
    ): Promise<any> {
        return this.callWithRetry(shop, async (client) => {
            const response = await client.get(`/shops/${shop.etsyShopId}/listings`, { params: { limit: 100, ...params } });
            return response.data;
        });
    }

    static async getListing(shop: EtsyShop, listingId: number): Promise<any> {
        return this.callWithRetry(shop, async (client) => {
            const response = await client.get(`/listings/${listingId}`, {
                params: { includes: 'images,inventory' },
            });
            return response.data;
        });
    }

    static async createListing(shop: EtsyShop, data: any): Promise<any> {
        return this.callWithRetry(shop, async (client) => {
            const response = await client.post(`/shops/${shop.etsyShopId}/listings`, data);
            return response.data;
        });
    }

    static async updateListing(shop: EtsyShop, listingId: number, data: any): Promise<any> {
        return this.callWithRetry(shop, async (client) => {
            const response = await client.patch(`/listings/${listingId}`, data);
            return response.data;
        });
    }

    static async deleteListing(shop: EtsyShop, listingId: number): Promise<void> {
        return this.callWithRetry(shop, async (client) => {
            await client.delete(`/listings/${listingId}`);
        });
    }

    static async uploadListingImage(
        shop: EtsyShop,
        listingId: number,
        imageBuffer: Buffer,
        filename: string
    ): Promise<any> {
        return this.callWithRetry(shop, async (client) => {
            const FormData = (await import('form-data')).default;
            const form = new FormData();
            form.append('image', imageBuffer, { filename });

            const response = await client.post(
                `/shops/${shop.etsyShopId}/listings/${listingId}/images`,
                form,
                { headers: form.getHeaders() }
            );
            return response.data;
        });
    }

    static async getListingInventory(shop: EtsyShop, listingId: number): Promise<any> {
        return this.callWithRetry(shop, async (client) => {
            const response = await client.get(`/listings/${listingId}/inventory`);
            return response.data;
        });
    }

    // ---- Receipts (Orders) ----

    static async getShopReceipts(
        shop: EtsyShop,
        params: { limit?: number; offset?: number; min_created?: number; was_paid?: boolean } = {}
    ): Promise<any> {
        return this.callWithRetry(shop, async (client) => {
            const response = await client.get(`/shops/${shop.etsyShopId}/receipts`, {
                params: { limit: 100, ...params },
            });
            return response.data;
        });
    }

    static async getReceipt(shop: EtsyShop, receiptId: number): Promise<any> {
        return this.callWithRetry(shop, async (client) => {
            const response = await client.get(`/shops/${shop.etsyShopId}/receipts/${receiptId}`);
            return response.data;
        });
    }

    static async createShipment(
        shop: EtsyShop,
        receiptId: number,
        data: { tracking_code: string; carrier_name: string; send_bcc?: boolean }
    ): Promise<any> {
        return this.callWithRetry(shop, async (client) => {
            const response = await client.post(
                `/shops/${shop.etsyShopId}/receipts/${receiptId}/tracking`,
                data
            );
            return response.data;
        });
    }

    // ---- Transactions ----

    static async getShopTransactions(
        shop: EtsyShop,
        params: { limit?: number; offset?: number } = {}
    ): Promise<any> {
        return this.callWithRetry(shop, async (client) => {
            const response = await client.get(`/shops/${shop.etsyShopId}/transactions`, {
                params: { limit: 100, ...params },
            });
            return response.data;
        });
    }

    // ---- Payments ----

    static async getLedgerEntries(
        shop: EtsyShop,
        params: { limit?: number; offset?: number; min_created?: number; max_created?: number } = {}
    ): Promise<any> {
        return this.callWithRetry(shop, async (client) => {
            const response = await client.get(
                `/shops/${shop.etsyShopId}/payment-account/ledger-entries`,
                { params: { limit: 100, ...params } }
            );
            return response.data;
        });
    }
}
