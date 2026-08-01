import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });
if (process.env.DIRECT_URL) { process.env.DATABASE_URL = process.env.DIRECT_URL; }

async function main() {
    const prismaModule = await import('../src/lib/db/prisma');
    const prisma = prismaModule.default;

    const org = await prisma.organization.findFirst({ where: { name: { contains: "NEW EYE", mode: "insensitive" } } });
    const startDate = new Date('2026-06-30T19:00:00.000Z'); 
    const endDate = new Date('2026-07-31T19:00:00.000Z');

    const sales = await prisma.sale.findMany({
        where: { organizationId: org.id, createdAt: { gte: startDate, lte: endDate } }
    });

    const itemNames = new Set<string>();
    for (const sale of sales) {
        if (!sale.items || !Array.isArray(sale.items)) continue;
        for (const item of sale.items as any[]) {
            if (item.name) itemNames.add(item.name);
        }
    }
    
    console.log("=== Unique items sold in July in NEW EYE ===");
    itemNames.forEach(name => console.log(name));
}
main().catch(console.error).finally(() => process.exit(0));
