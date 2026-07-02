import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
    try {
        const salesToDelete = ['S-ORG--0082', 'S-ORG--0080', 'INV-ORG--0079', 'INV-ORG--0078'];
        const patientNames = ['тест2', 'тест3', 'тест4', 'тест 4', 'тест 3', 'тест 2'];

        console.log('--- STARTING CLEANUP ---');

        // Find Sales
        const sales = await prisma.sale.findMany({
            where: { saleNumber: { in: salesToDelete } }
        });
        const saleIds = sales.map(s => s.id);
        
        console.log(`Found ${sales.length} sales to delete.`);

        // Delete Sales
        if (saleIds.length > 0) {
            await prisma.sale.deleteMany({
                where: { id: { in: saleIds } }
            });
            console.log('Sales deleted.');
        }

        // Find Patients
        const patients = await prisma.patient.findMany({
            where: { fullName: { in: patientNames } }
        });
        const patientIds = patients.map(p => p.id);

        console.log(`Found ${patients.length} patients to delete:`, patients.map(p => p.fullName));

        if (patientIds.length > 0) {
            // Delete patient appointments
            const deletedAppts = await prisma.appointment.deleteMany({
                where: { patientId: { in: patientIds } }
            });
            console.log(`Deleted ${deletedAppts.count} appointments.`);

            // Delete patient prescriptions
            const deletedPrescriptions = await prisma.prescription.deleteMany({
                where: { patientId: { in: patientIds } }
            });
            console.log(`Deleted ${deletedPrescriptions.count} prescriptions.`);

            // Delete patients
            const deletedPatients = await prisma.patient.deleteMany({
                where: { id: { in: patientIds } }
            });
            console.log(`Deleted ${deletedPatients.count} patients.`);
        }

        return NextResponse.json({ success: true, message: 'Cleanup complete' });

    } catch (error: any) {
        console.error('Cleanup Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
