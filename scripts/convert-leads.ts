import prisma from '../src/lib/db/prisma';

async function main() {
    console.log("Starting lead to consultation conversion...");

    // 1. Get "New Eye" Organization
    const clinic = await prisma.organization.findFirst({
        where: { name: { contains: 'New Eye', mode: 'insensitive' } }
    });

    if (!clinic) {
        throw new Error("New Eye organization not found");
    }

    // 2. Get Doctor
    const doctor = await prisma.user.findFirst({
        where: { organizationId: clinic.id, subRole: 'optic_doctor' }
    });

    if (!doctor) {
        throw new Error("Doctor not found for New Eye");
    }

    console.log(`Using Doctor: ${doctor.email} (${doctor.id})`);

    // 3. Find all Leads for this clinic
    const leads = await prisma.lead.findMany({
        where: { clinicId: clinic.id },
        include: { patient: true }
    });

    console.log(`Found ${leads.length} leads. Creating consultations...`);

    let count = 0;
    for (const lead of leads) {
        if (!lead.patientId || !lead.patient) continue;

        // Parse notes to extract diagnosis and comments
        // Format was: Диагноз: {diagnosis}\nКомментарии: {comments}\nОплатить ЦКК: {cck}
        let diagnosis = '';
        let notes = lead.notes || '';
        
        const lines = notes.split('\n');
        for (const line of lines) {
            if (line.startsWith('Диагноз: ')) {
                diagnosis = line.replace('Диагноз: ', '').trim();
            }
        }

        // Check if consultation already exists to prevent duplicates
        const existing = await prisma.consultation.findFirst({
            where: {
                patientId: lead.patientId,
                visitDate: lead.createdAt
            }
        });

        if (!existing) {
            await prisma.consultation.create({
                data: {
                    patientId: lead.patientId,
                    doctorId: doctor.id,
                    visitDate: lead.createdAt,
                    type: 'exam',
                    diagnosis: diagnosis,
                    notes: lead.notes, // keep full notes just in case
                }
            });
            count++;
        }

        // Update patient to set doctorId if missing
        if (!lead.patient.doctorId) {
            await prisma.patient.update({
                where: { id: lead.patientId },
                data: { doctorId: doctor.id }
            });
        }
    }

    console.log(`Successfully created ${count} consultations and assigned doctor.`);
}

main()
    .catch(e => {
        console.error("Conversion failed", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
