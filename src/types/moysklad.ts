import { z } from 'zod';

// ==================== МойСклад Product (Товар) ====================
export const MoySkladProductSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    article: z.string().optional(), // Артикул
    code: z.string().optional(),
    meta: z.object({
        href: z.string(),
        type: z.string(),
    }),
    // Атрибуты для линз
    attributes: z.array(z.object({
        id: z.string(),
        name: z.string(),
        value: z.union([z.string(), z.number(), z.boolean()]),
    })).optional(),
    stock: z.number().optional(), // Остатки
    price: z.number().optional(),
});

export type MoySkladProduct = z.infer<typeof MoySkladProductSchema>;

// ==================== МойСклад Customer Order (Заказ покупателя) ====================
export const MoySkladCustomerOrderSchema = z.object({
    id: z.string().optional(),
    name: z.string(), // Номер заказа
    description: z.string().optional(),
    moment: z.string(), // Дата и время
    organization: z.object({
        meta: z.object({
            href: z.string(),
            type: z.literal('organization'),
        }),
    }),
    agent: z.object({ // Контрагент (Оптика)
        meta: z.object({
            href: z.string(),
            type: z.literal('counterparty'),
        }),
    }),
    positions: z.array(z.object({
        quantity: z.number(),
        price: z.number().optional(),
        assortment: z.object({
            meta: z.object({
                href: z.string(),
                type: z.string(),
            }),
        }),
    })),
    state: z.object({ // Статус заказа
        meta: z.object({
            href: z.string(),
            type: z.literal('state'),
        }),
    }).optional(),
});

export type MoySkladCustomerOrder = z.infer<typeof MoySkladCustomerOrderSchema>;

// ==================== Sync Configuration ====================
export const SyncConfigSchema = z.object({
    enabled: z.boolean(),
    api_url: z.string().url(),
    username: z.string(),
    password: z.string(),
    organization_id: z.string().optional(),
    sync_interval: z.number().min(60), // Минимум 1 минута (в секундах)
    last_sync: z.string().datetime().optional(),
});

export type SyncConfig = z.infer<typeof SyncConfigSchema>;

// ==================== Catalog Item (local representation) ====================
export const CatalogItemSchema = z.object({
    id: z.string(),
    moysklad_id: z.string(),
    name: z.string(),
    type: z.enum(['medilens']),
    brand: z.string(),
    material: z.string().optional(),
    stock: z.number().default(0),
    price: z.number().optional(),
    attributes: z.record(z.string(), z.any()).optional(),
    synced_at: z.string().datetime(),
});

export type CatalogItem = z.infer<typeof CatalogItemSchema>;
