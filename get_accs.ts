import * as fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf-8');
envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        let val = match[2];
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        process.env[match[1]] = val;
    }
});

async function main() {
    const { default: prisma } = await import('./src/lib/db/prisma');
    const users = await prisma.user.findMany({
        where: {
            subRole: { in: ['optic_doctor', 'sales_manager', 'optic_manager'] }
        },
        select: {
            fullName: true,
            email: true,
            subRole: true,
            password: true
        }
    });
    console.log("USERS:");
    users.forEach(u => {
        console.log(`- ${u.fullName} (${u.subRole}): ${u.email}`);
    });
}
main();
