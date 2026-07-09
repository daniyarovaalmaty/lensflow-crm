import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';


export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
        if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

        const { orderIds } = await req.json();
        if (!orderIds || orderIds.length === 0) {
            return NextResponse.json({ error: 'No orders selected' }, { status: 400 });
        }

        const orders = await prisma.order.findMany({
            where: { orderNumber: { in: orderIds }, labOrgId: user.organizationId }
        });

        // Calculate materials
        const settings = await prisma.labSettings.findUnique({ where: { id: 'default' } }) as any;
        const normContrapol = settings?.normContrapolPerLens || 0;
        const normWax = settings?.normWaxPerLens || 0;
        const normSticker = settings?.normStickerPerLens || 0;
        const normBox = settings?.normBoxPerOrder || 0;
        const normPackage = settings?.normPackagePerOrder || 0;

        const materials = new Map<string, { name: string, qty: number, unit: string }>();

        const addMaterial = (key: string, name: string, qty: number, unit: string) => {
            if (qty <= 0) return;
            if (materials.has(key)) {
                materials.get(key)!.qty += qty;
            } else {
                materials.set(key, { name, qty, unit });
            }
        };

        for (const order of orders) {
            const config: any = order.lensConfig;
            if (!config || !config.eyes) continue;

            let numLenses = 0;
            let isIndividual = false;

            const processEye = (eye: any) => {
                if (!eye) return;
                const qty = Number(eye.qty || 1);
                numLenses += qty;
                if (!eye.trial) isIndividual = true;

                // Group blanks by Dk
                const dk = eye.dk || 'Неизвестно';
                const color = eye.color || '';
                const name = `Заготовка Contamac Dk ${dk} ${color}`.trim();
                addMaterial(`blank_${dk}_${color}`, name, qty, 'шт');
            };

            processEye(config.eyes.od);
            processEye(config.eyes.os);

            if (numLenses > 0) {
                addMaterial('contrapol', 'Контрапол', numLenses * normContrapol, 'мл');
                addMaterial('wax', 'Воск', numLenses * normWax, 'гр');
                addMaterial('box', 'Коробка', normBox, 'шт');
                addMaterial('package', 'Упаковка', normPackage, 'шт');

                if (isIndividual) {
                    addMaterial('blister', 'Блистер', numLenses, 'шт');
                    addMaterial('sticker', 'Этикетка', numLenses * normSticker, 'шт');
                }
            }
        }

        return NextResponse.json({ materials: Array.from(materials.values()) });
    } catch (error: any) {
        console.error('M11 generate error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
