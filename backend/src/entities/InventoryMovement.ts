import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { ProductVariant } from './ProductVariant';

export enum MovementType {
    IMPORT = 'import',
    EXPORT = 'export',
    ADJUSTMENT = 'adjustment',
}

@Entity('inventory_movements')
export class InventoryMovement {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    productVariantId: string;

    @ManyToOne(() => ProductVariant, (variant) => variant.inventoryMovements)
    @JoinColumn({ name: 'productVariantId' })
    productVariant: ProductVariant;

    @Column({ type: 'enum', enum: MovementType })
    @Index()
    type: MovementType;

    @Column()
    quantity: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    costPrice: number;

    @Column({ nullable: true })
    currencyCode: string;

    @Column({ type: 'text', nullable: true })
    note: string;

    @Column({ nullable: true })
    orderId: string;

    @Column({ nullable: true })
    createdBy: string;

    @CreateDateColumn()
    @Index()
    createdAt: Date;
}
