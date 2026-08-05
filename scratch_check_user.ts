import 'dotenv/config';
import prisma from './src/lib/db/prisma';

async function main() {
    const user = await prisma.user.findUnique({
        where: { email: 'head@medinvision.kz' }
    });
    
    if (user) {
        console.log(`User found: ${user.email}, ID: ${user.id}`);
        console.log(`Status: ${user.status}`);
    } else {
        console.log('User head@medinvision.kz not found in this database.');
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
