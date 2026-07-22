import 'dotenv/config';
import prisma from '../src/lib/db/prisma';

async function main() {
    const org = await prisma.organization.findFirst({ where: { name: 'Оптика Народная' } });
    const meta: any = org?.metadata;
    console.log("Itigris Legacy Config:", !!meta?.itigrisLegacy || !!meta?.itigrisRemote);
}

main().finally(() => prisma.$disconnect());
