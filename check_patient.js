const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const patients = await prisma.patient.findMany({
        where: {
            name: {
                contains: 'Ахмет',
                mode: 'insensitive'
            }
        },
        include: {
            orders: true,
            sales: {
                include: {
                    items: true
                }
            }
        }
    });

    console.log(JSON.stringify(patients, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
