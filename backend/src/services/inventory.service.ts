import { AppDataSource } from '../config/database';
import { InventoryMovement, MovementType } from '../entities/InventoryMovement';
import { ProductVariant } from '../entities/ProductVariant';

export class InventoryService {
    private static movementRepo = () => AppDataSource.getRepository(InventoryMovement);
    private static variantRepo = () => AppDataSource.getRepository(ProductVariant);

    /**
     * Get current stock for a variant (sum of all movements)
     */
    static async getStock(productVariantId: string): Promise<number> {
        const result = await this.movementRepo()
            .createQueryBuilder('m')
            .select(`SUM(CASE 
        WHEN m.type = 'import' THEN m.quantity 
        WHEN m.type = 'export' THEN -m.quantity 
        ELSE m.quantity 
      END)`, 'stock')
            .where('m.productVariantId = :productVariantId', { productVariantId })
            .getRawOne();

        return parseFloat(result?.stock || '0');
    }

    /**
     * Get stock for all variants (optionally filtered by shop)
     */
    static async getAllStock(shopId?: string): Promise<{
        productVariantId: string;
        sku: string;
        productTitle: string;
        stock: number;
        lastCostPrice: number | null;
    }[]> {
        let query = this.variantRepo()
            .createQueryBuilder('v')
            .leftJoin('v.product', 'p')
            .leftJoin(
                (qb) =>
                    qb
                        .select('im.productVariantId', 'pvId')
                        .addSelect(
                            `SUM(CASE WHEN im.type = 'import' THEN im.quantity WHEN im.type = 'export' THEN -im.quantity ELSE im.quantity END)`,
                            'totalStock'
                        )
                        .from(InventoryMovement, 'im')
                        .groupBy('im.productVariantId'),
                'stock',
                'stock.pvId = v.id'
            )
            .leftJoin(
                (qb) =>
                    qb
                        .select('cp.productVariantId', 'cpvId')
                        .addSelect('cp.costPrice', 'lastCost')
                        .from('cost_prices', 'cp')
                        .where(
                            'cp.id = (SELECT cp2.id FROM cost_prices cp2 WHERE cp2.productVariantId = cp.productVariantId ORDER BY cp2.effectiveFrom DESC LIMIT 1)'
                        ),
                'cost',
                'cost.cpvId = v.id'
            )
            .select([
                'v.id AS productVariantId',
                'v.sku AS sku',
                'p.title AS productTitle',
                'COALESCE(stock.totalStock, 0) AS stock',
                'cost.lastCost AS lastCostPrice',
            ]);

        if (shopId) {
            query = query.where('p.shopId = :shopId', { shopId });
        }

        return query.getRawMany();
    }

    /**
     * Record import (add stock)
     */
    static async recordImport(data: {
        productVariantId: string;
        quantity: number;
        costPrice?: number;
        currencyCode?: string;
        note?: string;
        createdBy?: string;
    }): Promise<InventoryMovement> {
        const movement = this.movementRepo().create({
            productVariantId: data.productVariantId,
            type: MovementType.IMPORT,
            quantity: data.quantity,
            costPrice: data.costPrice,
            currencyCode: data.currencyCode || 'USD',
            note: data.note,
            createdBy: data.createdBy,
        });
        return this.movementRepo().save(movement);
    }

    /**
     * Record export (reduce stock)
     */
    static async recordExport(data: {
        productVariantId: string;
        quantity: number;
        orderId?: string;
        note?: string;
        createdBy?: string;
    }): Promise<InventoryMovement> {
        const movement = this.movementRepo().create({
            productVariantId: data.productVariantId,
            type: MovementType.EXPORT,
            quantity: data.quantity,
            orderId: data.orderId,
            note: data.note,
            createdBy: data.createdBy,
        });
        return this.movementRepo().save(movement);
    }

    /**
     * Record adjustment
     */
    static async recordAdjustment(data: {
        productVariantId: string;
        quantity: number; // positive or negative
        note?: string;
        createdBy?: string;
    }): Promise<InventoryMovement> {
        const movement = this.movementRepo().create({
            productVariantId: data.productVariantId,
            type: MovementType.ADJUSTMENT,
            quantity: data.quantity,
            note: data.note,
            createdBy: data.createdBy,
        });
        return this.movementRepo().save(movement);
    }

    /**
     * Get movement history for a variant
     */
    static async getMovements(
        productVariantId: string,
        options: { limit?: number; offset?: number } = {}
    ): Promise<{ movements: InventoryMovement[]; total: number }> {
        const [movements, total] = await this.movementRepo().findAndCount({
            where: { productVariantId },
            order: { createdAt: 'DESC' },
            take: options.limit || 50,
            skip: options.offset || 0,
        });
        return { movements, total };
    }
}
