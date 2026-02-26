import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { AppDataSource } from './config/database';
import { apiLimiter } from './middleware/rateLimiter';

// Routes
import authRoutes from './routes/auth.routes';
import etsyAuthRoutes from './routes/etsy-auth.routes';
import shopsRoutes from './routes/shops.routes';
import productsRoutes from './routes/products.routes';
import ordersRoutes from './routes/orders.routes';
import inventoryRoutes from './routes/inventory.routes';
import profitRoutes from './routes/profit.routes';
import invoiceRoutes from './routes/invoice.routes';
import dashboardRoutes from './routes/dashboard.routes';
import notificationRoutes from './routes/notification.routes';
import webhooksRoutes from './routes/webhooks.routes';

// Jobs
import { initJobs } from './jobs';

const app = express();

// ---- Middleware ----
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
    origin: env.appUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());

// Rate limiting (skip webhooks)
app.use('/api', (req, res, next) => {
    if (req.path.startsWith('/webhooks')) return next();
    return apiLimiter(req, res, next);
});

// ---- Routes ----
app.use('/api/auth', authRoutes);
app.use('/api/etsy', etsyAuthRoutes);
app.use('/api/shops', shopsRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/profit', profitRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/webhooks', webhooksRoutes);

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404
app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// ---- Start Server ----
async function bootstrap() {
    try {
        // Connect to MySQL
        await AppDataSource.initialize();
        console.log('✅ MySQL connected');

        // Initialize Bull jobs
        await initJobs();

        // Start Express
        app.listen(env.port, () => {
            console.log(`🚀 Server running on port ${env.port}`);
            console.log(`   Environment: ${env.nodeEnv}`);
            console.log(`   API: ${env.apiUrl}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

bootstrap();

export default app;
