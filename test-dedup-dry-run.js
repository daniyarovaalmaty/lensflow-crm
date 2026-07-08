require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });

async function main() {
    const normalize = (p) => p.replace(/[\s\-\+\(\)]/g, '');

    const all = await prisma.patient.findMany({
        include: {
            prescriptions: true,
            _count: { select: { orders: true, consultations: true, sales: true } },
        },
        orderBy: { createdAt: 'asc' },
    });

    const groups = new Map();
    for (const p of all) {
        if (!p.phone || !p.name) continue;
        const normalizedPhone = normalize(p.phone);
        const normalizedName = p.name.trim().toLowerCase().replace(/\s+/g, ' ');
        if (!normalizedPhone || !normalizedName) continue;
        
        const key = `${normalizedPhone}_${normalizedName}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(p);
    }

    let wouldMerge = 0;
    const mergeDetails = [];

    for (const [key, group] of groups) {
        if (group.length <= 1) continue;
        wouldMerge++;
        
        const master = group.reduce((best, cur) => {
            const bestScore = (best._count.orders > 0 ? 100 : 0) + (best.medmundusId ? 50 : 0) + (best.name.includes(' ') ? 10 : 0);
            const curScore = (cur._count.orders > 0 ? 100 : 0) + (cur.medmundusId ? 50 : 0) + (cur.name.includes(' ') ? 10 : 0);
            return curScore > bestScore ? cur : best;
        });

        const duplicates = group.filter(p => p.id !== master.id);
        
        mergeDetails.push({
            groupKey: key,
            master: { name: master.name, phone: master.phone, id: master.id, countOrders: master._count.orders },
            duplicates: duplicates.map(d => ({ name: d.name, phone: d.phone, id: d.id, countOrders: d._count.orders, countSales: d._count.sales }))
        });
    }

    console.log(`Dry-run finished. Groups to merge: ${wouldMerge}`);
    console.log(JSON.stringify(mergeDetails, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
