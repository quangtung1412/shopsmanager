import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { Order } from './Order';
import { ProductVariant } from './ProductVariant';

@Entity('order_items')
export class OrderItem {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    orderId: string;

    @ManyToOne(() => Order, (order) => order.items)
    @JoinColumn({ name: 'orderId' })
    order: Order;

    @Column({ nullable: true })
    productVariantId: string;

    @ManyToOne(() => ProductVariant, (variant) => variant.orderItems, { nullable: true })
    @JoinColumn({ name: 'productVariantId' })
    productVariant: ProductVariant;

    @Column({ type: 'bigint', nullable: true })
    @Index()
    etsyTransactionId: number;

    @Column()
    title: string;

    @Column({ nullable: true })
    sku: string;

    @Column({ default: 1 })
    quantity: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    price: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    shippingCost: number;

    @CreateDateColumn()
    createdAt: Date;
}
