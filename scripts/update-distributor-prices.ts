/**
 * update-distributor-prices.ts
 *
 * Обновляет цены каталога:
 * - Устанавливает distributorPriceByDk для линз по прайсу дистрибьютора
 * - Исправляет price пробной линзы (ML-TRIAL-DK50) на 12 000 ₸
 * - Цены дистрибьютора согласно официальному прайсу лаборатории:
 *
 *   Пробная DK 50:           7 600 ₸
 *   Сферическая DK 100:     17 500 ₸
 *   Сферическая DK 125:     18 500 ₸
 *   Сферическая DK 180:     20 500 ₸
 *   Торическая DK 100:      18 500 ₸
 *   Торическая DK 125:      19 500 ₸
 *   Торическая DK 180:      21 500 ₸
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
    console.log('🔄 Updating distributor prices...');

    // 1. Trial lens (DK 50) — fix clinic price to 12 000, distributor to 7 600
    const trial = await prisma.product.updateMany({
        where: { sku: 'ML-TRIAL-DK50' },
        data: {
            price: 12000,
            distributorPriceByDk: { '50': 7600 },
        },
    });
    console.log(`✅ Trial lens updated (${trial.count} record)`);

    // 2. Spherical lenses — distributor prices by DK
    const spherical = await prisma.product.updateMany({
        where: { category: 'lens', description: 'spherical' },
        data: {
            distributorPriceByDk: {
                '100': 17500,
                '125': 18500,
                '180': 20500,
            },
        },
    });
    console.log(`✅ Spherical lenses updated (${spherical.count} record)`);

    // 3. Toric lenses — distributor prices by DK
    const toric = await prisma.product.updateMany({
        where: { category: 'lens', description: 'toric' },
        data: {
            distributorPriceByDk: {
                '100': 18500,
                '125': 19500,
                '180': 21500,
            },
        },
    });
    console.log(`✅ Toric lenses updated (${toric.count} record)`);

    // 4. Print current state
    const allLens = await prisma.product.findMany({
        where: { category: 'lens' },
        select: { name: true, sku: true, description: true, price: true, priceByDk: true, distributorPriceByDk: true },
    });

    console.log('\n📋 Current lens catalog:');
    for (const p of allLens) {
        console.log(`  ${p.name}`);
        console.log(`    sku: ${p.sku || '-'}, desc: ${p.description || '-'}`);
        console.log(`    price: ${p.price}`);
        console.log(`    priceByDk: ${JSON.stringify(p.priceByDk)}`);
        console.log(`    distributorPriceByDk: ${JSON.stringify(p.distributorPriceByDk)}`);
    }
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
