export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';
import { ItigrisLegacyClient } from '@/lib/itigris/legacy';

/**
 * GET /api/itigris/legacy — proxy to the ITIGRIS legacy (key-based) API.
 * Uses the org's legacy creds: metadata.itigris.legacyClient + legacyKey.
 *
 *   ?type=lens&manufacturer=&name=&dioptre=&cylinder=&radiusOfCurvature=
 *   ?type=order&orderId=...
 *   ?type=bonus&clientCardId=...
 *   ?type=card&clientCardId=...
 */
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = (session.user as any).organizationId;
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    const itg = (org as any)?.metadata?.itigris || {};
    const legacyMeta = (org as any)?.metadata?.itigrisLegacy || {};
    const client = legacyMeta.client || itg.company;
    const key = legacyMeta.key;
    if (!client || !key) {
        return NextResponse.json({ error: 'Легаси-API ITIGRIS не настроен (нужны legacyClient + legacyKey)' }, { status: 400 });
    }

    const legacy = new ItigrisLegacyClient({ client, key });
    const sp = new URL(req.url).searchParams;
    const type = sp.get('type') || 'lens';

    try {
        switch (type) {
            case 'lens': {
                const data = await legacy.lensInfo({
                    manufacturer: sp.get('manufacturer') || undefined,
                    name: sp.get('name') || undefined,
                    dioptre: sp.get('dioptre') || undefined,
                    cylinder: sp.get('cylinder') || undefined,
                    radiusOfCurvature: sp.get('radiusOfCurvature') || undefined,
                });
                // Normalize the single { store: count } object into rows
                const obj = Array.isArray(data) ? (data[0] || {}) : data;
                const rows = obj && typeof obj === 'object'
                    ? Object.entries(obj).map(([store, count]) => ({ store, count }))
                    : [];
                return NextResponse.json({ type, rows, raw: data });
            }
            case 'order': {
                const orderId = sp.get('orderId');
                if (!orderId) return NextResponse.json({ error: 'orderId обязателен' }, { status: 400 });
                return NextResponse.json({ type, orderId, result: await legacy.orderStatus(orderId) });
            }
            case 'bonus': {
                const clientCardId = sp.get('clientCardId');
                if (!clientCardId) return NextResponse.json({ error: 'clientCardId обязателен' }, { status: 400 });
                return NextResponse.json({ type, clientCardId, result: await legacy.bonusInfo(clientCardId) });
            }
            case 'card': {
                const clientCardId = sp.get('clientCardId');
                if (!clientCardId) return NextResponse.json({ error: 'clientCardId обязателен' }, { status: 400 });
                return NextResponse.json({ type, clientCardId, result: await legacy.clientCardInfo(clientCardId) });
            }
            default:
                return NextResponse.json({ error: `Неизвестный тип: ${type}` }, { status: 400 });
        }
    } catch (e: any) {
        return NextResponse.json({ error: `ITIGRIS legacy: ${e.response?.status || e.message}` }, { status: 502 });
    }
}
