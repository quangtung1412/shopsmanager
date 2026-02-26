import axios from 'axios';
import { env } from '../config/env';

export class TelegramService {
    static async sendMessage(
        chatId: string,
        text: string,
        parseMode: 'HTML' | 'MarkdownV2' = 'HTML'
    ): Promise<boolean> {
        if (!env.telegram.botToken) {
            console.warn('Telegram bot token not configured');
            return false;
        }

        try {
            const url = `https://api.telegram.org/bot${env.telegram.botToken}/sendMessage`;
            await axios.post(url, {
                chat_id: chatId,
                text,
                parse_mode: parseMode,
                disable_web_page_preview: true,
            });
            return true;
        } catch (error: any) {
            console.error('Telegram send error:', error.response?.data || error.message);
            return false;
        }
    }

    static formatNewOrderMessage(
        shopName: string,
        receiptId: number,
        buyerName: string,
        totalPrice: number,
        currencyCode: string,
        items: { title: string; quantity: number }[]
    ): string {
        const itemLines = items
            .map((item) => `  • ${item.title} x${item.quantity}`)
            .join('\n');

        return [
            `<b>🛒 New Order!</b>`,
            ``,
            `<b>Shop:</b> ${shopName}`,
            `<b>Order:</b> #${receiptId}`,
            `<b>Buyer:</b> ${buyerName}`,
            `<b>Total:</b> ${totalPrice} ${currencyCode}`,
            ``,
            `<b>Items:</b>`,
            itemLines,
        ].join('\n');
    }

    static formatOrderCanceledMessage(
        shopName: string,
        receiptId: number,
        buyerName: string
    ): string {
        return [
            `<b>❌ Order Canceled</b>`,
            ``,
            `<b>Shop:</b> ${shopName}`,
            `<b>Order:</b> #${receiptId}`,
            `<b>Buyer:</b> ${buyerName}`,
        ].join('\n');
    }
}
