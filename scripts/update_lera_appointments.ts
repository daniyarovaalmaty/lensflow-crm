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
    if (!org) return console.log("Organization not found!");

    const lera = await prisma.user.findFirst({
        where: { fullName: { contains: "Валерия", mode: "insensitive" }, organizationId: org.id }
    });
    if (!lera) return console.log("Lera not found!");

    // Let's use broader regex/substring matching for the not found ones
    const searchTerms = [
        "Шымарова", "Шахида", // Шымарова Шахида
        "Гаршина Вера", "Гаршина Алина", "Гаршины", // Гаршина Вера, Алина
        "Щока", "Мария", // Щока Мария
        "Аспандияр", "Томирис", // Аспандияркызы Томирис
        "Амангельды", "Даниал", "Даниял", // Амангельды Даниал
        "Иляхун", "Ханифа", // Иляхун Ханифа
        "Адилжан", "Адилжал", "Асыл", // Адилжан Асыл
        "Кайрат", "Адель", // Кайрат Адель
        "Данат", "Данап", "Дарын", // Данат Дарын
        "Данияркызы", "Айару", // Данияркызы Айару
        "Сагида", "Оспанова", // Сагида Оспанова
        "Шынгаева", "Азиза", // Шынгаева Азиза
        "Рыспек", "Айзара", // Рыспек Айзара
        "Даурынбек", "Дауринбек", "Сария", // Даурынбек Сария
        "Сулейменов", "Сулейманов", "Нурали", "НУрали", // Сулейменов НУрали
        "Торебай", "Айлин", // Торебай Айлин
        "Абулханова", "Абуханова", "Газиза", // Абулханова Газиза
        "Абулханова", "Абуханова", "Айша" // Абулханова Айша
    ];

    const startDate = new Date('2026-06-30T19:00:00.000Z'); 
    const endDate = new Date('2026-07-31T19:00:00.000Z');

    const appointments = await prisma.appointment.findMany({
        where: { clinicId: org.id, date: { gte: startDate, lte: endDate } },
        include: { createdBy: true }
    });

    let updatedCount = 0;
    const updatedPatients = new Set();

    for (const appt of appointments) {
        if (!appt.patientName) continue;
        const nameLower = appt.patientName.toLowerCase();
        
        let match = false;
        
        // Exact full name match logic per person to avoid false positives
        if (nameLower.includes("шымарова") || nameLower.includes("шахида")) match = true;
        if (nameLower.includes("гаршина") || nameLower.includes("гаршины")) match = true;
        if (nameLower.includes("щока") || (nameLower.includes("мария") && appt.patientName.includes("Щока"))) match = true;
        if (nameLower.includes("аспандияр") || nameLower.includes("томирис")) match = true;
        if (nameLower.includes("амангельды") && (nameLower.includes("даниал") || nameLower.includes("даниял"))) match = true;
        if (nameLower.includes("иляхун") && nameLower.includes("ханифа")) match = true;
        if ((nameLower.includes("адилжан") || nameLower.includes("адилжал")) && nameLower.includes("асыл")) match = true;
        if (nameLower.includes("кайрат") && nameLower.includes("адель")) match = true;
        if ((nameLower.includes("данат") || nameLower.includes("данап")) && nameLower.includes("дарын")) match = true;
        if (nameLower.includes("данияркызы") && nameLower.includes("айару")) match = true;
        if (nameLower.includes("сагида") || nameLower.includes("оспанова")) match = true;
        if (nameLower.includes("шынгаева") && nameLower.includes("азиза")) match = true;
        if (nameLower.includes("рыспек") && nameLower.includes("айзара")) match = true;
        if ((nameLower.includes("даурынбек") || nameLower.includes("дауринбек")) && nameLower.includes("сария")) match = true;
        if ((nameLower.includes("сулейменов") || nameLower.includes("сулейманов")) && nameLower.includes("нурали")) match = true;
        if (nameLower.includes("торебай") && nameLower.includes("айлин")) match = true;
        if ((nameLower.includes("абулханова") || nameLower.includes("абуханова")) && nameLower.includes("газиза")) match = true;
        if ((nameLower.includes("абулханова") || nameLower.includes("абуханова")) && nameLower.includes("айша")) match = true;

        if (match) {
            if (appt.createdById !== lera.id) {
                console.log(`Reassigning: ${appt.patientName} (was ${appt.createdBy?.fullName || 'None'}) -> Lera`);
                await prisma.appointment.update({
                    where: { id: appt.id },
                    data: { createdById: lera.id }
                });
                updatedCount++;
            }
            updatedPatients.add(appt.patientName);
        }
    }

    console.log(`Successfully reassigned ${updatedCount} appointments to Lera.`);
    console.log("Matched patient records:", Array.from(updatedPatients));
}
main().catch(console.error).finally(() => process.exit(0));
