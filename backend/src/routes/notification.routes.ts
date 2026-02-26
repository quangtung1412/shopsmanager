import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { EtsyShop } from '../entities/EtsyShop';
import { authMiddleware } from '../middleware/auth';
import { requireManager } from '../middleware/rbac';
import { TelegramService } from '../services/telegram.service';
import { EmailService } from '../services/email.service';

const router = Router();
const shopRepo = () => AppDataSource.getRepository(EtsyShop);

// POST /api/notifications/test/telegram - Test Telegram notification
router.post('/test/telegram', authMiddleware, requireManager, async (req: Request, res: Response) => {
    try {
        const { chatId, shopId } = req.body;

        const targetChatId = chatId || (shopId
            ? (await shopRepo().findOneBy({ id: shopId }))?.telegramChatId
            : null);

        if (!targetChatId) {
            res.status(400).json({ error: 'Chat ID required' });
            return;
        }

        const success = await TelegramService.sendMessage(
            targetChatId,
            '<b>🔔 Test Notification</b>\nThis is a test from Etsy ERP system.'
        );

        res.json({ success });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/notifications/test/email - Test email notification
router.post('/test/email', authMiddleware, requireManager, async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        if (!email) {
            res.status(400).json({ error: 'Email address required' });
            return;
        }

        const success = await EmailService.sendEmail(
            email,
            '🔔 Test Notification - Etsy ERP',
            '<h2>Test Notification</h2><p>This is a test email from your Etsy ERP system.</p>'
        );

        res.json({ success });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
