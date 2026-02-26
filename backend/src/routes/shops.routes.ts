import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { EtsyShop, ShopStatus } from '../entities/EtsyShop';
import { authMiddleware } from '../middleware/auth';
import { requireManager } from '../middleware/rbac';
import { EtsyApiService } from '../services/etsy-api.service';
import { ProductSyncService } from '../services/product-sync.service';
import { OrderSyncService } from '../services/order-sync.service';

const router = Router();
const shopRepo = () => AppDataSource.getRepository(EtsyShop);

// GET /api/shops - List all connected shops
router.get('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const shops = await shopRepo().find({
            order: { createdAt: 'DESC' },
            select: ['id', 'etsyShopId', 'shopName', 'etsyUserId', 'shopUrl', 'shopIcon', 'status', 'lastSyncAt', 'telegramEnabled', 'emailEnabled', 'createdAt'],
        });
        res.json({ shops });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/shops/:id - Get shop details
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const shop = await shopRepo().findOne({
            where: { id: req.params.id as string },
            relations: ['user'],
        });
        if (!shop) {
            res.status(404).json({ error: 'Shop not found' });
            return;
        }
        res.json({ shop });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// PATCH /api/shops/:id - Update shop settings (notifications)
router.patch('/:id', authMiddleware, requireManager, async (req: Request, res: Response) => {
    try {
        const shop = await shopRepo().findOneBy({ id: req.params.id as string });
        if (!shop) {
            res.status(404).json({ error: 'Shop not found' });
            return;
        }

        const { telegramEnabled, telegramChatId, emailEnabled, notificationEmail } = req.body;

        if (telegramEnabled !== undefined) shop.telegramEnabled = telegramEnabled;
        if (telegramChatId !== undefined) shop.telegramChatId = telegramChatId;
        if (emailEnabled !== undefined) shop.emailEnabled = emailEnabled;
        if (notificationEmail !== undefined) shop.notificationEmail = notificationEmail;

        await shopRepo().save(shop);
        res.json({ shop });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/shops/:id/sync - Trigger full sync
router.post('/:id/sync', authMiddleware, requireManager, async (req: Request, res: Response) => {
    try {
        const shop = await shopRepo().findOneBy({ id: req.params.id as string });
        if (!shop) {
            res.status(404).json({ error: 'Shop not found' });
            return;
        }

        const [productCount, orderCount] = await Promise.all([
            ProductSyncService.syncShopProducts(shop),
            OrderSyncService.syncShopOrders(shop),
        ]);

        res.json({
            message: 'Sync completed',
            synced: { products: productCount, orders: orderCount },
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/shops/:id - Disconnect shop
router.delete('/:id', authMiddleware, requireManager, async (req: Request, res: Response) => {
    try {
        const shop = await shopRepo().findOneBy({ id: req.params.id as string });
        if (!shop) {
            res.status(404).json({ error: 'Shop not found' });
            return;
        }

        shop.status = ShopStatus.INACTIVE;
        await shopRepo().save(shop);

        res.json({ message: 'Shop disconnected' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
