import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { EtsyShop } from '../entities/EtsyShop';
import { OrderSyncService } from '../services/order-sync.service';
import { NotificationService } from '../services/notification.service';
import { verifyEtsyWebhookSignature } from '../utils/etsy-webhook-verify';
import { EtsyApiService } from '../services/etsy-api.service';

const router = Router();

// POST /api/webhooks/etsy - Etsy webhook endpoint
router.post('/etsy', async (req: Request, res: Response) => {
    try {
        const rawBody = JSON.stringify(req.body);

        // Verify webhook signature (if signing secret is configured)
        const signingSecret = process.env.ETSY_WEBHOOK_SECRET;
        if (signingSecret) {
            const webhookId = req.headers['webhook-id'] as string;
            const webhookTimestamp = req.headers['webhook-timestamp'] as string;
            const webhookSignature = req.headers['webhook-signature'] as string;

            if (!webhookId || !webhookTimestamp || !webhookSignature) {
                res.status(401).json({ error: 'Missing webhook headers' });
                return;
            }

            const isValid = verifyEtsyWebhookSignature(rawBody, {
                'webhook-id': webhookId,
                'webhook-timestamp': webhookTimestamp,
                'webhook-signature': webhookSignature,
            }, signingSecret);

            if (!isValid) {
                res.status(401).json({ error: 'Invalid webhook signature' });
                return;
            }
        }

        const { event_type, data } = req.body;
        const shopId = data?.shop_id;

        if (!shopId) {
            res.status(200).json({ received: true });
            return;
        }

        const shopRepo = AppDataSource.getRepository(EtsyShop);
        const shop = await shopRepo.findOne({ where: { etsyShopId: shopId } });

        if (!shop) {
            console.warn(`Webhook received for unknown shop: ${shopId}`);
            res.status(200).json({ received: true });
            return;
        }

        switch (event_type) {
            case 'order.paid': {
                // Fetch the receipt details
                const resourceUrl = data.resource_url;
                const receiptIdMatch = resourceUrl?.match(/receipts\/(\d+)/);
                if (receiptIdMatch) {
                    const receiptId = parseInt(receiptIdMatch[1], 10);
                    const receipt = await EtsyApiService.getReceipt(shop, receiptId);

                    // Sync this order
                    await OrderSyncService.syncShopOrders(shop, {
                        fromTimestamp: receipt.create_timestamp - 60,
                    });
                }
                break;
            }

            case 'order.canceled': {
                const resourceUrl = data.resource_url;
                const receiptIdMatch = resourceUrl?.match(/receipts\/(\d+)/);
                if (receiptIdMatch) {
                    const receiptId = parseInt(receiptIdMatch[1], 10);
                    const receipt = await EtsyApiService.getReceipt(shop, receiptId);

                    await NotificationService.notifyOrderCanceled(
                        shop,
                        receiptId,
                        receipt.name || receipt.buyer_email || 'Unknown'
                    );

                    // Re-sync to update status
                    await OrderSyncService.syncShopOrders(shop, {
                        fromTimestamp: receipt.create_timestamp - 60,
                    });
                }
                break;
            }

            default:
                console.log(`Unhandled webhook event: ${event_type}`);
        }

        res.status(200).json({ received: true });
    } catch (error: any) {
        console.error('Webhook processing error:', error);
        // Always return 200 to prevent retries for processing errors
        res.status(200).json({ received: true, error: 'Processing error' });
    }
});

export default router;
