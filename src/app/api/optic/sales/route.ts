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

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status');

    const whereClause: any = { organizationId: user.organizationId };
    if (statusParam) {
        whereClause.paymentStatus = statusParam;
    }

    const sales = await prisma.sale.findMany({
        where: whereClause,
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
    const { items, customerName, customerPhone, discountPercent, explicitDiscountAmount, paymentMethod, paymentSplit, prepaymentAmount, notes, patientId, leadId, invoiceData: reqInvoiceData, doctorId, draftSaleId } = body;
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

    // If draftSaleId is provided, delete the draft so we don't duplicate
    if (draftSaleId) {
        try {
            await prisma.saleItem.deleteMany({ where: { saleId: draftSaleId } });
            await prisma.sale.delete({ where: { id: draftSaleId } });
        } catch (e) {
            console.warn('[SalePOS] Could not delete draft sale:', e);
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
    const discountAmount = explicitDiscountAmount !== undefined
        ? Number(explicitDiscountAmount)
        : Math.round(subtotal * discount / 100);
    const totalAmount = subtotal - discountAmount;

    // Prepayment logic: amount paid NOW
    const isPrepayment = prepaymentAmount !== undefined && prepaymentAmount !== "" && Number(prepaymentAmount) >= 0;
    const paidNow = isPrepayment ? Math.min(Number(prepaymentAmount), totalAmount) : totalAmount;
    const remainingDebt = totalAmount - paidNow;
    const paymentStatus = remainingDebt > 0 ? 'partial' : 'paid';

    // Build invoice metadata
    const invoiceMeta: any = {};
    if (paymentSplit) invoiceMeta.split = paymentSplit;
    if (remainingDebt > 0) {
        invoiceMeta.prepayment = paidNow;
        invoiceMeta.remainingDebt = remainingDebt;
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
            doctorId: doctorId || null,
            subtotal,
            discountPercent: explicitDiscountAmount !== undefined && subtotal > 0 ? (Number(explicitDiscountAmount) / subtotal * 100) : discount,
            discountAmount,
            total: totalAmount,
            paidAmount: paidNow,
            paymentMethod: paymentMethod || 'cash',
            paymentStatus: paymentStatus,
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

    // --- NEW: Sync payment to active cash shift ---
    if (paidNow > 0) {
        try {
            const activeShift = await prisma.cashShift.findFirst({
                where: {
                    status: 'open',
                    cashRegister: { organizationId: orgId }
                },
                orderBy: { openedAt: 'desc' }
            });

            if (activeShift) {
                const addTxToShift = async (method: string, amt: number) => {
                    const expectedDelta = method === 'cash' ? amt : 0;
                    
                    await prisma.$transaction(async (tx) => {
                        await tx.cashShift.update({
                            where: { id: activeShift.id },
                            data: { expectedCash: { increment: expectedDelta } }
                        });
                        
                        await tx.cashTransaction.create({
                            data: {
                                shiftId: activeShift.id,
                                cashRegisterId: activeShift.cashRegisterId,
                                transType: 'income',
                                paymentMethod: method,
                                category: 'sale',
                                amount: amt,
                                createdById: user.id,
                                description: `Оплата заказа ${saleNumber}`
                            }
                        });
                    });
                };

                if (paymentMethod === 'mixed' && invoiceMeta.split) {
                    // new mixed payments frontend sends invoiceMeta.split: [{ method, label, amount }]
                    // BUT WAIT, the frontend code we saw used invoiceData.splitPayment and cashAmount/cardAmount/transferAmount!
                    // Let's support both formats just in case
                    if (invoiceMeta.split && Array.isArray(invoiceMeta.split)) {
                         for (const sp of invoiceMeta.split) {
                             if (sp.amount > 0) await addTxToShift(sp.method, sp.amount);
                         }
                    } else if (invoiceMeta.splitPayment) {
                        if (invoiceMeta.cashAmount) await addTxToShift('cash', invoiceMeta.cashAmount);
                        if (invoiceMeta.cardAmount) await addTxToShift('card', invoiceMeta.cardAmount);
                        if (invoiceMeta.transferAmount) await addTxToShift('transfer', invoiceMeta.transferAmount);
                    }
                } else {
                    await addTxToShift(paymentMethod || 'cash', paidNow);
                }
            }
        } catch (e) {
            console.warn('[SalePOS] Failed to sync sale to cash shift:', e);
        }
    }

    return NextResponse.json(sale, { status: 201 });
}
