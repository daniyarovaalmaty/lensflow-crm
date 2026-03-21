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
            price: 5500,
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
            description: 'Пробная линза DK 50 (5500 ₸)',
            price: 5500,
            priceByDk: null,
            unit: 'шт',
            isActive: true,
            sortOrder: 1,
        }
    });
    console.log('Added Trial Lens:', trialLens.name, 'Price:', trialLens.price);
}

main()
    .catch(console.error)
    .finally(async () => { await prisma.$disconnect(); await pool.end(); });
