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

        // Fetch all products
        const products = await prisma.opticProduct.findMany({
            where: { organizationId: orgId, category: { in: ['contact_lens', 'spectacle_lens'] } }
        });

        // Fetch ALL movements up to endDate
        const allMovements = await prisma.stockMovement.findMany({
            where: {
                organizationId: orgId,
                createdAt: {
                    lte: endDate
                }
            }
        });

        // Fetch all stock items to know diopters and expiry date for serials
        const allStockItems = await prisma.stockItem.findMany({
            where: { organizationId: orgId },
            select: { serialNumber: true, diopters: true, expiryDate: true, batchNumber: true }
        });
        
        const serialDetails = new Map<string, { diopters: string, expiryDate: Date | null, batchNumber: string | null }>();
        allStockItems.forEach(si => {
            if (si.serialNumber) {
                serialDetails.set(si.serialNumber, {
                    diopters: si.diopters || '-',
                    expiryDate: si.expiryDate,
                    batchNumber: si.batchNumber
                });
            }
        });

        const result = products.map(product => {
            const productMovements = allMovements.filter(m => m.productId === product.id);
            
            // We'll track stats per serial number (or "NO_SERIAL" if none)
            const statsBySerial: Record<string, { initial: number, in: number, out: number }> = {};
            
            productMovements.forEach(m => {
                let sns: string[] = [];
                if (m.serialNumbers && Array.isArray(m.serialNumbers) && m.serialNumbers.length > 0) {
                    sns = m.serialNumbers as string[];
                } else {
                    sns = ['NO_SERIAL'];
                }

                const isPeriod = m.createdAt >= startDate && m.createdAt <= endDate;
                const isOut = m.quantity < 0;
                // If it's NO_SERIAL, use actual qty. If serials, each is 1 qty.
                const qtyPerItem = sns[0] === 'NO_SERIAL' ? Math.abs(m.quantity) : 1;

                sns.forEach(sn => {
                    if (!statsBySerial[sn]) statsBySerial[sn] = { initial: 0, in: 0, out: 0 };
                    
                    if (!isPeriod) {
                        // History before startDate
                        if (isOut) {
                            statsBySerial[sn].initial -= qtyPerItem;
                        } else {
                            statsBySerial[sn].initial += qtyPerItem;
                        }
                    } else {
                        // Inside period
                        if (isOut) {
                            statsBySerial[sn].out += qtyPerItem;
                        } else {
                            statsBySerial[sn].in += qtyPerItem;
                        }
                    }
                });
            });

            // Now group serials by diopter
            const diopterGroups: Record<string, { initial: number, in: number, out: number, final: number, items: any[] }> = {};

            Object.entries(statsBySerial).forEach(([sn, stats]) => {
                const final = stats.initial + stats.in - stats.out;
                
                // Skip if this batch has zero history and zero current
                if (stats.initial === 0 && stats.in === 0 && stats.out === 0 && final === 0) return;

                const details = serialDetails.get(sn) || { diopters: '-', expiryDate: null, batchNumber: sn === 'NO_SERIAL' ? null : sn };
                const d = details.diopters;

                if (!diopterGroups[d]) {
                    diopterGroups[d] = { initial: 0, in: 0, out: 0, final: 0, items: [] };
                }

                diopterGroups[d].initial += stats.initial;
                diopterGroups[d].in += stats.in;
                diopterGroups[d].out += stats.out;
                diopterGroups[d].final += final;

                diopterGroups[d].items.push({
                    id: sn,
                    serialNumber: sn === 'NO_SERIAL' ? '' : sn,
                    batchNumber: details.batchNumber,
                    expiryDate: details.expiryDate,
                    initial: stats.initial,
                    in: stats.in,
                    out: stats.out,
                    quantity: final // this is the final fact
                });
            });

            const turnover = Object.entries(diopterGroups).map(([diopter, data]) => {
                // sort items by expiry date, then serial
                data.items.sort((a, b) => {
                    if (a.expiryDate && b.expiryDate) {
                        return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
                    }
                    return 0;
                });
                return {
                    diopter,
                    ...data
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
