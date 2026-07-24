import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';
import ExcelJS from 'exceljs';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== 'laboratory') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = await request.json();
        const { orderIds } = body;
        if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
            return new NextResponse('Bad Request', { status: 400 });
        }

        const type = request.nextUrl.searchParams.get('type') || 'clinic';
        let contragentName = '';
        let inn = '';

        if (type === 'clinic') {
            const org = await prisma.organization.findUnique({ where: { id: params.id } });
            contragentName = org?.name || 'Контрагент';
            inn = org?.inn || '';
        } else {
            const user = await prisma.user.findUnique({ where: { id: params.id }, include: { organization: true } });
            contragentName = user?.organization?.name || user?.fullName || 'Контрагент';
            inn = user?.organization?.inn || '';
        }

        const orders = await prisma.order.findMany({
            where: {
                orderNumber: { in: orderIds },
                OR: [
                    { organizationId: params.id },
                    { createdById: params.id },
                ],
                NOT: { OR: [{ source: 'itigris' }, { externalSource: 'itigris' }] }
            },
            include: {
                patient: true,
            },
            orderBy: { createdAt: 'asc' },
        });

        if (orders.length === 0) {
            return new NextResponse('No orders found', { status: 404 });
        }

        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Общий счёт на оплату');

        const thinBorder = {
            top: { style: 'thin' as const },
            bottom: { style: 'thin' as const },
            left: { style: 'thin' as const },
            right: { style: 'thin' as const },
        };
        const titleFont = { bold: true, size: 14 };
        const headerFont = { bold: true, size: 10 };
        const boldFont = { bold: true, size: 11 };
        const headerFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };

        ws.addRow([]);

        const titleRow = ws.addRow(['', '', `ОБЩИЙ СЧЁТ НА ОПЛАТУ`, '', '', '', '']);
        ws.mergeCells(titleRow.number, 3, titleRow.number, 7);
        titleRow.getCell(3).font = titleFont;

        const dateStr = new Date().toLocaleDateString('ru-RU');
        const dateRow = ws.addRow(['', '', `от ${dateStr} г.`, '', '', '', '']);
        ws.mergeCells(dateRow.number, 3, dateRow.number, 7);

        ws.addRow([]);

        const infoStyle = (row: ExcelJS.Row) => {
            row.getCell(2).font = { bold: true, size: 10 };
            row.getCell(4).font = { size: 10 };
            for (let c = 2; c <= 7; c++) {
                row.getCell(c).border = thinBorder;
            }
        };

        let r = ws.addRow(['', 'Поставщик:', '', 'ТОО «MedInVision»', '', '', '']);
        ws.mergeCells(r.number, 4, r.number, 7);
        infoStyle(r);

        r = ws.addRow(['', 'БИН:', '', '240640050498', '', '', '']);
        ws.mergeCells(r.number, 4, r.number, 7);
        infoStyle(r);

        r = ws.addRow(['', 'Покупатель:', '', contragentName, '', '', '']);
        ws.mergeCells(r.number, 4, r.number, 7);
        infoStyle(r);

        if (inn) {
            r = ws.addRow(['', 'БИН/ИИН:', '', inn, '', '', '']);
            ws.mergeCells(r.number, 4, r.number, 7);
            infoStyle(r);
        }

        ws.addRow([]);
        ws.addRow([]);

        const headerRow = ws.addRow([
            '', '№', 'Товар / Услуга', 'Пациент (Заказ)', 'Ед.', 'Кол-во', 'Цена', 'Сумма'
        ]);
        
        ws.columns = [
            { width: 3 },   
            { width: 5 },   
            { width: 25 },  
            { width: 25 },  
            { width: 8 },   
            { width: 10 },  
            { width: 15 },  
            { width: 15 },  
        ];
        
        for (let i = 2; i <= 8; i++) {
            const cell = headerRow.getCell(i);
            cell.font = headerFont;
            cell.fill = headerFill;
            cell.border = thinBorder;
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }

        let rowIndex = 1;
        let totalSum = 0;

        for (const order of orders) {
            let orderSum = 0;
            
            const priceOd = order.priceOd || 0;
            const priceOs = order.priceOs || 0;
            
            if (priceOd > 0 || priceOs > 0) {
                // Determine quantities from lensConfig
                const lensConfig = order.lensConfig as any;
                const qtyOd = lensConfig?.od ? (lensConfig.od.quantity || 1) : 0;
                const qtyOs = lensConfig?.os ? (lensConfig.os.quantity || 1) : 0;
                
                if (qtyOd > 0 && priceOd > 0) {
                    const sum = priceOd * qtyOd;
                    orderSum += sum;
                    const row = ws.addRow([
                        '', rowIndex++, order.documentNameOd || 'Линза OD',
                        `${order.patient?.name || 'Пациент'} (№${order.orderNumber})`, 'шт', qtyOd, priceOd, sum
                    ]);
                    for (let i = 2; i <= 8; i++) row.getCell(i).border = thinBorder;
                    row.getCell(6).alignment = { horizontal: 'center' };
                    row.getCell(7).numFmt = '#,##0.00';
                    row.getCell(8).numFmt = '#,##0.00';
                }
                
                if (qtyOs > 0 && priceOs > 0) {
                    const sum = priceOs * qtyOs;
                    orderSum += sum;
                    const row = ws.addRow([
                        '', rowIndex++, order.documentNameOs || 'Линза OS',
                        `${order.patient?.name || 'Пациент'} (№${order.orderNumber})`, 'шт', qtyOs, priceOs, sum
                    ]);
                    for (let i = 2; i <= 8; i++) row.getCell(i).border = thinBorder;
                    row.getCell(6).alignment = { horizontal: 'center' };
                    row.getCell(7).numFmt = '#,##0.00';
                    row.getCell(8).numFmt = '#,##0.00';
                }
            } else {
                const price = Number(order.totalPrice || 0);
                orderSum += price;
                const row = ws.addRow([
                    '', rowIndex++, 'Изготовление линз',
                    `${order.patient?.name || 'Пациент'} (№${order.orderNumber})`, 'шт', 1, price, price
                ]);
                for (let i = 2; i <= 8; i++) row.getCell(i).border = thinBorder;
                row.getCell(6).alignment = { horizontal: 'center' };
                row.getCell(7).numFmt = '#,##0.00';
                row.getCell(8).numFmt = '#,##0.00';
            }
            
            totalSum += orderSum;
        }

        const totalRow = ws.addRow(['', '', '', '', '', '', 'Итого:', totalSum]);
        ws.mergeCells(totalRow.number, 2, totalRow.number, 6);
        totalRow.getCell(7).font = boldFont;
        totalRow.getCell(8).font = boldFont;
        totalRow.getCell(8).numFmt = '#,##0.00';

        const buffer = await wb.xlsx.writeBuffer();
        
        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="Invoice_${encodeURIComponent(contragentName)}.xlsx"`
            }
        });
    } catch (error) {
        console.error('POST /api/counterparties/[id]/invoice error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
