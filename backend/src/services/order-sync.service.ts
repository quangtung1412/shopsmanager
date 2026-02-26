import { AppDataSource } from '../config/database';
import { EtsyShop } from '../entities/EtsyShop';
import { Order, OrderStatus } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { Product } from '../entities/Product';
import { ProductVariant } from '../entities/ProductVariant';
import { EtsyApiService } from './etsy-api.service';
import { NotificationService } from './notification.service';

export class OrderSyncService {
    static async syncShopOrders(shop: EtsyShop, options?: { fromTimestamp?: number }): Promise<number> {
        const orderRepo = AppDataSource.getRepository(Order);
        const orderItemRepo = AppDataSource.getRepository(OrderItem);
        const variantRepo = AppDataSource.getRepository(ProductVariant);

        let offset = 0;
        let synced = 0;
        let hasMore = true;

        while (hasMore) {
            const params: any = { limit: 100, offset };
            if (options?.fromTimestamp) {
                params.min_created = options.fromTimestamp;
            }

            const response = await EtsyApiService.getShopReceipts(shop, params);
            const receipts = response.results || [];

            for (const receipt of receipts) {
                let order = await orderRepo.findOne({
                    where: { etsyReceiptId: receipt.receipt_id },
                });

                const isNew = !order;

                if (!order) {
                    order = orderRepo.create({ shopId: shop.id });
                }

                order.etsyReceiptId = receipt.receipt_id;
                order.buyerName = receipt.name || receipt.buyer_email;
                order.buyerEmail = receipt.buyer_email;
                order.totalPrice = parseFloat(receipt.grandtotal?.amount || '0') / 100;
                order.subtotal = parseFloat(receipt.subtotal?.amount || '0') / 100;
                order.shippingCost = parseFloat(receipt.total_shipping_cost?.amount || '0') / 100;
                order.salesTax = parseFloat(receipt.total_tax_cost?.amount || '0') / 100;
                order.currencyCode = receipt.grandtotal?.currency_code || 'USD';
                order.status = mapEtsyStatus(receipt);
                order.shippingAddress = formatAddress(receipt);
                order.shippingCountry = receipt.country_iso;
                order.paidAt = receipt.create_timestamp ? new Date(receipt.create_timestamp * 1000) : null;
                order.etsyCreatedAt = receipt.create_timestamp ? new Date(receipt.create_timestamp * 1000) : null;

                // Tracking info
                if (receipt.shipments?.[0]) {
                    order.trackingNumber = receipt.shipments[0].tracking_code;
                    order.carrierName = receipt.shipments[0].carrier_name;
                }

                await orderRepo.save(order);

                // Sync order items (transactions)
                if (receipt.transactions) {
                    for (const transaction of receipt.transactions) {
                        let item = await orderItemRepo.findOne({
                            where: { etsyTransactionId: transaction.transaction_id },
                        });

                        if (!item) {
                            item = orderItemRepo.create({ orderId: order.id });
                        }

                        item.etsyTransactionId = transaction.transaction_id;
                        item.title = transaction.title;
                        item.sku = transaction.sku || null;
                        item.quantity = transaction.quantity;
                        item.price = parseFloat(transaction.price?.amount || '0') / 100;
                        item.shippingCost = parseFloat(transaction.shipping_cost?.amount || '0') / 100;

                        // Link to product variant by SKU
                        if (transaction.sku) {
                            const variant = await variantRepo.findOne({
                                where: { sku: transaction.sku },
                                relations: ['product'],
                            });
                            if (variant && variant.product?.shopId === shop.id) {
                                item.productVariantId = variant.id;
                            }
                        }

                        await orderItemRepo.save(item);
                    }
                }

                // Notify if new order
                if (isNew && order.status === OrderStatus.PAID) {
                    const items = (receipt.transactions || []).map((t: any) => ({
                        title: t.title,
                        quantity: t.quantity,
                        price: parseFloat(t.price?.amount || '0') / 100,
                    }));

                    await NotificationService.notifyNewOrder(
                        shop,
                        receipt.receipt_id,
                        order.buyerName || 'Unknown',
                        order.totalPrice,
                        order.currencyCode || 'USD',
                        items
                    );
                }

                synced++;
            }

            hasMore = receipts.length === 100;
            offset += 100;
        }

        // Update shop last sync
        const shopRepo = AppDataSource.getRepository(EtsyShop);
        shop.lastSyncAt = new Date();
        await shopRepo.save(shop);

        return synced;
    }
}

function mapEtsyStatus(receipt: any): OrderStatus {
    if (receipt.status === 'Canceled') return OrderStatus.CANCELED;
    if (receipt.was_shipped) return OrderStatus.SHIPPED;
    if (receipt.was_paid) return OrderStatus.PAID;
    return OrderStatus.OPEN;
}

function formatAddress(receipt: any): string {
    const parts = [
        receipt.first_line,
        receipt.second_line,
        receipt.city,
        receipt.state,
        receipt.zip,
        receipt.country_iso,
    ].filter(Boolean);
    return parts.join(', ');
}
