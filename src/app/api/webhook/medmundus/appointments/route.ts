import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function POST(req: NextRequest) {
    try {
        const bridgeKey = req.headers.get('x-bridge-key');
        const expectedKey = process.env.LENSFLOW_BRIDGE_KEY;

        if (!expectedKey || bridgeKey !== expectedKey) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await req.json();
        
        const {
            appointmentId,
            appointmentDate,
            patientPhone,
            patientName,
            doctorId,      // Could be ID or null
            clinicId,      // LensFlow clinic organization ID, if linked
            notes
        } = data;

        if (!appointmentId || !patientPhone) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Clean phone number
        const cleanPhone = patientPhone.replace(/\\D/g, '');
        const phoneWithSuffix = `${cleanPhone}@c.us`;

        // Check if doctor exists by email
        let resolvedDoctorId = null;
        if (doctorId && typeof doctorId === 'string' && doctorId.includes('@')) {
            const doc = await prisma.user.findUnique({ where: { email: doctorId } });
            if (doc) resolvedDoctorId = doc.id;
        } else {
            resolvedDoctorId = doctorId;
        }

        // Check if we have a Lead with this medmundusAppointmentId already
        const existingByApptId = await prisma.lead.findUnique({
            where: { medmundusAppointmentId: String(appointmentId) }
        });

        if (existingByApptId) {
            // Update existing appointment
            await prisma.lead.update({
                where: { id: existingByApptId.id },
                data: {
                    appointmentAt: appointmentDate ? new Date(appointmentDate) : null,
                    appointmentNotes: notes,
                    doctorId: resolvedDoctorId || existingByApptId.doctorId,
                    clinicId: clinicId || existingByApptId.clinicId,
                    stage: 'appointment', // update stage to scheduled
                }
            });
            return NextResponse.json({ success: true, action: 'updated', id: existingByApptId.id });
        }

        // Otherwise, look for an existing lead by phone
        const existingByPhone = await prisma.lead.findFirst({
            where: { phone: phoneWithSuffix },
            orderBy: { createdAt: 'desc' }
        });

        if (existingByPhone) {
            await prisma.lead.update({
                where: { id: existingByPhone.id },
                data: {
                    medmundusAppointmentId: String(appointmentId),
                    appointmentAt: appointmentDate ? new Date(appointmentDate) : null,
                    appointmentNotes: notes,
                    doctorId: resolvedDoctorId || existingByPhone.doctorId,
                    clinicId: clinicId || existingByPhone.clinicId,
                    stage: 'appointment',
                }
            });
            return NextResponse.json({ success: true, action: 'updated_by_phone', id: existingByPhone.id });
        }

        // If no lead exists at all, create a new one
        const newLead = await prisma.lead.create({
            data: {
                phone: phoneWithSuffix,
                name: patientName,
                source: 'whatsapp',
                funnel: 'sales',
                stage: 'appointment',
                medmundusAppointmentId: String(appointmentId),
                appointmentAt: appointmentDate ? new Date(appointmentDate) : null,
                appointmentNotes: notes,
                doctorId: resolvedDoctorId || null,
                clinicId: clinicId || null,
            }
        });

        return NextResponse.json({ success: true, action: 'created', id: newLead.id });

    } catch (error) {
        console.error('[MedMundus Webhook Error]:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
