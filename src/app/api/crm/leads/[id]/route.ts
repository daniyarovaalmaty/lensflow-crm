import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

// GET /api/crm/leads/[id] — get single lead with full details
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const lead = await prisma.lead.findUnique({
        where: { id },
        include: {
            assignee: { select: { id: true, fullName: true, avatar: true, email: true } },
            clinic: { select: { id: true, name: true, phone: true, city: true } },
            order: { select: { id: true, orderNumber: true, status: true, totalPrice: true } },
            patient: { select: { id: true, name: true, phone: true } },
            messages: {
                orderBy: { sentAt: 'asc' },
                take: 100,
            },
            reminders: {
                orderBy: { scheduledAt: 'asc' },
            },
            activities: {
                orderBy: { createdAt: 'desc' },
                take: 50,
            },
        },
    });

    if (!lead) {
        return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json(lead);
}

// PATCH /api/crm/leads/[id] — update lead
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) {
        return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const {
        name, city, stage, assigneeId, clinicId,
        appointmentAt, appointmentNotes, lostReason, notes, tags, revenue, acquisitionCost, patientId,
    } = body;

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (city !== undefined) data.city = city;
    if (assigneeId !== undefined) data.assigneeId = assigneeId;
    if (clinicId !== undefined) data.clinicId = clinicId;
    if (appointmentAt !== undefined) data.appointmentAt = appointmentAt ? new Date(appointmentAt) : null;
    if (appointmentNotes !== undefined) data.appointmentNotes = appointmentNotes;
    if (lostReason !== undefined) data.lostReason = lostReason;
    if (notes !== undefined) data.notes = notes;
    if (tags !== undefined) data.tags = tags;
    if (revenue !== undefined) data.revenue = revenue;
    if (acquisitionCost !== undefined) data.acquisitionCost = Number(acquisitionCost) || 0;
    if (patientId !== undefined) data.patientId = patientId;

    // Stage change — log activity
    if (stage && stage !== existing.stage) {
        data.stage = stage;

        // Auto-create patient only when lead reaches 'appointment' stage
        // (if not already linked to a patient)
        const shouldCreatePatient =
            stage === 'appointment' &&
            !existing.patientId &&
            (existing.name || body.name);

        if (shouldCreatePatient) {
            const leadName = (body.name || existing.name || '').trim();
            const leadPhone = existing.phone.replace('@c.us', '').trim();

            // Check if patient with this phone already exists in this clinic
            const existingPatient = await prisma.patient.findFirst({
                where: {
                    phone: { contains: leadPhone.slice(-9) },
                    ...(existing.clinicId ? { organizationId: existing.clinicId } : {}),
                },
            });

            if (existingPatient) {
                // Link lead to existing patient
                data.patientId = existingPatient.id;
            } else if (leadName) {
                // Create new patient from lead data
                const newPatient = await prisma.patient.create({
                    data: {
                        name: leadName,
                        phone: leadPhone,
                        organizationId: existing.clinicId || null,
                        notes: existing.notes || null,
                    },
                });
                data.patientId = newPatient.id;
            }
        }

        if (stage === 'converted') {
            data.convertedAt = new Date();

            // Auto-create retention lead
            if (existing.funnel === 'sales') {
                const existingRetention = await prisma.lead.findFirst({ where: { phone: existing.phone, funnel: 'retention' } });
                if (!existingRetention) {
                    await prisma.lead.create({
                        data: {
                            phone: existing.phone,
                            name: existing.name,
                            city: existing.city,
                            source: existing.source,
                            funnel: 'retention',
                            stage: 'checkup',
                            clinicId: existing.clinicId,
                            lastLensPurchaseDate: new Date(),
                        }
                    });
                }
            }
        }

        await prisma.leadActivity.create({
            data: {
                leadId: id,
                action: 'stage_change',
                details: `Стадия: ${existing.stage} → ${stage}`,
                userId: body.userId || null,
            },
        });
    }

    const updated = await prisma.lead.update({
        where: { id },
        data,
        include: {
            assignee: { select: { id: true, fullName: true } },
            clinic: { select: { id: true, name: true } },
        },
    });

    return NextResponse.json(updated);
}

// DELETE /api/crm/leads/[id] — delete lead
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    await prisma.lead.delete({ where: { id } }).catch(() => null);

    return NextResponse.json({ deleted: true });
}
