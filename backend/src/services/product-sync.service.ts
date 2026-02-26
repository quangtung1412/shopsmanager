import { AppDataSource } from '../config/database';
import { EtsyShop } from '../entities/EtsyShop';
import { Product, ProductStatus } from '../entities/Product';
import { ProductVariant } from '../entities/ProductVariant';
import { EtsyApiService } from './etsy-api.service';

export class ProductSyncService {
    static async syncShopProducts(shop: EtsyShop): Promise<number> {
        const productRepo = AppDataSource.getRepository(Product);
        const variantRepo = AppDataSource.getRepository(ProductVariant);

        let offset = 0;
        let synced = 0;
        let hasMore = true;

        while (hasMore) {
            const response = await EtsyApiService.getShopListings(shop, {
                limit: 100,
                offset,
                state: 'active',
            });

            const listings = response.results || [];

            for (const listing of listings) {
                let product = await productRepo.findOne({
                    where: { etsyListingId: listing.listing_id, shopId: shop.id },
                });

                if (!product) {
                    product = productRepo.create({ shopId: shop.id });
                }

                product.etsyListingId = listing.listing_id;
                product.title = listing.title;
                product.description = listing.description;
                product.status = mapListingStatus(listing.state);
                product.tags = listing.tags || [];
                product.price = parseFloat(listing.price?.amount || '0') / 100;
                product.currencyCode = listing.price?.currency_code || 'USD';
                product.quantity = listing.quantity;
                product.url = listing.url;

                // Images
                if (listing.images?.length) {
                    product.primaryImageUrl = listing.images[0].url_fullxfull;
                    product.imageUrls = listing.images.map((img: any) => img.url_fullxfull);
                }

                // SKU from first variant
                if (listing.skus?.length) {
                    product.sku = listing.skus[0];
                }

                await productRepo.save(product);

                // Sync inventory / variants
                try {
                    const inventory = await EtsyApiService.getListingInventory(shop, listing.listing_id);
                    if (inventory.products) {
                        for (const invProduct of inventory.products) {
                            const sku = invProduct.sku || product.sku;
                            if (!sku) continue;

                            let variant = await variantRepo.findOne({
                                where: { productId: product.id, etsyProductId: invProduct.product_id },
                            });

                            if (!variant) {
                                variant = variantRepo.create({ productId: product.id });
                            }

                            variant.etsyProductId = invProduct.product_id;
                            variant.sku = sku;
                            variant.propertyValues = invProduct.property_values?.reduce(
                                (acc: any, pv: any) => ({ ...acc, [pv.property_name]: pv.values?.[0] }),
                                {}
                            );

                            // First offering
                            if (invProduct.offerings?.length) {
                                const offering = invProduct.offerings[0];
                                variant.etsyOfferingId = offering.offering_id;
                                variant.price = parseFloat(offering.price?.amount || '0') / 100;
                                variant.quantity = offering.quantity;
                            }

                            await variantRepo.save(variant);
                        }
                    }
                } catch (error) {
                    console.error(`Error syncing inventory for listing ${listing.listing_id}:`, error);
                }

                synced++;
            }

            hasMore = listings.length === 100;
            offset += 100;
        }

        return synced;
    }
}

function mapListingStatus(state: string): ProductStatus {
    switch (state) {
        case 'active': return ProductStatus.ACTIVE;
        case 'inactive': return ProductStatus.INACTIVE;
        case 'draft': return ProductStatus.DRAFT;
        case 'expired': return ProductStatus.EXPIRED;
        case 'sold_out': return ProductStatus.SOLD_OUT;
        default: return ProductStatus.INACTIVE;
    }
}
