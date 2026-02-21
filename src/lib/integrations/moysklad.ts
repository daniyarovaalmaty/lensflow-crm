import axios, { AxiosInstance } from 'axios';
import { MoySkladProduct, MoySkladCustomerOrder, CatalogItem } from '@/types/moysklad';
import type { Order } from '@/types/order';

/**
 * МойСклад API Client
 * Handles catalog sync and order export
 */
export class MoySkladClient {
    private client: AxiosInstance;
    private organizationHref: string | null = null;

    constructor() {
        const apiUrl = process.env.MOYSKLAD_API_URL || 'https://api.moysklad.ru/api/remap/1.2';
        const username = process.env.MOYSKLAD_USERNAME || '';
        const password = process.env.MOYSKLAD_PASSWORD || '';

        this.client = axios.create({
            baseURL: apiUrl,
            auth: {
                username,
                password,
            },
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });
    }

    /**
     * Fetch organization info
     */
    async getOrganization(): Promise<{ id: string; href: string; name: string }> {
        try {
            const response = await this.client.get('/context/employee');
            const orgHref = response.data.organization?.meta?.href;

            if (!orgHref) {
                throw new Error('Organization not found in employee context');
            }

            const orgResponse = await this.client.get(orgHref.replace(this.client.defaults.baseURL!, ''));

            this.organizationHref = orgHref;

            return {
                id: orgResponse.data.id,
                href: orgHref,
                name: orgResponse.data.name,
            };
        } catch (error) {
            console.error('Failed to fetch organization:', error);
            throw error;
        }
    }

    /**
     * Sync product catalog from МойСклад
     */
    async syncCatalog(): Promise<CatalogItem[]> {
        try {
            const response = await this.client.get('/entity/product', {
                params: {
                    limit: 1000,
                    expand: 'attributes',
                },
            });

            const products: MoySkladProduct[] = response.data.rows || [];

            // Transform to local catalog format
            const catalogItems: CatalogItem[] = products.map(product => {
                // Extract lens type from attributes or name
                let lensType: 'medilens' = 'medilens';
                let brand = 'MediLens';
                let material = undefined;

                if (product.attributes) {
                    const brandAttr = product.attributes.find(a => a.name.toLowerCase().includes('бренд'));
                    const materialAttr = product.attributes.find(a => a.name.toLowerCase().includes('материал'));

                    if (brandAttr) brand = String(brandAttr.value);
                    if (materialAttr) material = String(materialAttr.value);
                }

                return {
                    id: `local_${product.id}`,
                    moysklad_id: product.id,
                    name: product.name,
                    type: lensType,
                    brand,
                    material,
                    stock: product.stock || 0,
                    price: product.price,
                    attributes: product.attributes?.reduce((acc, attr) => ({
                        ...acc,
                        [attr.name]: attr.value,
                    }), {}),
                    synced_at: new Date().toISOString(),
                };
            });

            console.log(`✅ Synced ${catalogItems.length} products from МойСклад`);
            return catalogItems;
        } catch (error) {
            console.error('Failed to sync catalog:', error);
            throw error;
        }
    }

    /**
     * Create customer order in МойСклад
     */
    async createCustomerOrder(order: Order, opticCounterpartyHref: string): Promise<string> {
        try {
            if (!this.organizationHref) {
                await this.getOrganization();
            }

            // Find or create product positions
            const positions = await this.createOrderPositions(order);

            const customerOrder: Partial<MoySkladCustomerOrder> = {
                name: order.order_id,
                description: `Заказ из LensFlow CRM\nПациент: ${order.patient.name}\nТип линз: ${order.config.type}`,
                moment: new Date().toISOString(),
                organization: {
                    meta: {
                        href: this.organizationHref!,
                        type: 'organization',
                    },
                },
                agent: {
                    meta: {
                        href: opticCounterpartyHref,
                        type: 'counterparty',
                    },
                },
                positions,
            };

            const response = await this.client.post('/entity/customerorder', customerOrder);

            console.log(`✅ Created customer order in МойСклад: ${response.data.id}`);
            return response.data.id;
        } catch (error) {
            console.error('Failed to create customer order:', error);
            throw error;
        }
    }

    /**
     * Create order positions (line items)
     */
    private async createOrderPositions(order: Order) {
        const positions = [];

        // Search for matching product by lens type and brand
        const searchQuery = `MediLens`;
        const productsResponse = await this.client.get('/entity/product', {
            params: {
                search: searchQuery,
                limit: 1,
            },
        });

        const product = productsResponse.data.rows?.[0];

        if (!product) {
            throw new Error(`Product not found for: ${searchQuery}`);
        }

        // Add OD position
        positions.push({
            quantity: order.config.eyes.od.qty,
            price: product.price || 0,
            assortment: {
                meta: product.meta,
            },
        });

        // Add OS position
        positions.push({
            quantity: order.config.eyes.os.qty,
            price: product.price || 0,
            assortment: {
                meta: product.meta,
            },
        });

        return positions;
    }

    /**
     * Update order status in МойСклад
     */
    async updateOrderStatus(moyskladOrderId: string, status: string): Promise<void> {
        try {
            // Find status state by name
            const statesResponse = await this.client.get('/entity/customerorder/metadata');
            const states = statesResponse.data.states || [];

            const targetState = states.find((s: any) =>
                s.name.toLowerCase().includes(status.toLowerCase())
            );

            if (!targetState) {
                console.warn(`Status "${status}" not found in МойСклад, skipping update`);
                return;
            }

            await this.client.put(`/entity/customerorder/${moyskladOrderId}`, {
                state: {
                    meta: targetState.meta,
                },
            });

            console.log(`✅ Updated order ${moyskladOrderId} status to: ${status}`);
        } catch (error) {
            console.error('Failed to update order status:', error);
            throw error;
        }
    }

    /**
     * Get stock levels for products
     */
    async getStockLevels(): Promise<Map<string, number>> {
        try {
            const response = await this.client.get('/report/stock/all', {
                params: {
                    limit: 1000,
                },
            });

            const stockMap = new Map<string, number>();

            response.data.rows?.forEach((item: any) => {
                if (item.meta?.href) {
                    const productId = item.meta.href.split('/').pop();
                    stockMap.set(productId, item.stock || 0);
                }
            });

            return stockMap;
        } catch (error) {
            console.error('Failed to fetch stock levels:', error);
            throw error;
        }
    }
}

// Singleton instance
let moyskladClient: MoySkladClient | null = null;

export function getMoySkladClient(): MoySkladClient {
    if (!moyskladClient) {
        moyskladClient = new MoySkladClient();
    }
    return moyskladClient;
}
