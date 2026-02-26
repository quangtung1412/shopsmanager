import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
    Index,
} from 'typeorm';
import { Product } from './Product';
import { OrderItem } from './OrderItem';
import { InventoryMovement } from './InventoryMovement';
import { CostPrice } from './CostPrice';

@Entity('product_variants')
export class ProductVariant {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    productId: string;

    @ManyToOne(() => Product, (product) => product.variants)
    @JoinColumn({ name: 'productId' })
    product: Product;

    @Column({ nullable: true })
    @Index()
    sku: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    price: number;

    @Column({ default: 0 })
    quantity: number;

    @Column({ type: 'simple-json', nullable: true })
    propertyValues: Record<string, string>;

    @Column({ type: 'bigint', nullable: true })
    etsyProductId: number;

    @Column({ type: 'bigint', nullable: true })
    etsyOfferingId: number;

    @OneToMany(() => OrderItem, (item) => item.productVariant)
    orderItems: OrderItem[];

    @OneToMany(() => InventoryMovement, (movement) => movement.productVariant)
    inventoryMovements: InventoryMovement[];

    @OneToMany(() => CostPrice, (costPrice) => costPrice.productVariant)
    costPrices: CostPrice[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
