import 'dotenv/config';
import prisma from './src/lib/db/prisma';

async function main() {
    const queries = [
        { table: 'organizations', column: 'onecWarehouseId', type: 'TEXT' },
        { table: 'patients', column: 'onecContractId', type: 'TEXT' },
        { table: 'products', column: 'onecId', type: 'TEXT' },
        { table: 'optic_products', column: 'onecId', type: 'TEXT' }
    ];

    for (const q of queries) {
        try {
            console.log(`Adding ${q.column} to ${q.table}...`);
            await prisma.$executeRawUnsafe(`ALTER TABLE "${q.table}" ADD COLUMN "${q.column}" ${q.type};`);
            console.log(`Successfully added ${q.column} to ${q.table}.`);
        } catch (e: any) {
            console.log(`Warning (${q.table}.${q.column}):`, e.message);
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
