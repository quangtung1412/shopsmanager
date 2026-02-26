import { AppDataSource } from '../config/database';
import { Order } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { CostPrice } from '../entities/CostPrice';
import { Between, LessThanOrEqual } from 'typeorm';

export interface ProfitDetail {
    orderId: string;
    etsyReceiptId: number;
    shopName: string;
    buyerName: string;
    orderDate: Date;
    revenue: number;
    costOfGoods: number;
    shippingCost: number;
    etsyFees: number;
    profit: number;
    profitMargin: number;
    currencyCode: string;
}

export interface ProfitSummary {
    period: string;
    revenue: number;
    costOfGoods: number;
    etsyFees: number;
    shippingCost: number;
    profit: number;
    orderCount: number;
}

export class ProfitService {
    /**
     * Calculate profit for each order in a date range
     */
    static async getProfitByOrder(
        from: Date,
        to: Date,
        shopId?: string
    ): Promise<ProfitDetail[]> {
        const orderRepo = AppDataSource.getRepository(Order);
        const costPriceRepo = AppDataSource.getRepository(CostPrice);

        let query = orderRepo
            .createQueryBuilder('o')
            .leftJoinAndSelect('o.items', 'items')
            .leftJoinAndSelect('o.shop', 'shop')
            .where('o.paidAt BETWEEN :from AND :to', { from, to });

        if (shopId) {
            query = query.andWhere('o.shopId = :shopId', { shopId });
        }

        const orders = await query.orderBy('o.paidAt', 'DESC').getMany();

        const profits: ProfitDetail[] = [];

        for (const order of orders) {
            let costOfGoods = 0;

            for (const item of order.items) {
                if (item.productVariantId) {
                    const cost = await this.getCostPriceAtDate(
                        item.productVariantId,
                        order.paidAt || order.createdAt
                    );
                    costOfGoods += cost * item.quantity;
                }
            }

            // Estimate Etsy fees if not provided
            const etsyFees = order.etsyFees > 0
                ? order.etsyFees
                : this.estimateEtsyFees(order.subtotal, order.items.length);

            const revenue = order.subtotal;
            const profit = revenue - costOfGoods - etsyFees - order.shippingCost;
            const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

            profits.push({
                orderId: order.id,
                etsyReceiptId: order.etsyReceiptId,
                shopName: order.shop?.shopName || 'Unknown',
                buyerName: order.buyerName || 'Unknown',
                orderDate: order.paidAt || order.createdAt,
                revenue,
                costOfGoods,
                shippingCost: order.shippingCost,
                etsyFees,
                profit,
                profitMargin,
                currencyCode: order.currencyCode || 'USD',
            });
        }

        return profits;
    }

    /**
     * Get profit summary grouped by period
     */
    static async getProfitSummary(
        from: Date,
        to: Date,
        groupBy: 'day' | 'week' | 'month' = 'day',
        shopId?: string
    ): Promise<ProfitSummary[]> {
        const profits = await this.getProfitByOrder(from, to, shopId);

        const grouped = new Map<string, ProfitSummary>();

        for (const p of profits) {
            const key = this.getPeriodKey(p.orderDate, groupBy);

            if (!grouped.has(key)) {
                grouped.set(key, {
                    period: key,
                    revenue: 0,
                    costOfGoods: 0,
                    etsyFees: 0,
                    shippingCost: 0,
                    profit: 0,
                    orderCount: 0,
                });
            }

            const summary = grouped.get(key)!;
            summary.revenue += p.revenue;
            summary.costOfGoods += p.costOfGoods;
            summary.etsyFees += p.etsyFees;
            summary.shippingCost += p.shippingCost;
            summary.profit += p.profit;
            summary.orderCount++;
        }

        return Array.from(grouped.values()).sort((a, b) => a.period.localeCompare(b.period));
    }

    /**
     * Get profit by product
     */
    static async getProfitByProduct(
        from: Date,
        to: Date,
        shopId?: string
    ): Promise<any[]> {
        const orderItemRepo = AppDataSource.getRepository(OrderItem);

        let query = orderItemRepo
            .createQueryBuilder('oi')
            .leftJoin('oi.order', 'o')
            .leftJoin('oi.productVariant', 'v')
            .leftJoin('v.product', 'p')
            .select([
                'oi.sku AS sku',
                'oi.title AS title',
                'SUM(oi.quantity) AS totalQuantity',
                'SUM(oi.price * oi.quantity) AS totalRevenue',
            ])
            .where('o.paidAt BETWEEN :from AND :to', { from, to })
            .groupBy('oi.sku')
            .addGroupBy('oi.title');

        if (shopId) {
            query = query.andWhere('o.shopId = :shopId', { shopId });
        }

        return query.orderBy('totalRevenue', 'DESC').getRawMany();
    }

    // ---- Helpers ----

    private static async getCostPriceAtDate(
        productVariantId: string,
        date: Date
    ): Promise<number> {
        const costPriceRepo = AppDataSource.getRepository(CostPrice);
        const cost = await costPriceRepo.findOne({
            where: {
                productVariantId,
                effectiveFrom: LessThanOrEqual(date),
            },
            order: { effectiveFrom: 'DESC' },
        });
        return cost?.costPrice || 0;
    }

    private static estimateEtsyFees(subtotal: number, itemCount: number): number {
        // Etsy fee structure:
        // Transaction fee: 6.5% of item price + shipping
        // Processing fee: 3% + $0.25 per transaction
        // Listing fee: $0.20 per listing
        const transactionFee = subtotal * 0.065;
        const processingFee = subtotal * 0.03 + 0.25;
        const listingFee = itemCount * 0.20;
        return transactionFee + processingFee + listingFee;
    }

    private static getPeriodKey(date: Date, groupBy: 'day' | 'week' | 'month'): string {
        const d = new Date(date);
        switch (groupBy) {
            case 'day':
                return d.toISOString().slice(0, 10);
            case 'week': {
                const startOfWeek = new Date(d);
                startOfWeek.setDate(d.getDate() - d.getDay());
                return startOfWeek.toISOString().slice(0, 10);
            }
            case 'month':
                return d.toISOString().slice(0, 7);
            default:
                return d.toISOString().slice(0, 10);
        }
    }
}
