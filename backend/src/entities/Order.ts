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
import { OrderItem } from './OrderItem';
import { Invoice } from './Invoice';

export enum OrderStatus {
    PAID = 'paid',
    COMPLETED = 'completed',
    SHIPPED = 'shipped',
    CANCELED = 'canceled',
    REFUNDED = 'refunded',
    OPEN = 'open',
}

@Entity('orders')
export class Order {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    shopId: string;

    @ManyToOne(() => EtsyShop, (shop) => shop.orders)
    @JoinColumn({ name: 'shopId' })
    shop: EtsyShop;

    @Column({ type: 'bigint' })
    @Index({ unique: true })
    etsyReceiptId: number;

    @Column({ nullable: true })
    buyerName: string;

    @Column({ nullable: true })
    buyerEmail: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    totalPrice: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    subtotal: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    shippingCost: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    salesTax: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    etsyFees: number;

    @Column({ nullable: true })
    currencyCode: string;

    @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.OPEN })
    status: OrderStatus;

    @Column({ nullable: true })
    trackingNumber: string;

    @Column({ nullable: true })
    carrierName: string;

    @Column({ nullable: true })
    shippingAddress: string;

    @Column({ nullable: true })
    shippingCountry: string;

    @Column({ type: 'datetime', nullable: true })
    paidAt: Date | null;

    @Column({ type: 'datetime', nullable: true })
    shippedAt: Date | null;

    @Column({ type: 'datetime', nullable: true })
    etsyCreatedAt: Date | null;

    @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
    items: OrderItem[];

    @OneToMany(() => Invoice, (invoice) => invoice.order)
    invoices: Invoice[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
