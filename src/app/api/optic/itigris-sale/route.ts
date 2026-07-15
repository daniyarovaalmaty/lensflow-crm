import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';
import { ItigrisRemoteClient } from '@/lib/itigris';

export const dynamic = 'force-dynamic';

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

// ==================== GET — departments for the form ====================
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const r = await remoteForSession(session.user.email!);
    if ('error' in r) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    if ('notConfigured' in r) return NextResponse.json({ notConfigured: true });

    if (new URL(req.url).searchParams.get('action') !== 'departments') return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    try {
        return NextResponse.json({ items: await r.remote.getDepartments() });
    } catch (e: any) {
        return NextResponse.json({ error: `Itigris: ${e.response?.status || e.message}` }, { status: 502 });
    }
}

// ==================== POST — push a sale/order task into Optima ====================
// { departmentId, goods:[{product, barcode}], clientId?, clientInfo?, paidSum?, paymentType?, receiveType? }
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const r = await remoteForSession(session.user.email!);
    if ('error' in r) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    if ('notConfigured' in r) return NextResponse.json({ error: 'RemoteAPI-ключ не настроен', notConfigured: true }, { status: 400 });

    const body = await req.json();
    const goods = Array.isArray(body.goods) ? body.goods.filter((g: any) => g && g.product) : [];
    if (goods.length === 0) return NextResponse.json({ error: 'Добавьте хотя бы один товар' }, { status: 400 });
    if (!body.clientId && !body.clientInfo) return NextResponse.json({ error: 'Укажите clientId или clientInfo' }, { status: 400 });

    try {
        // Body shape per docs: goods is a list of { goods: {...} } wrappers.
        const res = await r.remote.saleCreate({
            departmentId: body.departmentId || undefined,
            goods: goods.map((g: any) => ({ goods: { product: g.product, barcode: g.barcode || undefined } })),
            clientId: body.clientId || undefined,
            clientInfo: body.clientInfo || undefined,
            paidSum: body.paidSum != null ? Number(body.paidSum) : undefined,
            paymentType: body.paymentType || undefined,
            receiveType: body.receiveType || undefined,
        });
        const ok = typeof res === 'string' ? /ok/i.test(res) : !!res;
        return NextResponse.json({ ok, result: res });
    } catch (e: any) {
        return NextResponse.json({ error: `Itigris: ${e.response?.status || e.message}` }, { status: 502 });
    }
}
