import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { auth } from '@/auth';

export async function GET(request: Request) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const searchParams = (request as any).nextUrl.searchParams;
        const status = searchParams.get('status');

        const orgId = session.user.organizationId;
        const leadWhere: any = {};
        if (orgId) {
            const org = await prisma.organization.findUnique({
                where: { id: orgId },
                select: { type: true },
            });
            if (org?.type === 'headquarters') {
                const branchIds = await prisma.organization.findMany({
                    where: { parentId: orgId, status: 'active' },
                    select: { id: true },
                });
                leadWhere.clinicId = { in: [orgId, ...branchIds.map((b: any) => b.id)] };
            } else {
                leadWhere.clinicId = orgId;
            }
        }

        const where: any = {
            type: 'follow_up',
            lead: leadWhere
        };

        if (status) {
            where.status = status;
        }

        const tasks = await prisma.reminder.findMany({
            where,
            include: {
                lead: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        stage: true,
                    }
                }
            },
            orderBy: {
                scheduledAt: 'asc'
            }
        });

        return NextResponse.json({ tasks });
    } catch (error: any) {
        console.error('Error fetching tasks:', error);
        return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const { leadId, scheduledAt, message } = body;

        if (!leadId || !scheduledAt || !message) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Validate lead
        const lead = await prisma.lead.findUnique({
            where: { id: leadId }
        });

        if (!lead) {
            return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
        }

        const task = await prisma.reminder.create({
            data: {
                leadId,
                type: 'follow_up',
                message,
                scheduledAt: new Date(scheduledAt),
                status: 'pending'
            }
        });

        // Also move lead to follow_up stage
        await prisma.lead.update({
            where: { id: leadId },
            data: { stage: 'follow_up' }
        });

        return NextResponse.json({ task });
    } catch (error: any) {
        console.error('Error creating task:', error);
        return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const { id, status } = body;

        if (!id || !status) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const task = await prisma.reminder.update({
            where: { id },
            data: { status }
        });

        return NextResponse.json({ task });
    } catch (error: any) {
        console.error('Error updating task:', error);
        return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
    }
}
