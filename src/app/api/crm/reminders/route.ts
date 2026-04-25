import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { sendWhatsAppMessage } from '@/lib/greenApi';

// GET /api/crm/reminders — list pending reminders
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'pending';
    const leadId = searchParams.get('leadId');

    const where: any = {};
    if (status) where.status = status;
    if (leadId) where.leadId = leadId;

    const reminders = await prisma.reminder.findMany({
        where,
        include: {
            lead: {
                select: { id: true, name: true, phone: true },
            },
        },
        orderBy: { scheduledAt: 'asc' },
    });

    return NextResponse.json(reminders);
}

// POST /api/crm/reminders/send — process and send due reminders
// Called by cron job or manually
export async function POST(req: NextRequest) {
    const now = new Date();

    // Find all pending reminders that are due
    const dueReminders = await prisma.reminder.findMany({
        where: {
            status: 'pending',
            scheduledAt: { lte: now },
        },
        include: {
            lead: {
                select: { id: true, phone: true, name: true },
            },
        },
    });

    const results = [];

    for (const reminder of dueReminders) {
        try {
            // Send via WhatsApp
            await sendWhatsAppMessage(reminder.lead.phone, reminder.message);

            // Mark as sent
            await prisma.reminder.update({
                where: { id: reminder.id },
                data: { status: 'sent', sentAt: now },
            });

            // Log activity
            await prisma.leadActivity.create({
                data: {
                    leadId: reminder.leadId,
                    action: 'reminder_sent',
                    details: `Напоминание "${reminder.type}" отправлено`,
                },
            });

            results.push({ id: reminder.id, status: 'sent' });
        } catch (err) {
            // Mark as failed
            await prisma.reminder.update({
                where: { id: reminder.id },
                data: { status: 'failed' },
            });

            results.push({ id: reminder.id, status: 'failed', error: String(err) });
        }
    }

    return NextResponse.json({
        processed: results.length,
        results,
    });
}
