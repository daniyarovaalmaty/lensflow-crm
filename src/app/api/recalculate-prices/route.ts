export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

/**
 * GET /api/recalculate-prices — Recalculate totalPrice for all orders based on current catalog prices
 * Only lab_head can run this
 */
export async function GET() {
    const session = await auth();
    if (!session?.user || session.user.role !== 'laboratory' || session.user.subRole !== 'lab_head') {
        return NextResponse.json({ error: 'Only admin can recalculate prices' }, { status: 403 });
    }

    try {
        // Get lab settings for urgent surcharge
        const labSettings = await prisma.labSettings.upsert({
            where: { id: 'default' },
            create: { id: 'default' },
            update: {},
        });
        const urgentPct = labSettings.urgentSurchargePercent;

        // Get all lens products from catalog
        const lensProducts = await prisma.product.findMany({
            where: { category: 'lens' },
            select: { description: true, price: true, priceByDk: true },
        });
        const productMap = new Map(lensProducts.map((p: any) => [p.description, p]));

        // Get lens price based on DK value
        const getLensPrice = (characteristic: string, dk: string): number => {
            const product: any = productMap.get(characteristic);
            if (!product) return 0;
            if (product.priceByDk && typeof product.priceByDk === 'object') {
                const dkPrice = (product.priceByDk as Record<string, number>)[dk];
                if (dkPrice != null) return dkPrice;
            }
            return product.price || 0;
        };

        // Get all orders with their configs
        const orders = await prisma.order.findMany({
            where: { status: { not: 'cancelled' } },
            select: {
                id: true,
                orderNumber: true,
                lensConfig: true,
                isUrgent: true,
                totalPrice: true,
                discountPercent: true,
                products: true,
            },
        });

        let updated = 0;
        const results: { orderNumber: string; oldPrice: number; newPrice: number }[] = [];

        for (const order of orders) {
            const config = order.lensConfig as any;
            const odChar = config?.eyes?.od?.characteristic || '';
            const osChar = config?.eyes?.os?.characteristic || '';
            const odDk = String(config?.eyes?.od?.dk || '');
            const osDk = String(config?.eyes?.os?.dk || '');
            const odQty = Number(config?.eyes?.od?.qty) || 0;
            const osQty = Number(config?.eyes?.os?.qty) || 0;

            const odUnitPrice = odChar ? getLensPrice(odChar, odDk) : 0;
            const osUnitPrice = osChar ? getLensPrice(osChar, osDk) : 0;

            const odTotal = odUnitPrice * odQty;
            const osTotal = osUnitPrice * osQty;

            // Additional products
            const products = (order.products as any) || [];
            const additionalTotal = Array.isArray(products)
                ? products.reduce((sum: number, p: any) => sum + (p.price || 0) * (p.qty || 1), 0)
                : 0;

            const basePrice = odTotal + osTotal + additionalTotal;
            const discountPct = order.discountPercent || 0;
            const discountAmt = Math.round(basePrice * discountPct / 100);
            const afterDiscount = basePrice - discountAmt;
            const urgentAmt = order.isUrgent ? Math.round(afterDiscount * urgentPct / 100) : 0;
            const newTotalPrice = afterDiscount + urgentAmt;

            if (newTotalPrice !== order.totalPrice) {
                await prisma.order.update({
                    where: { id: order.id },
                    data: {
                        totalPrice: newTotalPrice,
                        priceOd: odUnitPrice || undefined,
                        priceOs: osUnitPrice || undefined,
                    },
                });
                results.push({
                    orderNumber: order.orderNumber,
                    oldPrice: order.totalPrice,
                    newPrice: newTotalPrice,
                });
                updated++;
            }
        }

        return NextResponse.json({
            success: true,
            totalOrders: orders.length,
            updated,
            changes: results,
        });
    } catch (error: any) {
        console.error('Recalculate prices error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
