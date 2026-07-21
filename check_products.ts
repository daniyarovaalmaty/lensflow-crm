import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

async function main() {
    const connStr = process.env.DIRECT_URL || process.env.DATABASE_URL!;
    const pool = new pg.Pool({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    // 1. Find all orgs related to "Оптика Народная"
    console.log('=== ORGANIZATIONS ===');
    const orgs = await prisma.organization.findMany({
        select: { id: true, name: true, email: true },
    });
    for (const o of orgs) {
        console.log(`  ${o.name} | ${o.email} | ${o.id}`);
    }

    // 2. Count products per org
    console.log('\n=== PRODUCTS PER ORG ===');
    for (const o of orgs) {
        const count = await (prisma as any).opticProduct.count({
            where: { organizationId: o.id },
        });
        if (count > 0) {
            console.log(`  ${o.name}: ${count} products`);
            
            // Show sample products
            const samples = await (prisma as any).opticProduct.findMany({
                where: { organizationId: o.id },
                take: 10,
                select: { id: true, name: true, sku: true, category: true, currentStock: true, retailPrice: true, brand: true, specs: true },
                orderBy: { currentStock: 'desc' },
            });
            for (const p of samples) {
                const src = p.specs?.source || 'manual';
                console.log(`    [${p.category}] ${p.name} | SKU: ${p.sku} | Stock: ${p.currentStock} | Price: ${p.retailPrice} | Source: ${src}`);
            }

            // Count by category
            const cats = await (prisma as any).opticProduct.groupBy({
                by: ['category'],
                where: { organizationId: o.id },
                _count: true,
                _sum: { currentStock: true },
            });
            console.log('\n  Categories:');
            for (const c of cats) {
                console.log(`    ${c.category}: ${c._count} products, total stock: ${c._sum.currentStock || 0}`);
            }
        }
    }

    // 3. Check if there are branches/stores linked
    console.log('\n=== BRANCHES ===');
    for (const o of orgs) {
        try {
            const branches = await (prisma as any).branch.findMany({
                where: { organizationId: o.id },
                select: { id: true, name: true, address: true, city: true },
            });
            if (branches.length > 0) {
                console.log(`  ${o.name}:`);
                for (const b of branches) {
                    console.log(`    ${b.name} | ${b.city || ''} ${b.address || ''} | id: ${b.id}`);
                }
            }
        } catch {
            // Branch model may not exist
        }
    }

    // 4. Check StockItems if they exist
    console.log('\n=== STOCK ITEMS ===');
    for (const o of orgs) {
        try {
            const stockCount = await (prisma as any).stockItem.count({
                where: { organizationId: o.id },
            });
            if (stockCount > 0) {
                console.log(`  ${o.name}: ${stockCount} stock items`);
            }
        } catch {
            // model may not exist
        }
    }

    await prisma.$disconnect();
    await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
