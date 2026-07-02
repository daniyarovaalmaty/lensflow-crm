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
    const patientsWithAppts = await prisma.patient.findMany({
        where: { name: { contains: 'шошин', mode: 'insensitive' } },
        include: { _count: { select: { appointments: true } } }
    });
    
    patientsWithAppts.forEach(p => {
        if (p._count.appointments > 0) {
            console.log(`Found: ${p.name} | Appointments: ${p._count.appointments}`);
        }
    });
}
main();
