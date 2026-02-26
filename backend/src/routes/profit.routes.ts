import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { ProfitService } from '../services/profit.service';

const router = Router();

// GET /api/profit/by-order - Profit by order
router.get('/by-order', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { from, to, shopId } = req.query;
        if (!from || !to) {
            res.status(400).json({ error: 'from and to dates are required' });
            return;
        }

        const profits = await ProfitService.getProfitByOrder(
            new Date(from as string),
            new Date(to as string),
            shopId as string
        );

        res.json({ profits });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/profit/by-shop - Profit by shop
router.get('/by-shop', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { from, to } = req.query;
        if (!from || !to) {
            res.status(400).json({ error: 'from and to dates are required' });
            return;
        }

        // Get profit for all orders, then aggregate by shop
        const profits = await ProfitService.getProfitByOrder(
            new Date(from as string),
            new Date(to as string)
        );

        const byShop = new Map<string, { shopName: string; revenue: number; profit: number; orderCount: number }>();
        for (const p of profits) {
            const existing = byShop.get(p.shopName) || { shopName: p.shopName, revenue: 0, profit: 0, orderCount: 0 };
            existing.revenue += p.revenue;
            existing.profit += p.profit;
            existing.orderCount++;
            byShop.set(p.shopName, existing);
        }

        res.json({ profits: Array.from(byShop.values()) });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/profit/by-product - Profit by product
router.get('/by-product', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { from, to, shopId } = req.query;
        if (!from || !to) {
            res.status(400).json({ error: 'from and to dates are required' });
            return;
        }

        const products = await ProfitService.getProfitByProduct(
            new Date(from as string),
            new Date(to as string),
            shopId as string
        );

        res.json({ products });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/profit/summary - Summary for charts
router.get('/summary', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { from, to, groupBy = 'day', shopId } = req.query;
        if (!from || !to) {
            res.status(400).json({ error: 'from and to dates are required' });
            return;
        }

        const summary = await ProfitService.getProfitSummary(
            new Date(from as string),
            new Date(to as string),
            groupBy as 'day' | 'week' | 'month',
            shopId as string
        );

        res.json({ summary });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
