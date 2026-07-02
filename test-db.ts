import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const consultations = await prisma.consultation.findMany({
        where: {
            OR: [
                { diagnosis: { contains: 'каспий', mode: 'insensitive' } },
                { treatment: { contains: 'каспий', mode: 'insensitive' } },
                { diagnosis: { contains: 'цкк', mode: 'insensitive' } },
                { treatment: { contains: 'цкк', mode: 'insensitive' } }
            ]
        }
    });
    console.log(`Found ${consultations.length} records`);
    if(consultations.length > 0) console.log(consultations.map(c => ({id: c.id, d: c.diagnosis, t: c.treatment})));
}
main().finally(() => prisma.$disconnect());
