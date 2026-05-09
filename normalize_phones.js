const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function normalizePhone(phone) {
    if (!phone) return phone;
    let digits = phone.replace(/\D/g, '');
    if (digits.startsWith('8') && digits.length === 11) digits = '7' + digits.slice(1);
    if (digits.length === 10) digits = '7' + digits;
    return '+' + digits;
}

async function run() {
    const users = await prisma.user.findMany();
    let updated = 0;
    for (const user of users) {
        if (user.phone) {
            const normalized = normalizePhone(user.phone);
            if (user.phone !== normalized) {
                console.log(`Updating user ${user.email} phone: ${user.phone} -> ${normalized}`);
                try {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { phone: normalized }
                    });
                    updated++;
                } catch (e) {
                    console.log('Error updating', user.email, e.message);
                }
            }
        }
    }
    console.log('Updated', updated, 'users.');
}

run().catch(console.error).finally(() => prisma.$disconnect());
