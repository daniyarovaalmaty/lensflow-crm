import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });
if (process.env.DIRECT_URL) {
    process.env.DATABASE_URL = process.env.DIRECT_URL;
}

async function main() {
    const prismaModule = await import('../src/lib/db/prisma');
    const prisma = prismaModule.default;

    const org = await prisma.organization.findFirst({
        where: { name: { contains: "NEW EYE", mode: "insensitive" } }
    });
    
    if (!org) return console.log("Organization 'NEW EYE' not found!");

    const lera = await prisma.user.findFirst({
        where: { 
            fullName: { contains: "Валерия", mode: "insensitive" },
            organizationId: org.id
        }
    });

    if (!lera) return console.log("User Lera (Валерия) not found!");
    console.log(`Lera found: ${lera.fullName} (${lera.id})`);

    const targetNames = [
        "Шымарова Шахида", "Гаршина Вера", "Гаршина Алина", "Щока Мария",
        "Аспандияркызы Томирис", "Амангельды Даниал", "Иляхун Ханифа", "Адилжан Асыл",
        "Кайрат Адель", "Данат Дарын", "Данияркызы Айару", "Сагида Оспанова",
        "Шынгаева Азиза", "Рыспек Айзара", "Даурынбек Сария", "Сулейменов НУрали",
        "Торебай Айлин", "Абулханова Газиза", "Абулханова Айша"
    ];

    const results = [];

    // Find all appointments for these names in July 2026
    const startDate = new Date('2026-06-30T19:00:00.000Z'); 
    const endDate = new Date('2026-07-31T19:00:00.000Z');

    for (const rawName of targetNames) {
        // Simple search using fuzzy matching or just a contains query on parts of the name
        // Split name into parts and try to find an appointment that matches
        const parts = rawName.split(/\s+/).map(p => p.toLowerCase());
        
        // Find appointments where the patientName matches (case-insensitive substring)
        const appointments = await prisma.appointment.findMany({
            where: {
                clinicId: org.id,
                date: { gte: startDate, lte: endDate }
            },
            include: { createdBy: true }
        });

        const matchedAppts = appointments.filter((a: any) => {
            const aName = (a.patientName || "").toLowerCase();
            // Check if ANY of the parts exist in aName (a bit loose, so let's check if the first part exists at least)
            return parts.some(p => aName.includes(p));
        });

        if (matchedAppts.length === 0) {
            results.push({ name: rawName, status: "NOT FOUND", conflicts: "No appointments found" });
        } else {
            const conflictAppts = [];
            let updatedCount = 0;
            
            for (const appt of matchedAppts) {
                if (appt.createdById !== lera.id) {
                    conflictAppts.push({
                        apptId: appt.id,
                        patientName: appt.patientName,
                        date: appt.date,
                        currentCreator: appt.createdBy ? appt.createdBy.fullName : "None"
                    });
                } else {
                    updatedCount++;
                }
            }
            results.push({
                name: rawName,
                status: conflictAppts.length > 0 ? "CONFLICTS FOUND" : "ALREADY LERA",
                conflicts: conflictAppts,
                matchedAppts: matchedAppts.map((a:any) => ({id: a.id, name: a.patientName, creator: a.createdBy?.fullName}))
            });
        }
    }

    console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error).finally(() => process.exit(0));
