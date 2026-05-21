import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

// POST — save lead from partner landing page
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, phone, email, city, clinicName, message } = body;

        if (!name || !phone) {
            return NextResponse.json({ error: 'Имя и телефон обязательны' }, { status: 400 });
        }

        const lead = await prisma.lead.create({
            data: {
                name,
                phone,
                city: city || null,
                source: 'website',
                funnel: 'sales',
                stage: 'new_lead',
                notes: [
                    email ? `Email: ${email}` : '',
                    clinicName ? `Клиника: ${clinicName}` : '',
                    message ? `Сообщение: ${message}` : '',
                ].filter(Boolean).join('\n') || null,
                tags: ['partner_landing'],
            },
        });

        return NextResponse.json({ success: true, id: lead.id });
    } catch (error: any) {
        console.error('Partner lead error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// GET — list partner leads
export async function GET() {
    try {
        const leads = await prisma.lead.findMany({
            where: { tags: { has: 'partner_landing' } },
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(leads);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
