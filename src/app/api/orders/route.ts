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
        const transformed = orders.map((order) => {
            // Map status enum back to string
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

        // Generate order ID
        const orderNumber = `LX-${Date.now().toString(36).toUpperCase()}`;

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
                    phone: validatedData.patient.phone,
                    email: validatedData.patient.email || undefined,
                    notes: validatedData.patient.notes || undefined,
                    organizationId: session.user.organizationId || undefined,
                },
            });
            patientId = patient.id;
        }

        // Create order in database
        const order = await prisma.order.create({
            data: {
                orderNumber,
                status: 'new_order',
                isUrgent: is_urgent,
                organizationId: session.user.organizationId || validatedData.optic_id || undefined,
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
                editDeadline: edit_deadline,
                notes: validatedData.notes || undefined,
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
        };

        return NextResponse.json(response, { status: 201 });
    } catch (error: any) {
        console.error('POST /api/orders error:', error);

        if (error.name === 'ZodError') {
            return NextResponse.json(
                { error: 'Validation error', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to create order' },
            { status: 500 }
        );
    }
}
