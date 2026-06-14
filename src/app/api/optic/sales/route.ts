import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

// ==================== GET — List sales ====================
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
    if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const sales = await prisma.sale.findMany({
        where: { organizationId: user.organizationId },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        take: 200,
    });

    return NextResponse.json(sales);
}

// ==================== POST — Create sale ====================
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
    if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const body = await req.json();
    const { items, customerName, customerPhone, discountPercent, paymentMethod, paymentSplit, prepaymentAmount, notes, patientId, leadId, invoiceData: reqInvoiceData } = body;
    // items: [{ productId, quantity, unitPrice }]

    if (!items?.length) return NextResponse.json({ error: 'No items' }, { status: 400 });

    const orgId = user.organizationId;

    // Generate sale number (globally unique to avoid @unique constraint violations)
    let saleCount = await prisma.sale.count({ where: { organizationId: orgId } });
    let saleNumber = `S-${orgId.slice(0, 4).toUpperCase()}-${String(saleCount + 1).padStart(4, '0')}`;

    // Auto-attribute lead if patient is provided but no leadId is given
    let finalLeadId = leadId;
    if (!finalLeadId && patientId) {
        try {
            const activeLead = await prisma.lead.findFirst({
                where: {
                    patientId,
                    stage: { notIn: ['converted', 'lost'] },
                },
            });
            if (activeLead) {
                finalLeadId = activeLead.id;
            } else {
                const patientObj = await prisma.patient.findUnique({ where: { id: patientId } });
                if (patientObj?.phone) {
                    const cleanPhone = patientObj.phone.replace(/[\s\-\+\(\)]/g, '').split('@')[0];
                    const last9 = cleanPhone.slice(-9);
                    if (last9) {
                        const phoneLead = await prisma.lead.findFirst({
                            where: {
                                phone: { contains: last9 },
                                stage: { notIn: ['converted', 'lost'] },
                            },
                        });
                        if (phoneLead) {
                            finalLeadId = phoneLead.id;
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('[SalePOS] Active lead look up failed:', e);
        }
    }

    // Calculate totals
    let subtotal = 0;
    const saleItems: any[] = [];

    for (const item of items) {
        let product;
        let isCustom = false;
        
        if (item.productId?.startsWith('custom_')) {
            isCustom = true;
            product = await prisma.opticProduct.findFirst({
                where: { organizationId: orgId, name: 'Свободная позиция', type: 'service' }
            });
            if (!product) {
                product = await prisma.opticProduct.create({
                    data: {
                        organizationId: orgId,
                        name: 'Свободная позиция',
                        category: 'Услуга',
                        type: 'service',
                        retailPrice: 0,
                        isActive: true,
                        isPublic: false
                    }
                });
            }
        } else {
            product = await prisma.opticProduct.findFirst({
                where: { id: item.productId, organizationId: orgId },
            });
        }
        
        if (!product) continue;

        const qty = Number(item.quantity) || 1;
        const unitPrice = Number(item.unitPrice) || product.retailPrice;
        const total = qty * unitPrice;
        subtotal += total;

        // For products (not services), deduct from stock
        if (product.type === 'product') {
            if (product.trackSerials) {
                // Mark N stock items as sold
                const stockItems = await prisma.stockItem.findMany({
                    where: { organizationId: orgId, productId: product.id, status: 'in_stock' },
                    take: qty,
                });
                const soldSerials: string[] = [];
                for (const si of stockItems) {
                    await prisma.stockItem.update({
                        where: { id: si.id },
                        data: { status: 'sold', soldAt: new Date() },
                    });
                    if (si.serialNumber) soldSerials.push(si.serialNumber);
                }
                saleItems.push({
                    productId: product.id, name: product.name, category: product.category,
                    quantity: qty, unitPrice, total, serialNumbers: soldSerials,
                });
            } else {
                // Bulk — mark items as sold
                const stockItems = await prisma.stockItem.findMany({
                    where: { organizationId: orgId, productId: product.id, status: 'in_stock' },
                    take: qty,
                });
                for (const si of stockItems) {
                    await prisma.stockItem.update({
                        where: { id: si.id },
                        data: { status: 'sold', soldAt: new Date() },
                    });
                }
                saleItems.push({
                    productId: product.id, name: product.name, category: product.category,
                    quantity: qty, unitPrice, total,
                });
            }

            // Decrement currentStock
            await prisma.opticProduct.update({
                where: { id: product.id },
                data: { currentStock: { decrement: qty } },
            });

            // Record movement
            await prisma.stockMovement.create({
                data: {
                    organizationId: orgId, productId: product.id,
                    type: 'sale', quantity: -qty,
                    documentNumber: saleNumber,
                    customerName: customerName || null,
                    performedById: user.id,
                    performedByName: user.fullName || user.email,
                },
            });
        } else {
            // Service — no stock change
            saleItems.push({
                productId: product.id, 
                name: isCustom && item.name ? item.name : product.name, 
                category: isCustom && item.category ? item.category : product.category,
                quantity: qty, 
                unitPrice, 
                total,
            });
        }
    }

    const discount = Number(discountPercent) || 0;
    const discountAmount = Math.round(subtotal * discount / 100);
    const totalAmount = subtotal - discountAmount;

    // Prepayment already received earlier — clamp to [0, total]
    const prepayment = Math.min(Math.max(Number(prepaymentAmount) || 0, 0), totalAmount);
    const dueNow = totalAmount - prepayment;

    // Build invoice metadata (split + prepayment breakdown)
    const invoiceMeta: any = {};
    if (paymentSplit) invoiceMeta.split = paymentSplit;
    if (prepayment > 0) {
        invoiceMeta.prepayment = prepayment;
        invoiceMeta.dueNow = dueNow;
    }

    // Create sale with items — retry with a fresh number on unique-collision
    // (covers concurrent sales across organizations).
    let sale: any = null;
    for (let _attempt = 0; _attempt < 5; _attempt++) {
      try {
        sale = await prisma.sale.create({
        data: {
            saleNumber,
            organizationId: orgId,
            customerName: customerName || null,
            customerPhone: customerPhone || null,
            patientId: patientId || null,
            leadId: finalLeadId || null,
            subtotal,
            discountPercent: discount,
            discountAmount,
            total: totalAmount,
            paidAmount: totalAmount,
            paymentMethod: paymentMethod || 'cash',
            paymentStatus: 'paid',
            invoiceData: Object.keys(invoiceMeta).length > 0 ? invoiceMeta : (reqInvoiceData || null),
            performedById: user.id,
            performedByName: user.fullName || user.email,
            notes: null,
            items: {
                create: saleItems.map(si => ({
                    productId: si.productId,
                    name: si.name,
                    category: si.category,
                    quantity: si.quantity,
                    unitPrice: si.unitPrice,
                    total: si.total,
                    serialNumbers: si.serialNumbers || undefined,
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
            saleNumber = `S-${orgId.slice(0, 4).toUpperCase()}-${String(saleCount + 1).padStart(4, '0')}`;
            continue; 
        }
        throw e;
      }
    }

    // Attribute revenue and update lead stage
    if (finalLeadId) {
        try {
            await prisma.lead.update({
                where: { id: finalLeadId },
                data: {
                    revenue: { increment: totalAmount },
                    stage: 'converted',
                    convertedAt: new Date(),
                },
            });
            await prisma.leadActivity.create({
                data: {
                    leadId: finalLeadId,
                    action: 'stage_change',
                    details: `Выручка лида увеличена на ${totalAmount} ₸ (продажа ${saleNumber}). Стадия обновлена на Конвертирован.`,
                    userId: user.id,
                },
            });
        } catch (e) {
            console.warn('[SalePOS] Could not update lead revenue/stage:', e);
        }
    }

    return NextResponse.json(sale, { status: 201 });
}
