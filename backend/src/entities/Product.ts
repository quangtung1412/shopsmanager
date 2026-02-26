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
import { EtsyShop } from './EtsyShop';
import { ProductVariant } from './ProductVariant';

export enum ProductStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    DRAFT = 'draft',
    EXPIRED = 'expired',
    SOLD_OUT = 'sold_out',
    REMOVED = 'removed',
}

@Entity('products')
export class Product {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    shopId: string;

    @ManyToOne(() => EtsyShop, (shop) => shop.products)
    @JoinColumn({ name: 'shopId' })
    shop: EtsyShop;

    @Column({ type: 'bigint' })
    @Index()
    etsyListingId: number;

    @Column()
    title: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ nullable: true })
    @Index()
    sku: string;

    @Column({ type: 'enum', enum: ProductStatus, default: ProductStatus.ACTIVE })
    status: ProductStatus;

    @Column({ type: 'simple-json', nullable: true })
    tags: string[];

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    price: number;

    @Column({ nullable: true })
    currencyCode: string;

    @Column({ default: 0 })
    quantity: number;

    @Column({ nullable: true })
    primaryImageUrl: string;

    @Column({ type: 'simple-json', nullable: true })
    imageUrls: string[];

    @Column({ nullable: true })
    url: string;

    @OneToMany(() => ProductVariant, (variant) => variant.product, { cascade: true })
    variants: ProductVariant[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
