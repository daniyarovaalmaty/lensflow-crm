import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';
import { ItigrisRemoteClient } from '@/lib/itigris';

export const dynamic = 'force-dynamic';

/** Build a RemoteAPI client from the caller's org config, or null if no key. */
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

// ==================== GET — booking reference data ====================
// ?action=departments|services|doctors|slots|findClient (+ params)
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const r = await remoteForSession(session.user.email!);
    if ('error' in r) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    if ('notConfigured' in r) return NextResponse.json({ notConfigured: true });
    const remote = r.remote;

    const sp = new URL(req.url).searchParams;
    const action = sp.get('action');
    try {
        switch (action) {
            case 'departments': return NextResponse.json({ items: await remote.getDepartments() });
            case 'services': return NextResponse.json({ items: await remote.servicesList(sp.get('category') || undefined) });
            case 'doctors': return NextResponse.json({ items: await remote.getDoctors(sp.get('departmentId') || undefined) });
            case 'slots': {
                const departmentId = sp.get('departmentId');
                const date = sp.get('date');
                if (!departmentId || !date) return NextResponse.json({ error: 'departmentId и date обязательны' }, { status: 400 });
                return NextResponse.json({ items: await remote.getTimeByDepartment(departmentId, date) });
            }
            case 'findClient': {
                const tel = sp.get('tel');
                if (!tel) return NextResponse.json({ error: 'Укажите телефон' }, { status: 400 });
                const res = await remote.getClient({ tel, family_name: sp.get('family') || undefined, first_name: sp.get('first') || undefined, noMultiple: true });
                return NextResponse.json({ clientId: res });
            }
            default: return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
        }
    } catch (e: any) {
        return NextResponse.json({ error: `Itigris: ${e.response?.status || e.message}` }, { status: 502 });
    }
}

// ==================== POST — register an appointment ====================
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const r = await remoteForSession(session.user.email!);
    if ('error' in r) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    if ('notConfigured' in r) return NextResponse.json({ error: 'RemoteAPI-ключ не настроен', notConfigured: true }, { status: 400 });

    const body = await req.json();
    const { clientId, userId, time, serviceTypeId, status } = body;
    if (!clientId || !userId || !time || !serviceTypeId) {
        return NextResponse.json({ error: 'Нужны clientId, userId (врач), time и serviceTypeId (услуга)' }, { status: 400 });
    }
    try {
        const res = await r.remote.register({ clientId, userId, time, serviceTypeId, status });
        const ok = typeof res === 'string' ? /ok/i.test(res) : !!res;
        return NextResponse.json({ ok, result: res });
    } catch (e: any) {
        return NextResponse.json({ error: `Itigris: ${e.response?.status || e.message}` }, { status: 502 });
    }
}
