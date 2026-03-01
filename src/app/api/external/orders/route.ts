export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { validateExternalApiKey } from '@/lib/external-auth';
import prisma from '@/lib/db/prisma';

/**
 * POST /api/external/orders — Create order from MedMundus
 * 
 * Headers: x-api-key: <EXTERNAL_API_KEY>
 * Body: {
 *   medmundus_order_id: string,      // MedMundus internal order ID
 *   creator_name: string,            // Doctor name
 *   creator_email?: string,          // Doctor email
 *   clinic_name: string,             // Clinic/optic name
 *   patient: { name, phone, email?, notes? },
 *   config: { type, eyes: { od: {...}, os: {...} } },
 *   is_urgent: boolean,
 *   delivery_method?: string,
 *   delivery_address?: string,
 *   notes?: string,
 *   company?: string,
 * }
 */
export async function POST(request: NextRequest) {
    // Validate API key
    const authError = validateExternalApiKey(request);
    if (authError) return authError;

    try {
        const body = await request.json();

        // Validate required fields
        if (!body.patient?.name) {
            return NextResponse.json({ error: 'patient.name is required' }, { status: 400 });
        }
        if (!body.config?.eyes) {
            return NextResponse.json({ error: 'config.eyes is required' }, { status: 400 });
        }

        // Generate LensFlow order ID
        const orderNumber = `LX-${Date.now().toString(36).toUpperCase()}`;

        const now = new Date();
        const is_urgent = body.is_urgent ?? false;
        const edit_deadline = is_urgent
            ? now
            : new Date(now.getTime() + 2 * 60 * 60 * 1000);

        // Create patient
        let patientId: string | undefined;
        if (body.patient) {
            const patient = await prisma.patient.create({
                data: {
                    name: body.patient.name,
                    phone: body.patient.phone || '',
                    email: body.patient.email || undefined,
                    notes: body.patient.notes || undefined,
                },
            });
            patientId = patient.id;
        }

        // Try to find matching organization by name (for clinic linking)
        let organizationId: string | undefined;
        if (body.clinic_name) {
            const org = await prisma.organization.findFirst({
                where: {
                    name: { contains: body.clinic_name, mode: 'insensitive' },
                },
                select: { id: true, discountPercent: true },
            });
            if (org) {
                organizationId = org.id;
            }
        }

        // Calculate price from catalog
        const DISCOUNT_PCT = organizationId
            ? (await prisma.organization.findUnique({ where: { id: organizationId }, select: { discountPercent: true } }))?.discountPercent || 5
            : 5;
        const URGENT_SURCHARGE_PCT = 25;

        const config = body.config;
        const odChar = config?.eyes?.od?.characteristic || '';
        const osChar = config?.eyes?.os?.characteristic || '';
        const odQty = Number(config?.eyes?.od?.qty) || 0;
        const osQty = Number(config?.eyes?.os?.qty) || 0;

        let odPrice = 0;
        let osPrice = 0;
        if (odChar || osChar) {
            const lensProducts = await prisma.product.findMany({
                where: { category: 'lens', description: { in: [odChar, osChar].filter(Boolean) } },
                select: { description: true, price: true },
            });
            const priceMap = new Map(lensProducts.map(p => [p.description, p.price]));
            odPrice = (priceMap.get(odChar) || 0) * odQty;
            osPrice = (priceMap.get(osChar) || 0) * osQty;
        }

        const basePrice = odPrice + osPrice;
        const discountAmt = Math.round(basePrice * DISCOUNT_PCT / 100);
        const priceAfterDiscount = basePrice - discountAmt;
        const urgentSurcharge = is_urgent ? Math.round(priceAfterDiscount * URGENT_SURCHARGE_PCT / 100) : 0;
        const totalPrice = priceAfterDiscount + urgentSurcharge;

        // Create order
        const order = await prisma.order.create({
            data: {
                orderNumber,
                status: 'new_order',
                isUrgent: is_urgent,
                organizationId,
                patientId,
                opticName: body.clinic_name || '',
                doctorName: body.creator_name || '',
                doctorEmail: body.creator_email || undefined,
                company: body.company || undefined,
                deliveryMethod: body.delivery_method || undefined,
                deliveryAddress: body.delivery_address || undefined,
                lensConfig: config,
                editDeadline: edit_deadline,
                notes: body.notes ? `[MedMundus] ${body.notes}` : '[MedMundus order]',
                totalPrice,
                discountPercent: DISCOUNT_PCT,
                externalId: body.medmundus_order_id || undefined,
                source: 'medmundus',
            },
            include: {
                patient: true,
                organization: { select: { name: true } },
            },
        });

        return NextResponse.json({
            success: true,
            lensflow_order_id: order.orderNumber,
            medmundus_order_id: body.medmundus_order_id,
            status: 'new',
            total_price: totalPrice,
            edit_deadline: order.editDeadline?.toISOString(),
            created_at: order.createdAt.toISOString(),
        }, { status: 201 });

    } catch (error: any) {
        console.error('External POST /api/external/orders error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create order' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/external/orders — Get orders with optional filters
 * 
 * Headers: x-api-key: <EXTERNAL_API_KEY>
 * Query: ?clinic_name=xxx&status=new&medmundus_order_id=xxx
 */
export async function GET(request: NextRequest) {
    const authError = validateExternalApiKey(request);
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const clinicName = searchParams.get('clinic_name');
        const status = searchParams.get('status');
        const externalId = searchParams.get('medmundus_order_id');
        const orderId = searchParams.get('order_id');

        const where: any = {};

        if (externalId) where.externalId = externalId;
        if (orderId) where.orderNumber = orderId;
        if (clinicName) where.opticName = { contains: clinicName, mode: 'insensitive' };
        if (status) {
            const statusMap: Record<string, string> = {
                'new': 'new_order',
                'in_production': 'in_production',
                'ready': 'ready',
                'rework': 'rework',
                'shipped': 'shipped',
                'out_for_delivery': 'out_for_delivery',
                'delivered': 'delivered',
                'cancelled': 'cancelled',
            };
            where.status = statusMap[status] || status;
        }

        // Only return MedMundus orders by default
        if (!externalId && !orderId) {
            where.source = 'medmundus';
        }

        const orders = await prisma.order.findMany({
            where,
            include: {
                patient: true,
                organization: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });

        const statusMap: Record<string, string> = {
            'new_order': 'new',
            'in_production': 'in_production',
            'ready': 'ready',
            'rework': 'rework',
            'shipped': 'shipped',
            'out_for_delivery': 'out_for_delivery',
            'delivered': 'delivered',
            'cancelled': 'cancelled',
        };

        const result = orders.map(o => ({
            lensflow_order_id: o.orderNumber,
            medmundus_order_id: (o as any).externalId || null,
            status: statusMap[o.status] || o.status,
            payment_status: (o as any).paymentStatus || 'unpaid',
            patient: o.patient ? {
                name: o.patient.name,
                phone: o.patient.phone,
                email: o.patient.email,
            } : null,
            clinic_name: o.opticName,
            doctor_name: o.doctorName,
            is_urgent: o.isUrgent,
            total_price: (o as any).totalPrice || 0,
            tracking_number: (o as any).trackingNumber || null,
            created_at: o.createdAt.toISOString(),
            updated_at: o.updatedAt.toISOString(),
        }));

        return NextResponse.json({ orders: result, count: result.length });

    } catch (error: any) {
        console.error('External GET /api/external/orders error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch orders' },
            { status: 500 }
        );
    }
}
