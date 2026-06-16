import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Adding ЦКК laboratory...');
    
    // Check if it already exists
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

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
