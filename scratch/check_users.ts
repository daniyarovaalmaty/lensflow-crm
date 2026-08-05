import 'dotenv/config';
import prisma from '../src/lib/db/prisma';

async function main() {
    const users = await prisma.user.findMany({
        where: {
            email: { in: ['zakazy.optika.narodnaya@gmail.com', 'optika.narodnaya.astana@gmail.com'] }
        },
        select: {
            email: true,
            role: true,
            subRole: true,
            organizationId: true,
            organization: { select: { type: true, name: true } },
            branches: true
        }
    });
    console.log(JSON.stringify(users, null, 2));
}

main().finally(() => prisma.$disconnect());
