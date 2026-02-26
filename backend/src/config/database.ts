import { DataSource } from 'typeorm';
import { env } from './env';
import path from 'path';

export const AppDataSource = new DataSource({
    type: 'mysql',
    host: env.mysql.host,
    port: env.mysql.port,
    username: env.mysql.user,
    password: env.mysql.password,
    database: env.mysql.database,
    synchronize: env.nodeEnv === 'development',
    logging: env.nodeEnv === 'development' ? ['error', 'warn'] : ['error'],
    entities: [path.join(__dirname, '..', 'entities', '*.{ts,js}')],
    migrations: [path.join(__dirname, '..', 'migrations', '*.{ts,js}')],
    charset: 'utf8mb4',
});
