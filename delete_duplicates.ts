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
    
    // SAFIRA
    const safiras = await prisma.patient.findMany({
        where: { name: { equals: 'Рахимжан Сафира', mode: 'insensitive' } },
        include: { _count: { select: { orders: true, consultations: true } } }
    });
    
    console.log("Safira records to DELETE:");
    for (const p of safiras) {
        if (p._count.orders === 0 && p._count.consultations === 0) {
            console.log(`Deleting ID: ${p.id}`);
            await prisma.patient.delete({ where: { id: p.id } });
        } else {
            console.log(`KEEPING ID: ${p.id} (Orders: ${p._count.orders}, Consultations: ${p._count.consultations})`);
        }
    }
    
    // SHOSHINA
    const shoshinas = await prisma.patient.findMany({
        where: { name: { equals: 'Шошина Силина', mode: 'insensitive' } },
        include: { _count: { select: { orders: true, consultations: true } } }
    });
    
    console.log("\nShoshina records to DELETE:");
    for (const p of shoshinas) {
        if (p._count.orders === 0 && p._count.consultations === 0) {
            console.log(`Deleting ID: ${p.id}`);
            await prisma.patient.delete({ where: { id: p.id } });
        } else {
            console.log(`KEEPING ID: ${p.id} (Orders: ${p._count.orders}, Consultations: ${p._count.consultations})`);
        }
    }
}
main();
