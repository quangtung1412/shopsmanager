import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { ProductVariant } from './ProductVariant';

@Entity('cost_prices')
export class CostPrice {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    productVariantId: string;

    @ManyToOne(() => ProductVariant, (variant) => variant.costPrices)
    @JoinColumn({ name: 'productVariantId' })
    productVariant: ProductVariant;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    costPrice: number;

    @Column({ default: 'USD' })
    currency: string;

    @Column({ type: 'date' })
    effectiveFrom: Date;

    @Column({ type: 'text', nullable: true })
    note: string;

    @CreateDateColumn()
    createdAt: Date;
}
