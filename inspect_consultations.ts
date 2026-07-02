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
    
    const patients = await prisma.patient.findMany({
        where: { name: { contains: 'шошин', mode: 'insensitive' } },
        include: {
            consultations: true,
            orders: true
        }
    });
    
    patients.forEach(p => {
        if (p.consultations.length > 0 || p.orders.length > 0) {
            console.log(`ID: ${p.id} | Name: ${p.name}`);
            console.log(`   Orders: ${p.orders.length}`);
            console.log(`   Consultations: ${p.consultations.length}`);
        }
    });
}
main();
