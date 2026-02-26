import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Product } from '../entities/Product';
import { EtsyShop } from '../entities/EtsyShop';
import { authMiddleware } from '../middleware/auth';
import { requireManager } from '../middleware/rbac';
import { EtsyApiService } from '../services/etsy-api.service';
import { ProductSyncService } from '../services/product-sync.service';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const productRepo = () => AppDataSource.getRepository(Product);
const shopRepo = () => AppDataSource.getRepository(EtsyShop);

// GET /api/shops/:shopId/products - List products for a shop
router.get('/shops/:shopId/products', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { shopId } = req.params;
        const { page = '1', limit = '20', search, status } = req.query;

        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);

        let query = productRepo()
            .createQueryBuilder('p')
            .leftJoinAndSelect('p.variants', 'v')
            .where('p.shopId = :shopId', { shopId });

        if (search) {
            query = query.andWhere('(p.title LIKE :search OR p.sku LIKE :search)', {
                search: `%${search}%`,
            });
        }

        if (status) {
            query = query.andWhere('p.status = :status', { status });
        }

        const [products, total] = await query
            .orderBy('p.updatedAt', 'DESC')
            .skip((pageNum - 1) * limitNum)
            .take(limitNum)
            .getManyAndCount();

        res.json({ products, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/products/:id - Get product details
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const product = await productRepo().findOne({
            where: { id: req.params.id as string },
            relations: ['variants', 'shop'],
        });

        if (!product) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }

        res.json({ product });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/shops/:shopId/products - Create new listing on Etsy
router.post('/shops/:shopId/products', authMiddleware, requireManager, async (req: Request, res: Response) => {
    try {
        const shop = await shopRepo().findOneBy({ id: req.params.shopId as string });
        if (!shop) {
            res.status(404).json({ error: 'Shop not found' });
            return;
        }

        const { title, description, price, quantity, tags, who_made, when_made, taxonomy_id, shipping_profile_id } = req.body;

        const etsyListing = await EtsyApiService.createListing(shop, {
            title,
            description,
            price: price * 100, // Etsy expects cents
            quantity,
            tags: tags || [],
            who_made: who_made || 'i_did',
            when_made: when_made || 'made_to_order',
            taxonomy_id,
            shipping_profile_id,
        });

        // Sync back to DB
        await ProductSyncService.syncShopProducts(shop);

        const product = await productRepo().findOne({
            where: { etsyListingId: etsyListing.listing_id, shopId: shop.id },
            relations: ['variants'],
        });

        res.status(201).json({ product, etsyListing });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// PATCH /api/products/:id - Update product on Etsy
router.patch('/:id', authMiddleware, requireManager, async (req: Request, res: Response) => {
    try {
        const product = await productRepo().findOne({
            where: { id: req.params.id as string },
            relations: ['shop'],
        });

        if (!product) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }

        const updateData: any = {};
        const { title, description, price, quantity, tags, status } = req.body;

        if (title) updateData.title = title;
        if (description) updateData.description = description;
        if (price !== undefined) updateData.price = price * 100;
        if (quantity !== undefined) updateData.quantity = quantity;
        if (tags) updateData.tags = tags;
        if (status) updateData.state = status;

        // Update on Etsy
        await EtsyApiService.updateListing(product.shop, product.etsyListingId, updateData);

        // Update local DB
        if (title) product.title = title;
        if (description) product.description = description;
        if (price !== undefined) product.price = price;
        if (quantity !== undefined) product.quantity = quantity;
        if (tags) product.tags = tags;

        await productRepo().save(product);

        res.json({ product });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/products/:id - Delete/deactivate listing on Etsy
router.delete('/:id', authMiddleware, requireManager, async (req: Request, res: Response) => {
    try {
        const product = await productRepo().findOne({
            where: { id: req.params.id as string },
            relations: ['shop'],
        });

        if (!product) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }

        await EtsyApiService.deleteListing(product.shop, product.etsyListingId);
        await productRepo().remove(product);

        res.json({ message: 'Product deleted' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/products/:id/images - Upload image
router.post('/:id/images', authMiddleware, requireManager, upload.single('image'), async (req: Request, res: Response) => {
    try {
        const product = await productRepo().findOne({
            where: { id: req.params.id as string },
            relations: ['shop'],
        });

        if (!product) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }

        if (!req.file) {
            res.status(400).json({ error: 'No image file provided' });
            return;
        }

        const result = await EtsyApiService.uploadListingImage(
            product.shop,
            product.etsyListingId,
            req.file.buffer,
            req.file.originalname
        );

        res.json({ image: result });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
