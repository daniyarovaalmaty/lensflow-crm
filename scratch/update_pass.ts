import 'dotenv/config';
import prisma from '../src/lib/db/prisma';
import bcrypt from 'bcryptjs';

async function main() {
    const email = 'zakazy.optika.narodnaya@gmail.com';
    const newPassword = 'Password123!';
    
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        console.log('User not found:', email);
        return;
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await prisma.user.update({
        where: { email },
        data: { password: hashedPassword }
    });
    
    console.log('Password updated successfully for', email);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
