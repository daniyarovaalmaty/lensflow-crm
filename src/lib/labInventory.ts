import prisma from '@/lib/db/prisma';

export async function writeOffOrderMaterials(orderId: string, labId: string) {
    try {
        const order = await prisma.order.findUnique({
            where: { id: orderId }
        });
        if (!order) return { success: false, error: 'Order not found' };

        const config: any = order.lensConfig;
        if (!config || !config.eyes) return { success: false, error: 'No lens config' };

        // Determine quantities
        let numLenses = 0;
        let isIndividual = false;

        if (config.eyes.od) {
            numLenses += Number(config.eyes.od.qty || 1);
            if (!config.eyes.od.trial) isIndividual = true;
        }
        if (config.eyes.os) {
            numLenses += Number(config.eyes.os.qty || 1);
            if (!config.eyes.os.trial) isIndividual = true;
        }

        if (numLenses === 0) return { success: true };

        // Fetch settings for norms
        const settings = await prisma.labSettings.findUnique({ where: { id: 'default' } }) as any;
        
        const normContrapol = settings?.normContrapolPerLens || 0;
        const normWax = settings?.normWaxPerLens || 0;
        const normSticker = settings?.normStickerPerLens || 0;
        const normBox = settings?.normBoxPerOrder || 0;
        const normPackage = settings?.normPackagePerOrder || 0;

        // Collect what needs to be written off
        const toWriteOff: Array<{ productId: string, qty: number }> = [];

        // 1. Blanks (Заготовки)
        // For simplicity, we just look for any product with category 'blank' or name 'Заготовка'
        // and deduct `numLenses` of it. Ideally, there is a mapping from DK/Material to Blank SKU.
        // For now, we will deduct a generic "Заготовка Contamac" if it exists.
        const blankProduct = await prisma.opticProduct.findFirst({
            where: { organizationId: labId, name: { contains: 'Заготовка' }, isActive: true }
        });
        if (blankProduct) {
            toWriteOff.push({ productId: blankProduct.id, qty: numLenses });
        }

        // 2. Contrapol & Wax
        if (normContrapol > 0) {
            const contrapolProduct = await prisma.opticProduct.findFirst({
                where: { organizationId: labId, name: { contains: 'Контрапол', mode: 'insensitive' }, isActive: true }
            });
            if (contrapolProduct) toWriteOff.push({ productId: contrapolProduct.id, qty: numLenses * normContrapol });
        }

        if (normWax > 0) {
            const waxProduct = await prisma.opticProduct.findFirst({
                where: { organizationId: labId, name: { contains: 'Воск', mode: 'insensitive' }, isActive: true }
            });
            if (waxProduct) toWriteOff.push({ productId: waxProduct.id, qty: numLenses * normWax });
        }

        // 3. Packaging
        if (normBox > 0) {
            const boxProduct = await prisma.opticProduct.findFirst({
                where: { organizationId: labId, name: { contains: 'Коробка', mode: 'insensitive' }, isActive: true }
            });
            if (boxProduct) toWriteOff.push({ productId: boxProduct.id, qty: normBox });
        }

        if (normPackage > 0) {
            const pkgProduct = await prisma.opticProduct.findFirst({
                where: { organizationId: labId, name: { contains: 'Упаковка', mode: 'insensitive' }, isActive: true }
            });
            if (pkgProduct) toWriteOff.push({ productId: pkgProduct.id, qty: normPackage });
        }

        // 4. Blisters and Stickers (Only for individual orders)
        if (isIndividual) {
            const blisterProduct = await prisma.opticProduct.findFirst({
                where: { organizationId: labId, name: { contains: 'Блистер', mode: 'insensitive' }, isActive: true }
            });
            if (blisterProduct) toWriteOff.push({ productId: blisterProduct.id, qty: numLenses });

            if (normSticker > 0) {
                const stickerProduct = await prisma.opticProduct.findFirst({
                    where: { organizationId: labId, name: { contains: 'Наклейка', mode: 'insensitive' }, isActive: true }
                });
                if (stickerProduct) toWriteOff.push({ productId: stickerProduct.id, qty: numLenses * normSticker });
            }
        }

        if (toWriteOff.length === 0) return { success: true, message: 'No materials found to write off' };

        // Generate doc num
        const docCount = await prisma.stockDocument.count({ where: { organizationId: labId, type: 'write_off' } });
        const docNum = `П-АС-${String(docCount + 1).padStart(4, '0')}`;

        // Perform write off
        await prisma.$transaction(async (tx) => {
            const docItems = [];
            for (const item of toWriteOff) {
                const product = await tx.opticProduct.findUnique({ where: { id: item.productId } });
                if (!product) continue;

                // Adjust current stock
                await tx.opticProduct.update({
                    where: { id: product.id },
                    data: { currentStock: { decrement: item.qty } }
                });

                // Write off stock items (FIFO logic)
                const stockItems = await tx.stockItem.findMany({
                    where: { organizationId: labId, productId: product.id, status: 'in_stock' },
                    take: Math.ceil(item.qty),
                    orderBy: { receivedAt: 'asc' }
                });

                for (const si of stockItems) {
                    await tx.stockItem.update({
                        where: { id: si.id },
                        data: { status: 'written_off' }
                    });
                }

                // Add movement
                await tx.stockMovement.create({
                    data: {
                        organizationId: labId,
                        productId: product.id,
                        type: 'write_off',
                        quantity: -item.qty,
                        documentNumber: docNum,
                        reason: `Автосписание (Заказ ${order.orderNumber})`,
                        performedById: order.createdById || 'system',
                        performedByName: 'System Auto',
                    }
                });

                docItems.push({ productId: product.id, name: product.name, qty: item.qty, serialNumbers: [] });
            }

            if (docItems.length > 0) {
                await tx.stockDocument.create({
                    data: {
                        documentNumber: docNum,
                        organizationId: labId,
                        type: 'write_off',
                        status: 'confirmed',
                        totalAmount: 0,
                        items: docItems,
                        notes: `Автосписание (Заказ ${order.orderNumber})`,
                        performedById: order.createdById || 'system',
                        performedByName: 'System Auto',
                        confirmedAt: new Date(),
                    }
                });
            }
        });

        return { success: true };
    } catch (e: any) {
        console.error('Auto write off error:', e);
        return { success: false, error: e.message };
    }
}
