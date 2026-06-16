import 'dotenv/config';
import prisma from './src/lib/db/prisma';

async function main() {
    console.log('Adding ЦКК laboratory...');
    const existing = await prisma.organization.findFirst({
        where: { name: 'ЦКК' }
    });
    
    if (existing) {
        console.log('ЦКК already exists:', existing);
        return;
    }
    
    const lab = await prisma.organization.create({
        data: {
            name: 'ЦКК',
            type: 'laboratory',
            discountPercent: 0,
        }
    });
    
    console.log('Successfully created ЦКК laboratory:', lab);
}

main().finally(() => prisma.$disconnect());
