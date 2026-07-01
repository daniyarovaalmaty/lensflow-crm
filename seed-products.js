/**
 * seed-products.js
 *
 * Заполняет каталог линз если он пустой.
 * Запускать: node seed-products.js
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
});

const products = [
    // Пробная линза DK 50
    {
        id: 'prod-trial-dk50',
        name: 'Линза КЖК ортокератологическая MediLens пробная',
        category: 'lens',
        sku: 'ML-TRIAL-DK50',
        name1c: 'Линзы контактные жесткие корригирующие ОКV - RGP пробная',
        code: '796',
        description: 'trial',
        price: 12000,               // Цена для оптик/клиник
        priceByDk: null,
        distributorPriceByDk: { '50': 7600 },  // Цена для дистрибьютора
        unit: 'шт',
        sortOrder: 1,
    },
    // Сферическая линза
    {
        id: 'prod-spherical',
        name: 'Ортокератологическая линза MediLens — Сферическая',
        category: 'lens',
        sku: 'ML-SPHERICAL',
        name1c: 'Линзы контактные жесткие корригирующие ОКV - RGP сферическая',
        code: '797',
        description: 'spherical',
        price: 20000,               // Базовая цена (если нет priceByDk)
        priceByDk: { '100': 17500, '125': 18500, '180': 20500 },
        distributorPriceByDk: { '100': 17500, '125': 18500, '180': 20500 },
        unit: 'шт',
        sortOrder: 2,
    },
    // Торическая линза
    {
        id: 'prod-toric',
        name: 'Ортокератологическая линза MediLens — Торическая',
        category: 'lens',
        sku: 'ML-TORIC',
        name1c: 'Линзы контактные жесткие корригирующие ОКV - RGP торическая',
        code: '798',
        description: 'toric',
        price: 21500,               // Базовая цена
        priceByDk: { '100': 18500, '125': 19500, '180': 21500 },
        distributorPriceByDk: { '100': 18500, '125': 19500, '180': 21500 },
        unit: 'шт',
        sortOrder: 3,
    },
    // Диагностический набор DK 50 (14 шт)
    {
        id: 'prod-diag-dk50',
        name: 'Диагностический набор для врача 14 штук DK 50',
        category: 'lens',
        sku: 'ML-DIAG-DK50',
        name1c: 'Диагностический набор (Линзы КЖК OKV-RGP пробная DK 50 из 14 шт.)',
        code: '799',
        description: null,
        price: 100000,
        priceByDk: null,
        distributorPriceByDk: null,
        unit: 'компл',
        sortOrder: 10,
    },
    // Стартовый набор 140 линз
    {
        id: 'prod-starter-140',
        name: 'Стартовый набор MedInVision 140 линз',
        category: 'lens',
        sku: 'ML-STARTER-140',
        name1c: 'Диагностический набор линз ЖКК OKV-RGP OK (140 шт.)',
        code: '800',
        description: null,
        price: 1000000,
        priceByDk: null,
        distributorPriceByDk: null,
        unit: 'компл',
        sortOrder: 11,
    },
];

async function run() {
    const client = await pool.connect();
    try {
        console.log('🔄 Seeding products catalog...\n');

        for (const p of products) {
            await client.query(`
                INSERT INTO "products" (
                    id, name, category, sku, "name1c", code, description,
                    price, "priceByDk", "distributorPriceByDk",
                    unit, "isActive", "sortOrder", "createdAt", "updatedAt"
                )
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true,$12,NOW(),NOW())
                ON CONFLICT (sku) DO UPDATE SET
                    name = EXCLUDED.name,
                    price = EXCLUDED.price,
                    "priceByDk" = EXCLUDED."priceByDk",
                    "distributorPriceByDk" = EXCLUDED."distributorPriceByDk",
                    "isActive" = true,
                    "updatedAt" = NOW();
            `, [
                p.id, p.name, p.category, p.sku, p.name1c, p.code, p.description,
                p.price,
                p.priceByDk ? JSON.stringify(p.priceByDk) : null,
                p.distributorPriceByDk ? JSON.stringify(p.distributorPriceByDk) : null,
                p.unit, p.sortOrder,
            ]);
            console.log(`✅ ${p.name}`);
            console.log(`   price: ${p.price} ₸ | priceByDk: ${JSON.stringify(p.priceByDk)} | distributorPriceByDk: ${JSON.stringify(p.distributorPriceByDk)}`);
        }

        console.log('\n🎉 Products seeded successfully!');

    } catch (err) {
        console.error('\n❌ Error:', err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
