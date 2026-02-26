import dotenv from 'dotenv';
dotenv.config();

const requiredEnvVars = [
    'MYSQL_HOST',
    'MYSQL_DATABASE',
    'MYSQL_USER',
    'MYSQL_PASSWORD',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'ETSY_API_KEY',
    'TOKEN_ENCRYPTION_KEY',
];

for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.warn(`Warning: Missing environment variable ${envVar}`);
    }
}

export const env = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '5000', 10),
    appUrl: process.env.APP_URL || 'http://localhost:3000',
    apiUrl: process.env.API_URL || 'http://localhost:5000',

    // MySQL
    mysql: {
        host: process.env.MYSQL_HOST || 'localhost',
        port: parseInt(process.env.MYSQL_PORT || '3306', 10),
        database: process.env.MYSQL_DATABASE || 'etsy_erp',
        user: process.env.MYSQL_USER || 'etsy_erp',
        password: process.env.MYSQL_PASSWORD || '',
    },

    // Redis
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
    },

    // JWT
    jwt: {
        secret: process.env.JWT_SECRET || 'dev-secret',
        refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },

    // Google OAuth — callbackUrl derives from API_URL so only one var needs changing
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        callbackUrl:
            process.env.GOOGLE_CALLBACK_URL ||
            `${process.env.API_URL || 'http://localhost:5000'}/api/auth/google/callback`,
    },

    // Etsy
    etsy: {
        apiKey: process.env.ETSY_API_KEY || '',
        redirectUri:
            process.env.ETSY_REDIRECT_URI ||
            `${process.env.API_URL || 'http://localhost:5000'}/api/etsy/callback`,
        scopes: process.env.ETSY_SCOPES || 'shops_r listings_r listings_w transactions_r transactions_w billing_r profile_r email_r',
    },

    // Token encryption
    tokenEncryptionKey: process.env.TOKEN_ENCRYPTION_KEY || '',

    // Telegram
    telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN || '',
        defaultChatId: process.env.TELEGRAM_DEFAULT_CHAT_ID || '',
    },

    // SMTP
    smtp: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER || '',
        password: process.env.SMTP_PASSWORD || '',
        from: process.env.SMTP_FROM || 'noreply@yourdomain.com',
    },

    // Invoice
    matbao: {
        apiUrl: process.env.MATBAO_API_URL || '',
        apiKey: process.env.MATBAO_API_KEY || '',
        apiSecret: process.env.MATBAO_API_SECRET || '',
    },

    // Exchange rate
    defaultUsdVndRate: parseInt(process.env.DEFAULT_USD_VND_RATE || '25000', 10),
};
