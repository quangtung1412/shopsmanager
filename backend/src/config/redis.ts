import Redis from 'ioredis';
import { env } from './env';

export const redis = new Redis({
    host: env.redis.host,
    port: env.redis.port,
    password: env.redis.password,
    maxRetriesPerRequest: null,
    retryStrategy: (times: number) => {
        if (times > 10) return null;
        return Math.min(times * 200, 5000);
    },
});

redis.on('connect', () => {
    console.log('✅ Redis connected');
});

redis.on('error', (err) => {
    console.error('❌ Redis connection error:', err.message);
});

export default redis;
