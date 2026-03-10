export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { CreateOrderSchema } from '@/types/order';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

/**
 * GET /api/orders - Get orders
 * Laboratory sees ALL orders, clinics/doctors see only their own
 */
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const opticId = searchParams.get('optic_id');

        // Build where clause based on role
        const where: any = {};

        if (session.user.role === 'laboratory') {
            // Lab sees all orders
        } else if (session.user.role === 'optic') {
            // Clinic sees only its org orders
            where.organizationId = session.user.organizationId;
        } else if (session.user.role === 'doctor') {
            // Doctor sees only their orders
            where.createdById = session.user.id;
        }

        if (status) {
            // Map status string to enum value
            const statusMap: Record<string, string> = {
                'new': 'new_order',
                'in_production': 'in_production',
                'ready': 'ready',
                'rework': 'rework',
                'docs_prep': 'docs_prep',
                'accountant_review': 'accountant_review',
                'docs_ready': 'docs_ready',
                'shipped': 'shipped',
                'out_for_delivery': 'out_for_delivery',
                'delivered': 'delivered',
                'cancelled': 'cancelled',
            };
            where.status = statusMap[status] || status;
        }

        if (opticId) {
            where.organizationId = opticId;
        }

        const orders = await prisma.order.findMany({
            where,
            include: {
                patient: true,
                createdBy: { select: { fullName: true, email: true } },
                organization: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Transform to match frontend expected format
        const transformed = orders.map((order: any) => {
            // Map status enum back to string
            const statusMap: Record<string, string> = {
                'new_order': 'new',
                'in_production': 'in_production',
                'ready': 'ready',
                'rework': 'rework',
                'docs_prep': 'docs_prep',
                'accountant_review': 'accountant_review',
                'docs_ready': 'docs_ready',
                'shipped': 'shipped',
                'out_for_delivery': 'out_for_delivery',
                'delivered': 'delivered',
                'cancelled': 'cancelled',
            };

            return {
                order_id: order.orderNumber,
                meta: {
                    optic_id: order.organizationId || '',
                    optic_name: order.organization?.name || order.opticName || '',
                    doctor: order.doctorName || order.createdBy?.fullName || '',
                    created_at: order.createdAt.toISOString(),
                    updated_at: order.updatedAt.toISOString(),
                },
                patient: order.patient ? {
                    id: order.patient.id,
                    name: order.patient.name,
                    phone: order.patient.phone,
                    email: order.patient.email || undefined,
                    notes: order.patient.notes || undefined,
                } : { name: '', phone: '' },
                config: order.lensConfig as any,
                company: order.company || undefined,
                inn: order.inn || undefined,
                delivery_method: order.deliveryMethod || undefined,
                delivery_address: order.deliveryAddress || undefined,
                doctor_email: order.doctorEmail || undefined,
                status: statusMap[order.status] || order.status,
                is_urgent: order.isUrgent,
                edit_deadline: order.editDeadline?.toISOString(),
                tracking_number: order.trackingNumber || undefined,
                production_started_at: order.productionStartedAt?.toISOString(),
                production_completed_at: order.productionCompletedAt?.toISOString(),
                shipped_at: order.shippedAt?.toISOString(),
                delivered_at: order.deliveredAt?.toISOString(),
                notes: order.notes || undefined,
                payment_status: order.paymentStatus,
                defects: (order.defects as any[]) || [],
                total_price: order.totalPrice || 0,
                discount_percent: order.discountPercent ?? 5,
                products: (order.products as any[]) || [],
                document_name_od: order.documentNameOd || undefined,
                document_name_os: order.documentNameOs || undefined,
                price_od: order.priceOd || undefined,
                price_os: order.priceOs || undefined,
                delivery_confirmed: (order as any).deliveryConfirmed ?? undefined,
            };
        });

        return NextResponse.json(transformed);
    } catch (error) {
        console.error('GET /api/orders error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch orders' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/orders - Create new order
 */
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = await request.json();

        // Validate with Zod
        const validatedData = CreateOrderSchema.parse(body);

        // Generate order ID in AB01 sequential format
        const generateOrderNumber = async (): Promise<string> => {
            const lastOrder = await prisma.order.findFirst({
                where: { orderNumber: { not: { startsWith: 'LX-' } } },
                orderBy: { createdAt: 'desc' },
                select: { orderNumber: true },
            });
            if (!lastOrder) return 'AB01';
            const prev = lastOrder.orderNumber;
            const match = prev.match(/^([A-Z]{2})(\d{2})$/);
            if (!match) return 'AB01';
            let [, letters, numStr] = match;
            let num = parseInt(numStr, 10) + 1;
            if (num > 99) {
                num = 1;
                let c1 = letters.charCodeAt(0);
                let c2 = letters.charCodeAt(1);
                c2++;
                if (c2 > 90) { c2 = 65; c1++; }
                if (c1 > 90) { c1 = 65; c2 = 65; }
                letters = String.fromCharCode(c1, c2);
            }
            return `${letters}${num.toString().padStart(2, '0')}`;
        };
        const orderNumber = await generateOrderNumber();

        const now = new Date();
        const is_urgent = validatedData.is_urgent ?? false;
        const edit_deadline = is_urgent
            ? now
            : new Date(now.getTime() + 2 * 60 * 60 * 1000);

        // Find or create patient
        let patientId: string | undefined;
        if (validatedData.patient) {
            const patient = await prisma.patient.create({
                data: {
                    name: validatedData.patient.name,
                    phone: validatedData.patient.phone || '',
                    email: validatedData.patient.email || undefined,
                    notes: validatedData.patient.notes || undefined,
                    organizationId: session.user.organizationId || undefined,
                },
            });
            patientId = patient.id;
        }

        // ── Calculate totalPrice from catalog ──
        // Get org discount (or user personal discount for independent doctors)
        let DISCOUNT_PCT = 5;
        if (session.user.organizationId) {
            const org = await prisma.organization.findUnique({
                where: { id: session.user.organizationId },
                select: { discountPercent: true },
            });
            if (org) DISCOUNT_PCT = org.discountPercent;
        } else {
            // Independent doctor — check personal discount
            const user = await prisma.user.findUnique({
                where: { id: session.user.id },
                select: { discountPercent: true },
            });
            if (user?.discountPercent != null) DISCOUNT_PCT = user.discountPercent;
        }
        // Read surcharge from LabSettings
        const labSettings = await prisma.labSettings.upsert({
            where: { id: 'default' },
            create: { id: 'default' },
            update: {},
        });
        const URGENT_SURCHARGE_PCT = labSettings.urgentSurchargePercent;
        const URGENT_DISCOUNT_PCT = labSettings.urgentDiscountPercent;
        const config = validatedData.config as any;
        const odChar = config?.eyes?.od?.characteristic || '';
        const osChar = config?.eyes?.os?.characteristic || '';
        const odQty = Number(config?.eyes?.od?.qty) || 0;
        const osQty = Number(config?.eyes?.os?.qty) || 0;
        const odDk = config?.eyes?.od?.dk || '';
        const osDk = config?.eyes?.os?.dk || '';
        const odTrial = config?.eyes?.od?.trial || false;
        const osTrial = config?.eyes?.os?.trial || false;

        // Lookup lens catalog prices (with DK-specific pricing) and name1c
        let odPrice = 0;
        let osPrice = 0;
        let odUnitPrice = 0;
        let osUnitPrice = 0;
        let documentNameOd: string | undefined;
        let documentNameOs: string | undefined;

        if (odChar || osChar) {
            const lensProducts = await prisma.product.findMany({
                where: { category: 'lens', description: { in: [odChar, osChar].filter(Boolean) } },
                select: { description: true, price: true, priceByDk: true, name1c: true },
            });

            // Get price for a lens based on DK value
            const getLensPrice = (product: any, dk: string): number => {
                if (product.priceByDk && typeof product.priceByDk === 'object') {
                    const dkPrice = (product.priceByDk as Record<string, number>)[dk];
                    if (dkPrice != null) return dkPrice;
                }
                return product.price || 0;
            };

            const productMap = new Map(lensProducts.map(p => [p.description, p]));
            const odProduct = productMap.get(odChar);
            const osProduct = productMap.get(osChar);

            odUnitPrice = odProduct ? getLensPrice(odProduct, odDk) : 0;
            osUnitPrice = osProduct ? getLensPrice(osProduct, osDk) : 0;
            odPrice = odUnitPrice * odQty;
            osPrice = osUnitPrice * osQty;

            // Construct 1C document names: name1c already contains type (торическая/сферическая)
            // If DK=50, it's always "пробная" — replace the type word in name1c
            const buildDocName = (baseName1c: string | null, dk: string): string | undefined => {
                if (!baseName1c) return undefined;
                let name = baseName1c;
                if (dk === '50') {
                    // Replace торическая/сферическая with пробная for DK 50
                    name = name.replace(/торическая|сферическая/i, 'пробная');
                }
                const dkPart = dk ? `DK ${dk}` : '';
                return dkPart ? `${name}. ${dkPart}` : name;
            };

            if (odChar && odQty > 0) {
                documentNameOd = buildDocName(odProduct?.name1c || null, odDk);
            }
            if (osChar && osQty > 0) {
                documentNameOs = buildDocName(osProduct?.name1c || null, osDk);
            }
        }

        // Additional products — look up real prices from catalog (client may not have them)
        let additionalProducts = body.products as Array<{ productId?: string; name: string; qty: number; price: number; category?: string }> | undefined;
        if (additionalProducts && additionalProducts.length > 0) {
            const productIds = additionalProducts.map(p => p.productId).filter(Boolean) as string[];
            if (productIds.length > 0) {
                const dbProducts = await prisma.product.findMany({
                    where: { id: { in: productIds } },
                    select: { id: true, price: true },
                });
                const priceMap = new Map(dbProducts.map(p => [p.id, p.price]));
                additionalProducts = additionalProducts.map(p => ({
                    ...p,
                    price: p.productId ? (priceMap.get(p.productId) ?? p.price) : p.price,
                }));
            }
        }
        const additionalTotal = (additionalProducts || []).reduce((sum: number, p) => sum + (p.price || 0) * (p.qty || 1), 0);

        const basePrice = odPrice + osPrice + additionalTotal;
        const discountAmt = Math.round(basePrice * DISCOUNT_PCT / 100);
        const priceAfterDiscount = basePrice - discountAmt;
        const urgentSurcharge = is_urgent ? Math.round(priceAfterDiscount * URGENT_SURCHARGE_PCT / 100) : 0;
        const totalPrice = priceAfterDiscount + urgentSurcharge;

        // Create order in database
        const order = await prisma.order.create({
            data: {
                orderNumber,
                status: 'new_order',
                isUrgent: is_urgent,
                organizationId: session.user.organizationId || undefined,
                createdById: session.user.id,
                patientId,
                opticName: session.user.profile?.opticName || '',
                doctorName: validatedData.doctor || session.user.profile?.fullName || '',
                doctorEmail: validatedData.doctor_email || undefined,
                company: validatedData.company || undefined,
                inn: validatedData.inn || undefined,
                deliveryMethod: validatedData.delivery_method || undefined,
                deliveryAddress: validatedData.delivery_address || undefined,
                lensConfig: validatedData.config as any,
                documentNameOd: documentNameOd || undefined,
                documentNameOs: documentNameOs || undefined,
                priceOd: odUnitPrice || undefined,
                priceOs: osUnitPrice || undefined,
                editDeadline: edit_deadline,
                notes: validatedData.notes || undefined,
                products: additionalProducts || undefined,
                totalPrice,
                discountPercent: DISCOUNT_PCT,
            },
            include: {
                patient: true,
                organization: { select: { name: true } },
            },
        });

        // Transform response to match frontend format
        const response = {
            order_id: order.orderNumber,
            meta: {
                optic_id: order.organizationId || '',
                optic_name: order.organization?.name || order.opticName || '',
                doctor: order.doctorName || '',
                created_at: order.createdAt.toISOString(),
                updated_at: order.updatedAt.toISOString(),
            },
            patient: order.patient ? {
                id: order.patient.id,
                name: order.patient.name,
                phone: order.patient.phone,
                email: order.patient.email || undefined,
                notes: order.patient.notes || undefined,
            } : validatedData.patient,
            config: order.lensConfig,
            status: 'new',
            is_urgent: order.isUrgent,
            edit_deadline: order.editDeadline?.toISOString(),
            notes: order.notes || undefined,
            total_price: order.totalPrice,
            discount_percent: order.discountPercent,
            products: (order as any).products || [],
        };

        return NextResponse.json(response, { status: 201 });
    } catch (error: any) {
        console.error('POST /api/orders error:', error);

        if (error.name === 'ZodError') {
            const messages = error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join('; ');
            return NextResponse.json(
                { error: `Ошибка валидации: ${messages}`, details: error.errors },
                { status: 400 }
            );
        }

        // Prisma unique constraint
        if (error.code === 'P2002') {
            return NextResponse.json(
                { error: `Дублирование записи: ${error.meta?.target || 'unknown'}` },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { error: error.message || 'Не удалось создать заказ' },
            { status: 500 }
        );
    }
}
