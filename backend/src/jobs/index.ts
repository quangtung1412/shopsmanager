import Bull from 'bull';
import { env } from '../config/env';
import { AppDataSource } from '../config/database';
import { EtsyShop, ShopStatus } from '../entities/EtsyShop';
import { OrderSyncService } from '../services/order-sync.service';
import { ProductSyncService } from '../services/product-sync.service';
import { EtsyApiService } from '../services/etsy-api.service';

const redisConfig = {
    host: env.redis.host,
    port: env.redis.port,
    password: env.redis.password,
};

// ---- Order Sync Job (every 15 minutes) ----
export const orderSyncQueue = new Bull('order-sync', { redis: redisConfig });

orderSyncQueue.process(async (job) => {
    console.log('🔄 Starting order sync job...');
    const shopRepo = AppDataSource.getRepository(EtsyShop);
    const shops = await shopRepo.find({ where: { status: ShopStatus.ACTIVE } });

    let totalSynced = 0;
    for (const shop of shops) {
        try {
            // Sync orders from last 24 hours
            const fromTimestamp = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
            const count = await OrderSyncService.syncShopOrders(shop, { fromTimestamp });
            totalSynced += count;
            console.log(`  ✅ Shop ${shop.shopName}: ${count} orders synced`);
        } catch (error: any) {
            console.error(`  ❌ Shop ${shop.shopName}: ${error.message}`);
        }
    }

    return { totalSynced, shopCount: shops.length };
});

// ---- Product Sync Job (every 30 minutes) ----
export const productSyncQueue = new Bull('product-sync', { redis: redisConfig });

productSyncQueue.process(async (job) => {
    console.log('🔄 Starting product sync job...');
    const shopRepo = AppDataSource.getRepository(EtsyShop);
    const shops = await shopRepo.find({ where: { status: ShopStatus.ACTIVE } });

    let totalSynced = 0;
    for (const shop of shops) {
        try {
            const count = await ProductSyncService.syncShopProducts(shop);
            totalSynced += count;
            console.log(`  ✅ Shop ${shop.shopName}: ${count} products synced`);
        } catch (error: any) {
            console.error(`  ❌ Shop ${shop.shopName}: ${error.message}`);
        }
    }

    return { totalSynced, shopCount: shops.length };
});

// ---- Token Refresh Job (every 45 minutes) ----
export const tokenRefreshQueue = new Bull('token-refresh', { redis: redisConfig });

tokenRefreshQueue.process(async (job) => {
    console.log('🔄 Starting token refresh job...');
    const shopRepo = AppDataSource.getRepository(EtsyShop);
    const shops = await shopRepo.find({
        where: { status: ShopStatus.ACTIVE },
        relations: ['token'],
    });

    let refreshed = 0;
    for (const shop of shops) {
        try {
            if (!shop.token) continue;

            // Refresh if token expires in less than 60 minutes
            const expiresIn = new Date(shop.token.expiresAt).getTime() - Date.now();
            if (expiresIn < 60 * 60 * 1000) {
                await EtsyApiService.refreshAccessToken(shop);
                refreshed++;
                console.log(`  🔑 Refreshed token for ${shop.shopName}`);
            }
        } catch (error: any) {
            console.error(`  ❌ Token refresh failed for ${shop.shopName}: ${error.message}`);
            shop.status = ShopStatus.TOKEN_EXPIRED;
            await shopRepo.save(shop);
        }
    }

    return { refreshed, shopCount: shops.length };
});

// ---- Schedule Jobs ----
export async function initJobs(): Promise<void> {
    // Clean existing repeatable jobs
    await orderSyncQueue.obliterate({ force: true }).catch(() => { });
    await productSyncQueue.obliterate({ force: true }).catch(() => { });
    await tokenRefreshQueue.obliterate({ force: true }).catch(() => { });

    // Schedule recurring jobs
    await orderSyncQueue.add({}, {
        repeat: { cron: '*/15 * * * *' }, // Every 15 minutes
        removeOnComplete: 10,
        removeOnFail: 5,
    });

    await productSyncQueue.add({}, {
        repeat: { cron: '*/30 * * * *' }, // Every 30 minutes
        removeOnComplete: 10,
        removeOnFail: 5,
    });

    await tokenRefreshQueue.add({}, {
        repeat: { cron: '*/45 * * * *' }, // Every 45 minutes
        removeOnComplete: 10,
        removeOnFail: 5,
    });

    console.log('✅ Bull jobs scheduled');
}
