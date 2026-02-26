import { AppDataSource } from '../config/database';
import { EtsyShop } from '../entities/EtsyShop';
import { TelegramService } from './telegram.service';
import { EmailService } from './email.service';

export class NotificationService {
    static async notifyNewOrder(
        shop: EtsyShop,
        receiptId: number,
        buyerName: string,
        totalPrice: number,
        currencyCode: string,
        items: { title: string; quantity: number; price: number }[]
    ): Promise<void> {
        const promises: Promise<any>[] = [];

        // Telegram notification
        if (shop.telegramEnabled && shop.telegramChatId) {
            const message = TelegramService.formatNewOrderMessage(
                shop.shopName,
                receiptId,
                buyerName,
                totalPrice,
                currencyCode,
                items
            );
            promises.push(TelegramService.sendMessage(shop.telegramChatId, message));
        }

        // Email notification
        if (shop.emailEnabled && shop.notificationEmail) {
            const { subject, html } = EmailService.formatNewOrderEmail(
                shop.shopName,
                receiptId,
                buyerName,
                totalPrice,
                currencyCode,
                items
            );
            promises.push(EmailService.sendEmail(shop.notificationEmail, subject, html));
        }

        await Promise.allSettled(promises);
    }

    static async notifyOrderCanceled(
        shop: EtsyShop,
        receiptId: number,
        buyerName: string
    ): Promise<void> {
        if (shop.telegramEnabled && shop.telegramChatId) {
            const message = TelegramService.formatOrderCanceledMessage(
                shop.shopName,
                receiptId,
                buyerName
            );
            await TelegramService.sendMessage(shop.telegramChatId, message);
        }
    }
}
