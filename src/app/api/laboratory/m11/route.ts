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

        const itemsHtml = Array.from(materials.values()).map((m, i) => `
            <tr>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">${i + 1}</td>
                <td style="border: 1px solid #000; padding: 4px;">${m.name}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">${m.unit}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">${m.qty.toFixed(2).replace('.00', '')}</td>
            </tr>
        `).join('');

        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Требование-накладная М-11</title>
            <style>
                body { font-family: 'Arial', sans-serif; font-size: 12px; margin: 20px; }
                h2 { text-align: center; font-size: 16px; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #000; padding: 6px; }
                th { background-color: #f3f4f6; font-weight: bold; text-align: center; }
                .header-info { display: flex; justify-content: space-between; margin-bottom: 20px; line-height: 1.5; }
            </style>
        </head>
        <body>
            <h2>ТИПОВАЯ МЕЖОТРАСЛЕВАЯ ФОРМА № М-11<br><br>ТРЕБОВАНИЕ-НАКЛАДНАЯ № ____</h2>
            <div class="header-info">
                <div>
                    <b>Организация:</b> ${user.organizationId}<br>
                    <b>Отправитель:</b> Склад лаборатории<br>
                    <b>Получатель:</b> Производственный цех
                </div>
                <div>
                    <b>Дата составления:</b> ${new Date().toLocaleDateString('ru-RU')}<br>
                    <b>Основание:</b> Производство заказов (${orders.length} шт.)
                </div>
            </div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 5%">№</th>
                        <th style="width: 60%">Материальные ценности</th>
                        <th style="width: 15%">Ед. изм.</th>
                        <th style="width: 20%">Затребовано (отпущено)</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>
            <br><br>
            <div style="display: flex; justify-content: space-between; margin-top: 40px; border-top: 1px solid #000; padding-top: 20px;">
                <div style="width: 45%;">
                    <b>Отпустил:</b><br><br>
                    Должность: ______________________<br><br>
                    Подпись: ______________________<br><br>
                    Расшифровка: ______________________
                </div>
                <div style="width: 45%;">
                    <b>Получил:</b><br><br>
                    Должность: ______________________<br><br>
                    Подпись: ______________________<br><br>
                    Расшифровка: ______________________
                </div>
            </div>
        </body>
        </html>
        `;

        

        return new NextResponse(html, {
            status: 200,
            headers: {
                'Content-Type': 'text/html; charset=utf-8'
            }
        });
    } catch (error: any) {
        console.error('M11 generate error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
