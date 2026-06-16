import 'dotenv/config';
import prisma from './src/lib/db/prisma';

async function main() {
    const orgs = await prisma.organization.findMany({
        where: { name: { contains: 'ЦКК' } }
    });
    console.log(orgs.map(o => ({ id: o.id, name: o.name, type: o.type })));
    
    const nar = await prisma.organization.findMany({
        where: { name: { contains: 'Народная' } }
    });
    console.log(nar.map(o => ({ id: o.id, name: o.name, type: o.type })));
}
main().catch(console.error).finally(() => prisma.$disconnect());
