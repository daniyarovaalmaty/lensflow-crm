import 'dotenv/config';
import prisma from './src/lib/db/prisma';

async function main() {
    const orgId = '1d26985e-6822-432e-a810-941cb93b1baa';
    const org = await prisma.organization.findUnique({ where: { id: orgId }, include: { users: true } });
    console.log('Org with orders:', org?.name);
    console.log('Users in this org:', org?.users.map(u => u.email));
}
main().catch(console.error).finally(() => prisma.$disconnect());
