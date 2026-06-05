import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

// ⚠️ TEMPORARY read-only diagnostic endpoint. Raw SQL only — reads recent orders
// with org/patient names. No writes. Guarded by a secret token. REMOVE after use.
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
    const like = q ? `%${q}%` : '%';

    try {
        const rows: any[] = await prisma.$queryRawUnsafe(
            `SELECT
               o."orderNumber"        AS "orderNumber",
               o.status               AS status,
               o."createdAt"          AS "createdAt",
               o."totalPrice"         AS "totalPrice",
               o."priceOd"            AS "priceOd",
               o."priceOs"            AS "priceOs",
               o."documentNameOd"     AS "documentNameOd",
               o."documentNameOs"     AS "documentNameOs",
               o."lensConfig"         AS "lensConfig",
               o."organizationId"     AS "organizationId",
               o."distributorOrgId"   AS "distributorOrgId",
               o."labOrgId"           AS "labOrgId",
               creator.name           AS creator_org,
               dist.name              AS dist_org,
               lab.name               AS lab_org,
               p.name                 AS patient_name,
               p.phone                AS patient_phone,
               u."fullName"           AS created_by_name,
               u.email                AS created_by_email
             FROM orders o
             LEFT JOIN organizations creator ON creator.id = o."organizationId"
             LEFT JOIN organizations dist    ON dist.id    = o."distributorOrgId"
             LEFT JOIN organizations lab     ON lab.id     = o."labOrgId"
             LEFT JOIN patients p            ON p.id        = o."patientId"
             LEFT JOIN users u               ON u.id        = o."createdById"
             WHERE o."orderNumber" ILIKE $1 OR p.name ILIKE $1
             ORDER BY o."createdAt" DESC
             LIMIT 20`,
            like,
        );

        const orders = rows.map((o) => {
            const eyes = (o.lensConfig as any)?.eyes || {};
            const eye = (e: any) => e ? { char: e.characteristic, dk: e.dk, qty: e.qty, km: e.km, tp: e.tp, dia: e.dia, e: e.e, tor: e.tor, trial: e.trial, color: e.color } : null;
            return {
                orderNumber: o.orderNumber,
                status: o.status,
                statusLabel: STATUS_LABEL[o.status] || o.status,
                createdAt: o.createdAt,
                createdBy: o.created_by_name || o.created_by_email || null,
                patient: o.patient_name || null,
                patientPhone: o.patient_phone || null,
                creatorOrg: o.creator_org || o.organizationId,
                distributorOrg: o.dist_org || (o.distributorOrgId ? o.distributorOrgId : 'нет (прямой заказ)'),
                labOrg: o.lab_org || (o.labOrgId ? o.labOrgId : 'нет (виден всем лабораториям как прямой заказ)'),
                goesToProduction: o.distributorOrgId == null || o.labOrgId != null,
                priceOd: o.priceOd,
                priceOs: o.priceOs,
                totalPrice: o.totalPrice,
                documentNameOd: o.documentNameOd,
                documentNameOs: o.documentNameOs,
                od: eye(eyes.od),
                os: eye(eyes.os),
            };
        });

        return NextResponse.json(JSON.parse(JSON.stringify({ count: orders.length, orders }, (_k, v) => (typeof v === 'bigint' ? Number(v) : v))));
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || String(e), stack: (e?.stack || '').split('\n').slice(0, 4) }, { status: 200 });
    }
}
