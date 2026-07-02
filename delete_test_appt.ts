import { config } from 'dotenv';
config({ path: '.env.local' });
import prisma from './src/lib/db/prisma';

async function main() {
    const appts = await prisma.appointment.findMany({
        where: {
            patientName: { contains: 'тест', mode: 'insensitive' }
        }
    });
    console.log("Appointments to delete:", appts.map(a => a.id + ' ' + a.patientName));
    
    for (const a of appts) {
        if (a.patientName?.toLowerCase().includes('тест')) {
            await prisma.appointment.delete({ where: { id: a.id } });
            console.log("Deleted", a.id);
        }
    }
}
main();
