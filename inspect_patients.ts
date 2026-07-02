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
    
    console.log("--- РАХИМЖАН САФИРА ---");
    const safira = await prisma.patient.findMany({
        where: { name: { contains: 'сафира', mode: 'insensitive' } },
        include: { _count: { select: { orders: true, appointments: true, prescriptions: true } } }
    });
    safira.forEach(p => console.log(`ID: ${p.id} | Name: ${p.name} | Orders: ${p._count.orders} | Appointments: ${p._count.appointments}`));

    console.log("\n--- ШОШИНА СИЛИНА ---");
    const shoshina = await prisma.patient.findMany({
        where: { name: { contains: 'шошина', mode: 'insensitive' } },
        include: { _count: { select: { orders: true, appointments: true, prescriptions: true } } }
    });
    shoshina.forEach(p => console.log(`ID: ${p.id} | Name: ${p.name} | Orders: ${p._count.orders} | Appointments: ${p._count.appointments}`));
}
main();
