import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

// ⚠️ TEMPORARY read-only diagnostic endpoint. Returns recent orders so we can
// verify routing (production), saved prices and visibility. Reads only — no writes.
// Guarded by a secret token. REMOVE THIS FILE after use.
const TOKEN = 'lf-checkorder-2026-a7F3k9Q2xR8m';

const STATUS_LABEL: Record<string, string> = {
    new_order: 'Новый (в очереди производства)',
    in_production: 'В производстве',
    ready: 'Готов',
    rework: 'На доработке',
    docs_prep: 'Подготовка документов',
    accountant_review: 'Проверка бухгалтером',
    docs_ready: 'Документы готовы',
    shipped: 'Отгружен',
    out_for_delivery: 'В доставке',
    delivered: 'Доставлен',
    cancelled: 'Отменён',
};

export async function GET(req: NextRequest) {
    if (req.nextUrl.searchParams.get('token') !== TOKEN) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const q = req.nextUrl.searchParams.get('q')?.trim();

    const orders = await prisma.order.findMany({
        where: q ? { OR: [{ orderNumber: { contains: q, mode: 'insensitive' } }, { patient: { name: { contains: q, mode: 'insensitive' } } }] } : undefined,
        orderBy: { createdAt: 'desc' },
        take: q ? 20 : 10,
        select: {
            orderNumber: true,
            status: true,
            createdAt: true,
            totalPrice: true,
            priceOd: true,
            priceOs: true,
            documentNameOd: true,
            documentNameOs: true,
            lensConfig: true,
            organizationId: true,
            distributorOrgId: true,
            labOrgId: true,
            organization: { select: { name: true } },
            distributorOrg: { select: { name: true } },
            labOrg: { select: { name: true } },
            patient: { select: { name: true, phone: true } },
            createdBy: { select: { fullName: true, email: true } },
        },
    });

    const result = orders.map((o: any) => {
        const eyes = (o.lensConfig as any)?.eyes || {};
        const summarizeEye = (e: any) => e ? { char: e.characteristic, dk: e.dk, qty: e.qty, km: e.km, tp: e.tp, dia: e.dia, e: e.e, tor: e.tor, trial: e.trial, color: e.color } : null;
        return {
            orderNumber: o.orderNumber,
            status: o.status,
            statusLabel: STATUS_LABEL[o.status] || o.status,
            createdAt: o.createdAt,
            createdBy: o.createdBy ? (o.createdBy.fullName || o.createdBy.email) : null,
            patient: o.patient?.name || null,
            patientPhone: o.patient?.phone || null,
            // routing / visibility
            creatorOrg: o.organization?.name || o.organizationId,
            distributorOrg: o.distributorOrg?.name || (o.distributorOrgId ? o.distributorOrgId : 'нет (прямой заказ)'),
            labOrg: o.labOrg?.name || (o.labOrgId ? o.labOrgId : 'нет (виден всем лабораториям как прямой заказ)'),
            // who sees it in production: lab sees orders with distributorOrgId = null OR labOrgId = lab
            goesToProduction: o.distributorOrgId == null || o.labOrgId != null,
            // numbers
            priceOd: o.priceOd,
            priceOs: o.priceOs,
            totalPrice: o.totalPrice,
            documentNameOd: o.documentNameOd,
            documentNameOs: o.documentNameOs,
            od: summarizeEye(eyes.od),
            os: summarizeEye(eyes.os),
        };
    });

    return NextResponse.json(JSON.parse(JSON.stringify({ count: result.length, orders: result }, (_k, v) => (typeof v === 'bigint' ? Number(v) : v))));
}
