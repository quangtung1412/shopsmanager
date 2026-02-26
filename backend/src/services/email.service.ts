import nodemailer from 'nodemailer';
import { env } from '../config/env';

const transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: {
        user: env.smtp.user,
        pass: env.smtp.password,
    },
});

export class EmailService {
    static async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
        if (!env.smtp.user) {
            console.warn('SMTP not configured');
            return false;
        }

        try {
            await transporter.sendMail({
                from: env.smtp.from,
                to,
                subject,
                html,
            });
            return true;
        } catch (error: any) {
            console.error('Email send error:', error.message);
            return false;
        }
    }

    static formatNewOrderEmail(
        shopName: string,
        receiptId: number,
        buyerName: string,
        totalPrice: number,
        currencyCode: string,
        items: { title: string; quantity: number; price: number }[]
    ): { subject: string; html: string } {
        const itemRows = items
            .map(
                (item) =>
                    `<tr><td style="padding:8px;border:1px solid #ddd">${item.title}</td>
           <td style="padding:8px;border:1px solid #ddd;text-align:center">${item.quantity}</td>
           <td style="padding:8px;border:1px solid #ddd;text-align:right">${item.price} ${currencyCode}</td></tr>`
            )
            .join('');

        return {
            subject: `🛒 New Order #${receiptId} on ${shopName}`,
            html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#f56400">🛒 New Order Received!</h2>
          <table style="width:100%;margin:16px 0">
            <tr><td><strong>Shop:</strong></td><td>${shopName}</td></tr>
            <tr><td><strong>Order:</strong></td><td>#${receiptId}</td></tr>
            <tr><td><strong>Buyer:</strong></td><td>${buyerName}</td></tr>
            <tr><td><strong>Total:</strong></td><td><strong>${totalPrice} ${currencyCode}</strong></td></tr>
          </table>
          <h3>Order Items</h3>
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="background:#f5f5f5">
                <th style="padding:8px;border:1px solid #ddd;text-align:left">Item</th>
                <th style="padding:8px;border:1px solid #ddd">Qty</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:right">Price</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>
          <p style="color:#888;margin-top:24px;font-size:12px">Etsy ERP System</p>
        </div>
      `,
        };
    }
}
