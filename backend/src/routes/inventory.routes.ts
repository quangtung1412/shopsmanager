import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { requireManager } from '../middleware/rbac';
import { InventoryService } from '../services/inventory.service';

const router = Router();

// GET /api/inventory - Get all stock levels
router.get('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { shopId } = req.query;
        const stock = await InventoryService.getAllStock(shopId as string);
        res.json({ inventory: stock });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/inventory/:variantId/movements - Get movement history
router.get('/:variantId/movements', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { limit = '50', offset = '0' } = req.query;
        const result = await InventoryService.getMovements(req.params.variantId as string, {
            limit: parseInt(limit as string, 10),
            offset: parseInt(offset as string, 10),
        });
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/inventory/import - Record import
router.post('/import', authMiddleware, requireManager, async (req: Request, res: Response) => {
    try {
        const { productVariantId, quantity, costPrice, currencyCode, note } = req.body;
        const movement = await InventoryService.recordImport({
            productVariantId,
            quantity,
            costPrice,
            currencyCode,
            note,
            createdBy: req.user!.userId,
        });
        res.status(201).json({ movement });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/inventory/export - Record export
router.post('/export', authMiddleware, requireManager, async (req: Request, res: Response) => {
    try {
        const { productVariantId, quantity, orderId, note } = req.body;
        const movement = await InventoryService.recordExport({
            productVariantId,
            quantity,
            orderId,
            note,
            createdBy: req.user!.userId,
        });
        res.status(201).json({ movement });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/inventory/adjust - Record adjustment
router.post('/adjust', authMiddleware, requireManager, async (req: Request, res: Response) => {
    try {
        const { productVariantId, quantity, note } = req.body;
        const movement = await InventoryService.recordAdjustment({
            productVariantId,
            quantity,
            note,
            createdBy: req.user!.userId,
        });
        res.status(201).json({ movement });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
