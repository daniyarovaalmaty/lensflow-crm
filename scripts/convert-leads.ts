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
    const batchSize = 50;
    for (let i = 0; i < leads.length; i += batchSize) {
        const batch = leads.slice(i, i + batchSize);
        console.log(`Processing batch ${i / batchSize + 1} of ${Math.ceil(leads.length / batchSize)}...`);
        
        for (const lead of batch) {
            if (!lead.patientId || !lead.patient) continue;

            let diagnosis = '';
            let notes = lead.notes || '';
            const lines = notes.split('\n');
            for (const line of lines) {
                if (line.startsWith('Диагноз: ')) {
                    diagnosis = line.replace('Диагноз: ', '').trim();
                }
            }

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
                        notes: lead.notes,
                    }
                });
                count++;
            }

            if (!lead.patient.doctorId) {
                await prisma.patient.update({
                    where: { id: lead.patientId },
                    data: { doctorId: doctor.id }
                });
            }
        }
        // Small delay between batches to let connection pool breathe
        await new Promise(resolve => setTimeout(resolve, 100));
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
