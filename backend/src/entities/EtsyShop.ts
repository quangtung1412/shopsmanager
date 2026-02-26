import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    OneToOne,
    JoinColumn,
} from 'typeorm';
import { User } from './User';
import { EtsyToken } from './EtsyToken';
import { Product } from './Product';
import { Order } from './Order';

export enum ShopStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    TOKEN_EXPIRED = 'token_expired',
    ERROR = 'error',
}

@Entity('etsy_shops')
export class EtsyShop {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    userId: string;

    @ManyToOne(() => User, (user) => user.shops)
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column({ type: 'bigint' })
    etsyShopId: number;

    @Column()
    shopName: string;

    @Column({ type: 'bigint' })
    etsyUserId: number;

    @Column({ nullable: true })
    shopUrl: string;

    @Column({ nullable: true })
    shopIcon: string;

    @Column({ type: 'enum', enum: ShopStatus, default: ShopStatus.ACTIVE })
    status: ShopStatus;

    @Column({ nullable: true })
    lastSyncAt: Date;

    // Notification settings
    @Column({ default: false })
    telegramEnabled: boolean;

    @Column({ nullable: true })
    telegramChatId: string;

    @Column({ default: false })
    emailEnabled: boolean;

    @Column({ nullable: true })
    notificationEmail: string;

    @OneToOne(() => EtsyToken, (token) => token.shop, { cascade: true })
    token: EtsyToken;

    @OneToMany(() => Product, (product) => product.shop)
    products: Product[];

    @OneToMany(() => Order, (order) => order.shop)
    orders: Order[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
