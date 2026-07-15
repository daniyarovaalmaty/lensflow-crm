import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

/** Resolve the current user + the org set they can see (self, + branches if HQ). */
async function resolveScope(email: string) {
    const me = await prisma.user.findUnique({ where: { email } });
    if (!me?.organizationId) return null;
    const org = await prisma.organization.findUnique({
        where: { id: me.organizationId },
        select: { type: true },
    });
    let orgIds: string[] = [me.organizationId];
    if (org?.type === 'headquarters') {
        const branches = await prisma.organization.findMany({
            where: { parentId: me.organizationId, status: 'active' },
            select: { id: true },
        });
        orgIds = [me.organizationId, ...branches.map((b) => b.id)];
    }
    return { me, orgIds };
}

// ==================== GET — list tasks ====================
// ?scope=for_me|from_me|all  &from=ISO&to=ISO (filter by dueDate, for calendar)
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const scope = await resolveScope(session.user.email!);
    if (!scope) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    const { me, orgIds } = scope;

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('scope') || 'all';
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const where: any = { organizationId: { in: orgIds } };
    if (mode === 'for_me') where.assignedToId = me.id;
    else if (mode === 'from_me') where.assignedById = me.id;

    if (from || to) {
        where.dueDate = {};
        if (from) where.dueDate.gte = new Date(from);
        if (to) where.dueDate.lte = new Date(to);
    }

    const tasks = await prisma.task.findMany({
        where,
        orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }],
    });
    return NextResponse.json(tasks);
}

// ==================== POST — create / assign a task ====================
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const scope = await resolveScope(session.user.email!);
    if (!scope) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    const { me, orgIds } = scope;

    const body = await req.json();
    const title = String(body.title || '').trim();
    if (!title) return NextResponse.json({ error: 'Укажите название задания' }, { status: 400 });

    // Resolve assignee — default to self if not specified; must be in the org set.
    let assignedToId: string = me.id;
    let assignedToName: string | null = me.fullName || null;
    if (body.assignedToId && body.assignedToId !== me.id) {
        const target = await prisma.user.findUnique({ where: { id: body.assignedToId } });
        if (!target || !target.organizationId || !orgIds.includes(target.organizationId)) {
            return NextResponse.json({ error: 'Исполнитель не найден в вашей организации' }, { status: 400 });
        }
        assignedToId = target.id;
        assignedToName = target.fullName || null;
    }

    const task = await prisma.task.create({
        data: {
            organizationId: me.organizationId!,
            title,
            description: body.description ? String(body.description) : null,
            status: 'new',
            priority: ['low', 'normal', 'high'].includes(body.priority) ? body.priority : 'normal',
            dueDate: body.dueDate ? new Date(body.dueDate) : null,
            assignedById: me.id,
            assignedByName: me.fullName || null,
            assignedToId,
            assignedToName,
            relatedType: body.relatedType || null,
            relatedId: body.relatedId || null,
            relatedLabel: body.relatedLabel || null,
        },
    });
    return NextResponse.json(task, { status: 201 });
}

// ==================== PATCH — update status / fields ====================
export async function PATCH(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const scope = await resolveScope(session.user.email!);
    if (!scope) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    const { me, orgIds } = scope;

    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: 'id обязателен' }, { status: 400 });

    const existing = await prisma.task.findUnique({ where: { id: body.id } });
    if (!existing || !orgIds.includes(existing.organizationId)) {
        return NextResponse.json({ error: 'Задание не найдено' }, { status: 404 });
    }

    const data: any = {};
    if (body.status && ['new', 'in_progress', 'done', 'cancelled'].includes(body.status)) {
        data.status = body.status;
        data.completedAt = body.status === 'done' ? new Date() : null;
    }
    if (typeof body.title === 'string' && body.title.trim()) data.title = body.title.trim();
    if (typeof body.description === 'string') data.description = body.description || null;
    if (['low', 'normal', 'high'].includes(body.priority)) data.priority = body.priority;
    if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.assignedToId && body.assignedToId !== existing.assignedToId) {
        const target = await prisma.user.findUnique({ where: { id: body.assignedToId } });
        if (target && target.organizationId && orgIds.includes(target.organizationId)) {
            data.assignedToId = target.id;
            data.assignedToName = target.fullName || null;
        }
    }

    const task = await prisma.task.update({ where: { id: body.id }, data });
    return NextResponse.json(task);
}

// ==================== DELETE — remove a task (creator or manager) ====================
export async function DELETE(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const scope = await resolveScope(session.user.email!);
    if (!scope) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    const { me, orgIds } = scope;

    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id обязателен' }, { status: 400 });

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing || !orgIds.includes(existing.organizationId)) {
        return NextResponse.json({ error: 'Задание не найдено' }, { status: 404 });
    }
    const isManager = me.subRole === 'optic_manager';
    if (existing.assignedById !== me.id && !isManager) {
        return NextResponse.json({ error: 'Удалять может автор задания или управляющий' }, { status: 403 });
    }

    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
