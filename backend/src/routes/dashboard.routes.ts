import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Order, OrderStatus } from '../entities/Order';
import { Product, ProductStatus } from '../entities/Product';
import { EtsyShop, ShopStatus } from '../entities/EtsyShop';
import { authMiddleware } from '../middleware/auth';
import { ProfitService } from '../services/profit.service';
import dayjs from 'dayjs';

const router = Router();

// GET /api/dashboard - Get dashboard summary
router.get('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const orderRepo = AppDataSource.getRepository(Order);
        const productRepo = AppDataSource.getRepository(Product);
        const shopRepo = AppDataSource.getRepository(EtsyShop);

        const today = dayjs().startOf('day').toDate();
        const tomorrow = dayjs().endOf('day').toDate();
        const thirtyDaysAgo = dayjs().subtract(30, 'day').startOf('day').toDate();

        // Today's stats
        const [todayOrders, todayRevenue] = await Promise.all([
            orderRepo
                .createQueryBuilder('o')
                .where('o.paidAt BETWEEN :from AND :to', { from: today, to: tomorrow })
                .getCount(),
            orderRepo
                .createQueryBuilder('o')
                .select('COALESCE(SUM(o.subtotal), 0)', 'total')
                .where('o.paidAt BETWEEN :from AND :to', { from: today, to: tomorrow })
                .getRawOne(),
        ]);

        // Overall stats
        const [totalProducts, activeShops, recentOrders] = await Promise.all([
            productRepo.count({ where: { status: ProductStatus.ACTIVE } }),
            shopRepo.count({ where: { status: ShopStatus.ACTIVE } }),
            orderRepo.find({
                order: { paidAt: 'DESC' },
                take: 10,
                relations: ['shop', 'items'],
            }),
        ]);

        // Profit summary (last 30 days)
        const profitSummary = await ProfitService.getProfitSummary(
            thirtyDaysAgo,
            tomorrow,
            'day'
        );

        // Shop stats
        const shopStats = await shopRepo
            .createQueryBuilder('s')
            .leftJoin('s.orders', 'o')
            .leftJoin('s.products', 'p')
            .select([
                's.id AS id',
                's.shopName AS shopName',
                's.shopIcon AS shopIcon',
                's.status AS status',
                's.lastSyncAt AS lastSyncAt',
                'COUNT(DISTINCT o.id) AS orderCount',
                'COUNT(DISTINCT p.id) AS productCount',
            ])
            .where('s.status = :status', { status: ShopStatus.ACTIVE })
            .groupBy('s.id')
            .getRawMany();

        // Today's profit
        const todayProfit = profitSummary
            .filter((s) => s.period === dayjs().format('YYYY-MM-DD'))
            .reduce((sum, s) => sum + s.profit, 0);

        res.json({
            today: {
                orders: todayOrders,
                revenue: parseFloat(todayRevenue?.total || '0'),
                profit: todayProfit,
            },
            overall: {
                activeProducts: totalProducts,
                activeShops,
            },
            recentOrders: recentOrders.map((o) => ({
                id: o.id,
                etsyReceiptId: o.etsyReceiptId,
                shopName: o.shop?.shopName,
                buyerName: o.buyerName,
                totalPrice: o.totalPrice,
                currencyCode: o.currencyCode,
                status: o.status,
                paidAt: o.paidAt,
                itemCount: o.items?.length || 0,
            })),
            profitChart: profitSummary,
            shopStats,
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
