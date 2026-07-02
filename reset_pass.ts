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

import * as bcrypt from 'bcryptjs';

async function main() {
    const { default: prisma } = await import('./src/lib/db/prisma');
    const hashedPassword = await bcrypt.hash('123456', 10);
    
    await prisma.user.update({
        where: { email: 'kassa1@neweye.kz' },
        data: { password: hashedPassword }
    });
    
    console.log("Password reset successfully for kassa1@neweye.kz to '123456'");
}
main();
