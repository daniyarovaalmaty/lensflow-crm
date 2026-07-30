import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
    if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const body = await req.json();
    const { items, patientId, notes } = body;
    // items: [{ productId, quantity, unitPrice }]

    if (!items?.length) return NextResponse.json({ error: 'No items' }, { status: 400 });
    if (!patientId) return NextResponse.json({ error: 'patientId is required for draft sales' }, { status: 400 });

    const orgId = user.organizationId;
    
    // Check if patient exists
    const patientObj = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patientObj) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });

    // Generate sale number
    let saleCount = await prisma.sale.count({ where: { organizationId: orgId } });
    let saleNumber = `INV-${orgId.slice(0, 4).toUpperCase()}-${String(saleCount + 1).padStart(4, '0')}`;

    let subtotal = 0;
    const saleItems: any[] = [];

    for (const item of items) {
        const product = await prisma.opticProduct.findFirst({
            where: { id: item.productId, organizationId: orgId },
        });
        if (!product) continue;

        const qty = Number(item.quantity) || 1;
        const unitPrice = Number(item.unitPrice) || product.retailPrice;
        const total = qty * unitPrice;
        subtotal += total;

        saleItems.push({
            productId: product.id, name: product.name, category: product.category,
            quantity: qty, unitPrice, total,
        });
    }

    let sale: any = null;
    for (let _attempt = 0; _attempt < 5; _attempt++) {
        try {
            sale = await prisma.sale.create({
                data: {
                    saleNumber,
                    organizationId: orgId,
                    customerName: patientObj.name,
                    customerPhone: patientObj.phone,
                    patientId,
                    subtotal,
                    discountPercent: 0,
                    discountAmount: 0,
                    total: subtotal,
                    paidAmount: 0,
                    paymentMethod: 'cash',
                    paymentStatus: 'unpaid',
                    performedById: user.id,
                    performedByName: user.fullName || user.email,
                    notes: notes || null,
                    items: {
                        create: saleItems.map(si => ({
                            productId: si.productId,
                            name: si.name,
                            category: si.category,
                            quantity: si.quantity,
                            unitPrice: si.unitPrice,
                            total: si.total,
                        })),
                    },
                },
                include: { items: true },
            });
            break;
        } catch (e: any) {
            const isUnique = e?.code === 'P2002' || JSON.stringify(e || '').includes('23505');
            if (isUnique && _attempt < 4) {
                saleCount++;
                saleNumber = `INV-${orgId.slice(0, 4).toUpperCase()}-${String(saleCount + 1).padStart(4, '0')}`;
                continue;
            }
            throw e;
        }
    }

    return NextResponse.json(sale, { status: 201 });
}
