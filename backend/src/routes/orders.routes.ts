import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Order } from '../entities/Order';
import { EtsyShop } from '../entities/EtsyShop';
import { authMiddleware } from '../middleware/auth';
import { requireManager } from '../middleware/rbac';
import { EtsyApiService } from '../services/etsy-api.service';
import { OrderSyncService } from '../services/order-sync.service';

const router = Router();
const orderRepo = () => AppDataSource.getRepository(Order);
const shopRepo = () => AppDataSource.getRepository(EtsyShop);

// GET /api/shops/:shopId/orders - List orders for a shop
router.get('/shops/:shopId/orders', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { shopId } = req.params;
        const { page = '1', limit = '20', status, from, to } = req.query;

        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);

        let query = orderRepo()
            .createQueryBuilder('o')
            .leftJoinAndSelect('o.items', 'items')
            .where('o.shopId = :shopId', { shopId });

        if (status) {
            query = query.andWhere('o.status = :status', { status });
        }
        if (from) {
            query = query.andWhere('o.paidAt >= :from', { from });
        }
        if (to) {
            query = query.andWhere('o.paidAt <= :to', { to });
        }

        const [orders, total] = await query
            .orderBy('o.paidAt', 'DESC')
            .skip((pageNum - 1) * limitNum)
            .take(limitNum)
            .getManyAndCount();

        res.json({
            orders,
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/orders - List all orders (across shops)
router.get('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { page = '1', limit = '20', status, from, to, search } = req.query;
        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);

        let query = orderRepo()
            .createQueryBuilder('o')
            .leftJoinAndSelect('o.items', 'items')
            .leftJoinAndSelect('o.shop', 'shop');

        if (status) query = query.andWhere('o.status = :status', { status });
        if (from) query = query.andWhere('o.paidAt >= :from', { from });
        if (to) query = query.andWhere('o.paidAt <= :to', { to });
        if (search) {
            query = query.andWhere(
                '(o.buyerName LIKE :search OR o.etsyReceiptId LIKE :search)',
                { search: `%${search}%` }
            );
        }

        const [orders, total] = await query
            .orderBy('o.paidAt', 'DESC')
            .skip((pageNum - 1) * limitNum)
            .take(limitNum)
            .getManyAndCount();

        res.json({ orders, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/orders/:id - Get order details
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const order = await orderRepo().findOne({
            where: { id: req.params.id as string },
            relations: ['items', 'items.productVariant', 'shop', 'invoices'],
        });

        if (!order) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }

        res.json({ order });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/orders/:id/tracking - Add tracking number
router.post('/:id/tracking', authMiddleware, requireManager, async (req: Request, res: Response) => {
    try {
        const order = await orderRepo().findOne({
            where: { id: req.params.id as string },
            relations: ['shop'],
        });

        if (!order) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }

        const { tracking_code, carrier_name } = req.body;

        // Push to Etsy
        await EtsyApiService.createShipment(order.shop, order.etsyReceiptId, {
            tracking_code,
            carrier_name,
            send_bcc: false,
        });

        // Update local
        order.trackingNumber = tracking_code;
        order.carrierName = carrier_name;
        order.shippedAt = new Date();
        await orderRepo().save(order);

        res.json({ order });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/shops/:shopId/orders/sync - Sync orders for a shop
router.post('/shops/:shopId/orders/sync', authMiddleware, requireManager, async (req: Request, res: Response) => {
    try {
        const shop = await shopRepo().findOneBy({ id: req.params.shopId as string });
        if (!shop) {
            res.status(404).json({ error: 'Shop not found' });
            return;
        }

        const count = await OrderSyncService.syncShopOrders(shop);
        res.json({ message: 'Orders synced', count });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
