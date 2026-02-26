import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { requireManager } from '../middleware/rbac';
import { InvoiceService } from '../services/invoice.service';
import { InvoiceStatus } from '../entities/Invoice';

const router = Router();

// GET /api/invoices - List invoices
router.get('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { date } = req.query;
        if (date) {
            const invoices = await InvoiceService.getByDate(date as string);
            res.json({ invoices });
            return;
        }

        const { AppDataSource } = await import('../config/database');
        const { Invoice } = await import('../entities/Invoice');
        const invoices = await AppDataSource.getRepository(Invoice).find({
            order: { createdAt: 'DESC' },
            take: 100,
            relations: ['order'],
        });
        res.json({ invoices });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/invoices/generate - Generate invoice from order
router.post('/generate', authMiddleware, requireManager, async (req: Request, res: Response) => {
    try {
        const { orderId, buyerName, buyerTaxCode, buyerAddress, sellerName, sellerTaxCode, sellerAddress, exchangeRate, vatRate } = req.body;

        if (!orderId || !sellerName || !sellerTaxCode) {
            res.status(400).json({ error: 'orderId, sellerName, and sellerTaxCode are required' });
            return;
        }

        const invoice = await InvoiceService.generateFromOrder(
            orderId,
            { buyerName, buyerTaxCode, buyerAddress },
            { sellerName, sellerTaxCode, sellerAddress },
            { exchangeRate, vatRate }
        );

        res.status(201).json({ invoice });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/invoices/export - Export invoices as XML or Excel
router.get('/export', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { date, format = 'excel', ids } = req.query;

        let invoiceIds: string[];

        if (ids) {
            invoiceIds = (ids as string).split(',');
        } else if (date) {
            const invoices = await InvoiceService.getByDate(date as string);
            invoiceIds = invoices.map((i) => i.id);
        } else {
            res.status(400).json({ error: 'date or ids parameter required' });
            return;
        }

        if (invoiceIds.length === 0) {
            res.status(404).json({ error: 'No invoices found' });
            return;
        }

        if (format === 'xml') {
            const xml = await InvoiceService.exportToXml(invoiceIds);
            res.set('Content-Type', 'application/xml');
            res.set('Content-Disposition', `attachment; filename="invoices-${date || 'export'}.xml"`);
            res.send(xml);
        } else {
            const buffer = await InvoiceService.exportToExcel(invoiceIds);
            res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.set('Content-Disposition', `attachment; filename="invoices-${date || 'export'}.xlsx"`);
            res.send(buffer);
        }
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// PATCH /api/invoices/:id/status - Update invoice status
router.patch('/:id/status', authMiddleware, requireManager, async (req: Request, res: Response) => {
    try {
        const { status } = req.body;
        if (!Object.values(InvoiceStatus).includes(status)) {
            res.status(400).json({ error: 'Invalid status' });
            return;
        }

        const invoice = await InvoiceService.updateStatus(req.params.id as string, status);
        res.json({ invoice });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
