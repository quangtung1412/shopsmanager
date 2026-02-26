import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { Order } from './Order';

export enum InvoiceStatus {
    DRAFT = 'draft',
    EXPORTED = 'exported',
    SUBMITTED = 'submitted',
    CANCELED = 'canceled',
}

@Entity('invoices')
export class Invoice {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ nullable: true })
    orderId: string;

    @ManyToOne(() => Order, (order) => order.invoices, { nullable: true })
    @JoinColumn({ name: 'orderId' })
    order: Order;

    @Column({ nullable: true })
    @Index({ unique: true })
    invoiceNumber: string;

    @Column({ type: 'date' })
    invoiceDate: Date;

    // Seller info
    @Column({ nullable: true })
    sellerName: string;

    @Column({ nullable: true })
    sellerTaxCode: string;

    @Column({ nullable: true })
    sellerAddress: string;

    // Buyer info
    @Column({ nullable: true })
    buyerName: string;

    @Column({ nullable: true })
    buyerTaxCode: string;

    @Column({ nullable: true })
    buyerAddress: string;

    // Items stored as JSON
    @Column({ type: 'json' })
    items: InvoiceItem[];

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    totalAmount: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    vatRate: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    vatAmount: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    totalWithVat: number;

    @Column({ default: 'VND' })
    currency: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    exchangeRate: number;

    @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.DRAFT })
    status: InvoiceStatus;

    @Column({ nullable: true })
    exportedAt: Date;

    @Column({ nullable: true })
    matbaoRef: string;

    @Column({ type: 'text', nullable: true })
    note: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

export interface InvoiceItem {
    lineNumber: number;
    itemName: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    vatRate: number;
    vatAmount: number;
}
