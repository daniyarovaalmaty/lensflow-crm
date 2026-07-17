import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { auth } from '@/auth';

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.organizationId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const orgId = session.user.organizationId;
        const { searchParams } = new URL(req.url);
        const startDateStr = searchParams.get('startDate');
        const endDateStr = searchParams.get('endDate');

        // Default to current month if not provided
        const now = new Date();
        const startDate = startDateStr ? new Date(startDateStr) : new Date(now.getFullYear(), now.getMonth(), 1);
        const endDate = endDateStr ? new Date(endDateStr) : new Date();
        endDate.setHours(23, 59, 59, 999);

        // Fetch products and their current batches
        const products = await prisma.opticProduct.findMany({
            where: { organizationId: orgId, category: { in: ['contact_lens', 'spectacle_lens'] } },
            include: {
                stockItems: true // current batches
            }
        });

        // Fetch movements within the period
        const movements = await prisma.stockMovement.findMany({
            where: {
                organizationId: orgId,
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });

        // Fetch all stock items (even written off/sold) to know the diopter of serials
        const allStockItems = await prisma.stockItem.findMany({
            where: { organizationId: orgId },
            select: { serialNumber: true, diopters: true }
        });
        
        const serialToDiopter = new Map<string, string>();
        allStockItems.forEach(si => {
            if (si.serialNumber) {
                serialToDiopter.set(si.serialNumber, si.diopters || '-');
            }
        });

        // Calculate turnover
        const result = products.map(product => {
            const currentStockByDiopter: Record<string, number> = {};
            product.stockItems.forEach(si => {
                const d = si.diopters || '-';
                if (!currentStockByDiopter[d]) currentStockByDiopter[d] = 0;
                if (si.status === 'in_stock' || si.status === 'reserved') {
                    currentStockByDiopter[d] += si.quantity;
                }
            });

            const productMovements = movements.filter(m => m.productId === product.id);
            const inByDiopter: Record<string, number> = {};
            const outByDiopter: Record<string, number> = {};

            productMovements.forEach(m => {
                let sns: string[] = [];
                if (m.serialNumbers && Array.isArray(m.serialNumbers)) {
                    sns = m.serialNumbers as string[];
                }

                // Incoming if quantity > 0, Outgoing if quantity < 0
                const isOut = m.quantity < 0;
                const absQty = Math.abs(m.quantity);

                if (sns.length > 0) {
                    sns.forEach(sn => {
                        const d = serialToDiopter.get(sn) || '-';
                        if (isOut) {
                            outByDiopter[d] = (outByDiopter[d] || 0) + 1; // 1 unit per serial
                        } else {
                            inByDiopter[d] = (inByDiopter[d] || 0) + 1;
                        }
                    });
                } else {
                    const d = '-';
                    if (isOut) {
                        outByDiopter[d] = (outByDiopter[d] || 0) + absQty;
                    } else {
                        inByDiopter[d] = (inByDiopter[d] || 0) + absQty;
                    }
                }
            });

            const allDiopters = new Set([
                ...Object.keys(currentStockByDiopter),
                ...Object.keys(inByDiopter),
                ...Object.keys(outByDiopter)
            ]);

            const turnover = Array.from(allDiopters).map(d => {
                const final = currentStockByDiopter[d] || 0;
                const prihod = inByDiopter[d] || 0;
                const rashod = outByDiopter[d] || 0;
                
                // Initial + Prihod - Rashod = Final => Initial = Final - Prihod + Rashod
                const initial = final - prihod + rashod;

                return {
                    diopter: d,
                    initial,
                    in: prihod,
                    out: rashod,
                    final,
                    items: product.stockItems.filter(si => (si.diopters || '-') === d && (si.status === 'in_stock' || si.status === 'reserved'))
                };
            }).sort((a, b) => {
                if (a.diopter === '-') return 1;
                if (b.diopter === '-') return -1;
                return parseFloat(a.diopter) - parseFloat(b.diopter);
            });

            return {
                id: product.id,
                name: product.name,
                brand: product.brand,
                model: product.model,
                trackSerials: product.trackSerials,
                unit: product.unit,
                purchasePrice: product.purchasePrice,
                turnover
            };
        });

        // Filter out completely empty products
        const filteredResult = result.filter(r => 
            r.turnover.some(t => t.initial !== 0 || t.in !== 0 || t.out !== 0 || t.final !== 0)
        );

        return NextResponse.json(filteredResult);

    } catch (error) {
        console.error('Turnover error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
