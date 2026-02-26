import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToOne,
    JoinColumn,
} from 'typeorm';
import { EtsyShop } from './EtsyShop';

@Entity('etsy_tokens')
export class EtsyToken {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    shopId: string;

    @OneToOne(() => EtsyShop, (shop) => shop.token)
    @JoinColumn({ name: 'shopId' })
    shop: EtsyShop;

    @Column({ type: 'text' })
    accessTokenEncrypted: string;

    @Column({ type: 'text' })
    refreshTokenEncrypted: string;

    @Column()
    expiresAt: Date;

    @Column({ type: 'text', nullable: true })
    scopes: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
