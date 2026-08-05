import { config } from 'dotenv';
config({ path: '.env' });
import prisma from '../src/lib/db/prisma';

async function main() {
    const products = await prisma.product.findMany({
        where: { category: 'lens', isActive: true },
        select: { name: true, name1c: true, priceByDk: true }
    });
    
    console.log('LensFlow Catalog:');
    products.forEach(p => {
        console.log(`- Name: ${p.name}`);
        console.log(`  name1c: ${p.name1c}`);
        console.log(`  DKs:`, p.priceByDk ? Object.keys(p.priceByDk as any).join(', ') : 'none');
    });
    
    process.exit(0);
}

main();
