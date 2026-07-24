import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';
import ExcelJS from 'exceljs';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== 'laboratory') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const type = searchParams.get('type') || 'clinic';
        const startStr = searchParams.get('start');
        const endStr = searchParams.get('end');

        if (!startStr || !endStr) {
            return new NextResponse('Missing dates', { status: 400 });
        }

        const startDate = new Date(startStr);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(endStr);
        endDate.setHours(23, 59, 59, 999);

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

        // Fetch all orders for this counterparty
        const allOrders = await prisma.order.findMany({
            where: {
                OR: [
                    { organizationId: params.id },
                    { createdById: params.id },
                ],
                NOT: { OR: [{ source: 'itigris' }, { externalSource: 'itigris' }, { externalId: { startsWith: 'itigris' } }, { orderNumber: { startsWith: 'ITG-' } }] }
            },
            orderBy: { createdAt: 'asc' },
        });

        let openingBalance = 0; // Negative means they owe us (Debit)
        const periodOperations: any[] = [];

        for (const order of allOrders) {
            const orderDate = new Date(order.createdAt);
            const price = Number(order.totalPrice || 0);

            if (orderDate < startDate) {
                // If it's before the period and not paid, they owe us.
                if (order.paymentStatus !== 'paid') {
                    openingBalance += price;
                }
            } else if (orderDate >= startDate && orderDate <= endDate) {
                // Inside the period
                periodOperations.push({
                    date: orderDate,
                    document: `Заказ №${order.orderNumber}`,
                    debit: price,
                    credit: 0
                });
                
                // If paid, assume payment happened on the same date (since no payment tracking exists)
                if (order.paymentStatus === 'paid') {
                    periodOperations.push({
                        date: orderDate,
                        document: `Оплата по заказу №${order.orderNumber}`,
                        debit: 0,
                        credit: price
                    });
                }
            }
        }

        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Акт сверки');

        ws.columns = [
            { width: 15 },  // A: Дата
            { width: 35 },  // B: Документ
            { width: 15 },  // C: Дебет (Отгрузка)
            { width: 15 },  // D: Кредит (Оплата)
        ];

        const titleFont = { bold: true, size: 14 };
        const headerFont = { bold: true, size: 11 };
        const boldFont = { bold: true, size: 11 };
        const thinBorder = {
            top: { style: 'thin' as const },
            bottom: { style: 'thin' as const },
            left: { style: 'thin' as const },
            right: { style: 'thin' as const },
        };

        ws.addRow(['Акт сверки взаиморасчетов']);
        ws.getCell('A1').font = titleFont;
        ws.mergeCells('A1:D1');
        ws.getCell('A1').alignment = { horizontal: 'center' };

        ws.addRow([]);
        ws.addRow([`Контрагент: ${contragentName}`]).getCell(1).font = boldFont;
        if (inn) ws.addRow([`БИН/ИИН: ${inn}`]);
        ws.addRow([`Период: с ${startDate.toLocaleDateString('ru-RU')} по ${endDate.toLocaleDateString('ru-RU')}`]);
        ws.addRow([]);

        // Header
        const headerRow = ws.addRow(['Дата', 'Документ', 'Дебет (Мы оказали)', 'Кредит (Мы получили)']);
        for (let i = 1; i <= 4; i++) {
            headerRow.getCell(i).font = headerFont;
            headerRow.getCell(i).border = thinBorder;
            headerRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };
            headerRow.getCell(i).alignment = { horizontal: 'center', vertical: 'middle' };
        }

        // Opening balance
        const openRow = ws.addRow(['', 'Сальдо на начало периода', openingBalance > 0 ? openingBalance : 0, openingBalance < 0 ? Math.abs(openingBalance) : 0]);
        for (let i = 1; i <= 4; i++) {
            openRow.getCell(i).border = thinBorder;
            openRow.getCell(i).font = boldFont;
        }

        let totalDebit = 0;
        let totalCredit = 0;

        for (const op of periodOperations) {
            totalDebit += op.debit;
            totalCredit += op.credit;
            const row = ws.addRow([
                op.date.toLocaleDateString('ru-RU'),
                op.document,
                op.debit || '',
                op.credit || ''
            ]);
            for (let i = 1; i <= 4; i++) row.getCell(i).border = thinBorder;
            if (op.debit) row.getCell(3).numFmt = '#,##0.00';
            if (op.credit) row.getCell(4).numFmt = '#,##0.00';
        }

        // Totals
        const totRow = ws.addRow(['', 'Обороты за период', totalDebit, totalCredit]);
        for (let i = 1; i <= 4; i++) {
            totRow.getCell(i).border = thinBorder;
            totRow.getCell(i).font = boldFont;
        }

        const closingBalance = openingBalance + totalDebit - totalCredit;
        const closeRow = ws.addRow(['', 'Сальдо на конец периода', closingBalance > 0 ? closingBalance : 0, closingBalance < 0 ? Math.abs(closingBalance) : 0]);
        for (let i = 1; i <= 4; i++) {
            closeRow.getCell(i).border = thinBorder;
            closeRow.getCell(i).font = boldFont;
        }

        ws.addRow([]);
        ws.addRow(['Внимание: Акт сверки составлен автоматически без учета точных дат платежей.']);

        const buffer = await wb.xlsx.writeBuffer();

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="Reconciliation_${encodeURIComponent(contragentName)}.xlsx"`
            }
        });

    } catch (error) {
        console.error('GET /api/counterparties/[id]/reconciliation error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
