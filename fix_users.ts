import 'dotenv/config';
import prisma from './src/lib/db/prisma';
import bcrypt from 'bcryptjs';

async function main() {
    console.log('Fixing users...');
    
    const managerEmail = 'optika.narodnaya.astana@gmail.com';
    const procurementEmail = 'zakazy.optika.narodnaya@gmail.com';

    // Update manager
    const manager = await prisma.user.update({
        where: { email: managerEmail },
        data: { subRole: 'optic_manager' },
        include: { organization: true }
    });
    console.log(`Updated manager: ${manager.email} to optic_manager, orgId: ${manager.organizationId}`);

    // Create or update procurement
    const existingProc = await prisma.user.findUnique({ where: { email: procurementEmail } });
    if (existingProc) {
        await prisma.user.update({
            where: { email: procurementEmail },
            data: { subRole: 'optic_procurement', organizationId: manager.organizationId }
        });
        console.log(`Updated procurement: ${procurementEmail} to optic_procurement`);
    } else {
        const hashedPassword = await bcrypt.hash('123456', 10);
        await prisma.user.create({
            data: {
                email: procurementEmail,
                password: hashedPassword,
                fullName: 'Отдел закупа',
                role: 'optic',
                subRole: 'optic_procurement',
                status: 'active',
                organizationId: manager.organizationId
            }
        });
        console.log(`Created procurement: ${procurementEmail} with default password '123456'`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
