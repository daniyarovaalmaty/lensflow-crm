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
    const appts = await prisma.appointment.findMany({
        where: {
            OR: [
                { patientName: { contains: 'шошина', mode: 'insensitive' } },
                { patient: { name: { contains: 'шошина', mode: 'insensitive' } } }
            ]
        },
        include: { patient: true }
    });
    console.log("Appointments found:");
    appts.forEach(a => console.log(`- Appt ID: ${a.id} | PatientName: ${a.patientName} | Linked Patient ID: ${a.patientId}`));
}
main();
