import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';
import { ItigrisRemoteClient } from '@/lib/itigris';

export const dynamic = 'force-dynamic';

/** Build a RemoteAPI client from the caller's org config, or a flag if no key. */
async function remoteForSession(email: string) {
    const me = await prisma.user.findUnique({ where: { email } });
    if (!me?.organizationId) return { error: 'no-org' as const };
    const org = await prisma.organization.findUnique({ where: { id: me.organizationId } });
    const itigris = ((org as any)?.metadata || {}).itigris;
    const client = itigris?.remoteClient || itigris?.legacyClient || itigris?.company;
    const key = itigris?.remoteKey;
    if (!client || !key) return { notConfigured: true as const };
    return { remote: new ItigrisRemoteClient({ client, key }) };
}

// ==================== GET — bonus history ====================
// ?action=bonus-history&clientCardId=&page=&plusOnly=&minusOnly=&waiting=
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const r = await remoteForSession(session.user.email!);
    if ('error' in r) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    if ('notConfigured' in r) return NextResponse.json({ notConfigured: true });

    const sp = new URL(req.url).searchParams;
    if (sp.get('action') !== 'bonus-history') return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    const clientCardId = sp.get('clientCardId');
    if (!clientCardId) return NextResponse.json({ error: 'Укажите номер карты' }, { status: 400 });
    try {
        const items = await r.remote.bonusHistory(clientCardId, {
            page: sp.get('page') ? Number(sp.get('page')) : undefined,
            plusOnly: sp.get('plusOnly') === 'true',
            minusOnly: sp.get('minusOnly') === 'true',
            waiting: sp.get('waiting') === 'true',
        });
        return NextResponse.json({ items: Array.isArray(items) ? items : (items?.content || items || []) });
    } catch (e: any) {
        return NextResponse.json({ error: `Itigris: ${e.response?.status || e.message}` }, { status: 502 });
    }
}

// ==================== POST — send SMS ====================
// { action:'sms', clientId, content }
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const r = await remoteForSession(session.user.email!);
    if ('error' in r) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    if ('notConfigured' in r) return NextResponse.json({ error: 'RemoteAPI-ключ не настроен', notConfigured: true }, { status: 400 });

    const body = await req.json();
    if (body.action !== 'sms') return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    const { clientId, content } = body;
    if (!clientId || !content?.trim()) return NextResponse.json({ error: 'Нужны clientId и текст сообщения' }, { status: 400 });
    try {
        const res = await r.remote.sendSms(clientId, content.trim());
        const ok = typeof res === 'string' ? /ok/i.test(res) : !!res;
        return NextResponse.json({ ok, result: res });
    } catch (e: any) {
        return NextResponse.json({ error: `Itigris: ${e.response?.status || e.message}` }, { status: 502 });
    }
}
