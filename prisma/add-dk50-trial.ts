import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
    const trialLens = await prisma.product.upsert({
        where: { sku: 'ML-TRIAL-DK50' },
        update: {
            price: 12000,                         // Цена для оптик/клиник: 12 000 ₸
            distributorPriceByDk: { '50': 7600 }, // Цена для дистрибьютора: 7 600 ₸
            priceByDk: null,
            isActive: true,
            sortOrder: 1,
        },
        create: {
            name: 'Линза КЖК ортокератологическая MediLens пробная',
            category: 'lens',
            sku: 'ML-TRIAL-DK50',
            name1c: 'Линзы контактные жесткие корригирующие ОКV - RGP пробная',
            code: '796',
            description: 'trial',                // Ключевой маркер: description='trial' для DK 50
            price: 12000,                         // Цена для оптик/клиник
            priceByDk: null,
            distributorPriceByDk: { '50': 7600 }, // Цена для дистрибьютора
            unit: 'шт',
            isActive: true,
            sortOrder: 1,
        }
    });
    console.log('Added Trial Lens:', trialLens.name, 'Price (clinic):', trialLens.price, '/ Price (distributor DK50): 7 600');
}

main()
    .catch(console.error)
    .finally(async () => { await prisma.$disconnect(); await pool.end(); });
