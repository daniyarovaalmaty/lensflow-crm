import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

/** Current user + org set they can see (self, + branches if HQ). */
async function resolveScope(userId: string) {
    const me = await prisma.user.findUnique({ where: { id: userId } });
    if (!me?.organizationId) return null;
    const org = await prisma.organization.findUnique({ where: { id: me.organizationId }, select: { type: true } });
    let orgIds: string[] = [me.organizationId];
    if (org?.type === 'headquarters') {
        const branches = await prisma.organization.findMany({ where: { parentId: me.organizationId, status: 'active' }, select: { id: true } });
        orgIds = [me.organizationId, ...branches.map((b) => b.id)];
    }
    return { me, orgIds, orgType: org?.type };
}

async function unreadCount(userId: string, orgIds: string[]) {
    const state = await prisma.newsReadState.findUnique({ where: { userId } });
    const since = state?.lastReadAt || new Date(0);
    return prisma.newsPost.count({
        where: {
            organizationId: { in: orgIds },
            createdAt: { gt: since },
            OR: [{ authorId: null }, { authorId: { not: userId } }], // others' + system posts, not my own
        },
    });
}

// ==================== GET — news feed + unread count ====================
export async function GET() {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const scope = await resolveScope(session.user.id);
    if (!scope) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    const { me, orgIds, orgType } = scope;

    const [posts, unread] = await Promise.all([
        prisma.newsPost.findMany({
            where: { organizationId: { in: orgIds } },
            orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
        }),
        unreadCount(me.id, orgIds),
    ]);
    return NextResponse.json({ posts, unread, canPost: me.subRole === 'optic_manager' || orgType === 'headquarters' });
}

// ==================== POST — publish news (manager only) ====================
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const scope = await resolveScope(session.user.id);
    if (!scope) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    const { me, orgType } = scope;
    if (me.subRole !== 'optic_manager' && orgType !== 'headquarters') return NextResponse.json({ error: 'Публиковать новости может управляющий или штаб-квартира' }, { status: 403 });

    const body = await req.json();
    const title = String(body.title || '').trim();
    const text = String(body.body || '').trim();
    if (!title || !text) return NextResponse.json({ error: 'Заполните заголовок и текст' }, { status: 400 });

    const post = await prisma.newsPost.create({
        data: {
            organizationId: me.organizationId!,
            title,
            body: text,
            pinned: !!body.pinned,
            authorId: me.id,
            authorName: me.fullName || null,
        },
    });
    return NextResponse.json(post, { status: 201 });
}

// ==================== PATCH — mark all read, or edit a post ====================
export async function PATCH(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const scope = await resolveScope(session.user.id);
    if (!scope) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    const { me, orgIds, orgType } = scope;

    const body = await req.json();

    if (body.action === 'mark_read') {
        await prisma.newsReadState.upsert({
            where: { userId: me.id },
            create: { userId: me.id, lastReadAt: new Date() },
            update: { lastReadAt: new Date() },
        });
        return NextResponse.json({ ok: true });
    }

    if (!body.id) return NextResponse.json({ error: 'id обязателен' }, { status: 400 });
    const existing = await prisma.newsPost.findUnique({ where: { id: body.id } });
    if (!existing || !orgIds.includes(existing.organizationId)) return NextResponse.json({ error: 'Новость не найдена' }, { status: 404 });
    if (existing.authorId !== me.id && me.subRole !== 'optic_manager' && orgType !== 'headquarters') return NextResponse.json({ error: 'Редактировать может автор или управляющий' }, { status: 403 });

    const data: any = {};
    if (typeof body.title === 'string' && body.title.trim()) data.title = body.title.trim();
    if (typeof body.body === 'string' && body.body.trim()) data.body = body.body.trim();
    if (typeof body.pinned === 'boolean') data.pinned = body.pinned;

    const post = await prisma.newsPost.update({ where: { id: body.id }, data });
    return NextResponse.json(post);
}

// ==================== DELETE — remove a post (author or manager) ====================
export async function DELETE(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const scope = await resolveScope(session.user.id);
    if (!scope) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    const { me, orgIds, orgType } = scope;

    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id обязателен' }, { status: 400 });
    const existing = await prisma.newsPost.findUnique({ where: { id } });
    if (!existing || !orgIds.includes(existing.organizationId)) return NextResponse.json({ error: 'Новость не найдена' }, { status: 404 });
    if (existing.authorId !== me.id && me.subRole !== 'optic_manager' && orgType !== 'headquarters') return NextResponse.json({ error: 'Удалять может автор или управляющий' }, { status: 403 });

    await prisma.newsPost.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
