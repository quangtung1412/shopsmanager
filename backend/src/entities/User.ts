import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from 'typeorm';
import { EtsyShop } from './EtsyShop';

export enum UserRole {
    ADMIN = 'admin',
    MANAGER = 'manager',
    VIEWER = 'viewer',
}

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    email: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    avatar: string;

    @Column({ unique: true })
    googleId: string;

    @Column({ type: 'enum', enum: UserRole, default: UserRole.VIEWER })
    role: UserRole;

    @Column({ default: true })
    isActive: boolean;

    @OneToMany(() => EtsyShop, (shop) => shop.user)
    shops: EtsyShop[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
