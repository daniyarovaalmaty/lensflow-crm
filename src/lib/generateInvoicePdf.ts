'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RobotoRegular } from './fonts/roboto-regular';
import { numberToWordsRu } from './numberToWordsRu';

interface InvoiceOrder {
    order_id: string;
    patient: { name: string };
    meta: { doctor?: string; created_at: string };
    company?: string;
    config: any;
    is_urgent?: boolean;
    total_price?: number;
    discount_percent?: number;
    document_name_od?: string;
    document_name_os?: string;
    price_od?: number;
    price_os?: number;
    products?: Array<{ name: string; qty: number; price: number }>;
    
    contract?: {
        number: string;
        date: string; // ISO or Date string
        provider?: {
            name: string;
            inn: string;
            address: string;
            bankName: string;
            bik: string;
            iban: string;
        };
        client?: {
            name: string;
            inn: string;
            address: string;
        }
    };
    optic_inn?: string;
    optic_address?: string;
    lab_org?: {
        name: string;
        inn: string;
        address: string;
        bankName: string;
        bik: string;
        iban: string;
    };
}

const PRICE_PER_LENS = 17500;

export async function generateInvoicePdf(order: InvoiceOrder): Promise<void> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    doc.addFileToVFS('Roboto-Regular.ttf', RobotoRegular);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'bold');
    doc.setFont('Roboto', 'normal');

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    
    const od = (order.config?.eyes?.od || { km: "-", dia: "-", dk: "-", qty: 0 });
    const os = (order.config?.eyes?.os || { km: "-", dia: "-", dk: "-", qty: 0 });
    const odQty = od.characteristic ? (Number(od.qty) || 0) : 0;
    const osQty = os.characteristic ? (Number(os.qty) || 0) : 0;
    const additionalProducts = order.products || [];
    const discountPct = order.discount_percent ?? 0;
    const isUrgent = order.is_urgent || false;
    const URGENT_PCT = 25;
    const orderDate = new Date(order.meta.created_at);
    
    const formatter = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
    const dateStr = formatter.format(orderDate).replace(' г.', '');
    const fmt = (n: number) => n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const odUnitPrice = order.price_od ?? (odQty > 0 ? PRICE_PER_LENS : 0);
    const osUnitPrice = order.price_os ?? (osQty > 0 ? PRICE_PER_LENS : 0);

    const providerName = order.contract?.provider?.name || order.lab_org?.name || 'ТОО "MedInnVision"';
    const providerInn = order.contract?.provider?.inn || order.lab_org?.inn || '970121400808';
    const providerAddress = order.contract?.provider?.address || order.lab_org?.address || 'Алматинская обл., Талгарский р-он, с. Талгар, ул. БЕРЕГОВАЯ, д. 72';
    const providerBank = order.contract?.provider?.bankName || order.lab_org?.bankName || 'АО "Народный Банк Казахстана"';
    const providerBik = order.contract?.provider?.bik || order.lab_org?.bik || 'HSBKKZKX';
    const providerIban = order.contract?.provider?.iban || order.lab_org?.iban || 'KZ48601A861003807741';

    const clientName = order.contract?.client?.name || order.company || 'Покупатель не указан';
    const clientInn = order.contract?.client?.inn || order.optic_inn || (order as any).inn || '';
    const clientAddress = order.contract?.client?.address || order.optic_address || (order as any).delivery_address || '';

    let contractStr = '________________________________________';
    if (order.contract) {
        const cDate = new Date(order.contract.date);
        contractStr = `№${order.contract.number} от ${cDate.toLocaleDateString('ru-RU')} г.`;
    }

    let currentY = 15;

    // === LENS FLOW BRANDING ===
    doc.setFillColor(79, 70, 229); // Indigo-600
    doc.rect(0, 0, pageWidth, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(16);
    doc.text('LENS FLOW', margin, 10.5);
    doc.setTextColor(0, 0, 0); // reset
    currentY = 25;

    // Внимание
    doc.setFontSize(8);
    doc.setFont('Roboto', 'normal');
    doc.text('Внимание! Оплата данного счета означает согласие с условиями поставки товара. Уведомление об оплате', margin, currentY);
    doc.text('обязательно, в противном случае не гарантируется наличие товара на складе. Товар отпускается по факту', margin, currentY + 4);
    doc.text('прихода денег на р/с Поставщика, самовывозом, при наличии доверенности и документов удостоверяющих личность.', margin, currentY + 8);
    
    currentY += 15;

    // Образец платежного поручения
    doc.setFontSize(10);
    doc.setFont('Roboto', 'bold');
    doc.text('Образец платежного поручения', margin, currentY);
    currentY += 2;

    autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        theme: 'plain',
        styles: {
            font: 'Roboto',
            fontSize: 9,
            lineColor: [0, 0, 0],
            lineWidth: 0.2,
            cellPadding: 2,
        },
        body: [
            [
                { content: `Бенефициар:\n${providerName}`, rowSpan: 2 },
                { content: 'ИИК' },
                { content: 'Кбе' }
            ],
            [
                { content: providerIban },
                { content: '19' } // Кбе 19 по умолчанию
            ],
            [
                { content: `Банк бенефициара:\n${providerBank}`, rowSpan: 2 },
                { content: 'БИК' },
                { content: 'Код назначения платежа' }
            ],
            [
                { content: providerBik },
                { content: '855' } // КНП 855
            ]
        ],
        columnStyles: {
            0: { cellWidth: 100 },
            1: { cellWidth: 50 },
            2: { cellWidth: 'auto' },
        }
    });

    // @ts-ignore
    currentY = doc.lastAutoTable.finalY + 10;

    // Заголовок Счета
    doc.setFontSize(14);
    doc.setFont('Roboto', 'bold');
    doc.text(`Счет на оплату №${order.order_id} от ${dateStr} г.`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 3;
    doc.setLineWidth(0.5);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 8;

    // Поставщик
    doc.setFontSize(10);
    doc.setFont('Roboto', 'normal');
    doc.text('Поставщик:', margin, currentY);
    doc.setFont('Roboto', 'bold');
    
    const providerText = `БИН / ИИН ${providerInn}, ${providerName}, ${providerAddress}`;
    const splitProvider = doc.splitTextToSize(providerText, pageWidth - margin - 35);
    doc.text(splitProvider, margin + 25, currentY);
    currentY += splitProvider.length * 5 + 2;

    // Покупатель
    doc.setFont('Roboto', 'normal');
    doc.text('Покупатель:', margin, currentY);
    doc.setFont('Roboto', 'bold');
    
    const clientText = clientInn ? `БИН / ИИН ${clientInn}, ${clientName}, ${clientAddress}` : `${clientName}, ${clientAddress}`;
    const splitClient = doc.splitTextToSize(clientText, pageWidth - margin - 35);
    doc.text(splitClient, margin + 25, currentY);
    currentY += splitClient.length * 5 + 2;

    // Договор
    doc.setFont('Roboto', 'normal');
    doc.text('Договор:', margin, currentY);
    doc.setFont('Roboto', 'bold');
    doc.text(contractStr, margin + 25, currentY);
    
    currentY += 10;

    // === ТАБЛИЦА ТОВАРОВ ===
    const tableRows: (string | number)[][] = [];
    let rowNum = 1;
    let subtotal = 0;

    if (odQty > 0) {
        const lineTotal = odQty * odUnitPrice;
        subtotal += lineTotal;
        tableRows.push([
            rowNum++,
            order.document_name_od || 'Линзы контактные',
            odQty,
            'шт',
            fmt(odUnitPrice),
            fmt(lineTotal)
        ]);
    }

    if (osQty > 0) {
        const lineTotal = osQty * osUnitPrice;
        subtotal += lineTotal;
        tableRows.push([
            rowNum++,
            order.document_name_os || 'Линзы контактные',
            osQty,
            'шт',
            fmt(osUnitPrice),
            fmt(lineTotal)
        ]);
    }

    for (const prod of additionalProducts) {
        const pPrice = prod.price || 0;
        const pQty = prod.qty || 1;
        const lineTotal = pPrice * pQty;
        subtotal += lineTotal;
        tableRows.push([
            rowNum++,
            prod.name,
            pQty,
            'шт',
            fmt(pPrice),
            fmt(lineTotal)
        ]);
    }

    autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [['№', 'Наименование', 'Кол-во', 'Ед.', 'Цена', 'Сумма']],
        body: tableRows,
        styles: {
            fontSize: 9,
            cellPadding: 3,
            lineColor: [0, 0, 0],
            lineWidth: 0.2,
            font: 'Roboto',
            textColor: [0, 0, 0]
        },
        headStyles: {
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            halign: 'center'
        },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 15, halign: 'center' },
            3: { cellWidth: 15, halign: 'center' },
            4: { cellWidth: 25, halign: 'right' },
            5: { cellWidth: 25, halign: 'right' },
        },
        theme: 'grid',
    });

    const discountAmt = Math.round(subtotal * discountPct / 100);
    const afterDiscount = subtotal - discountAmt;
    const urgentAmt = isUrgent ? Math.round(afterDiscount * URGENT_PCT / 100) : 0;
    const grandTotal = order.total_price || (afterDiscount + urgentAmt);

    // @ts-ignore
    currentY = doc.lastAutoTable.finalY;

    // Итоговые строки
    const finalTableData = [];
    if (discountPct > 0) {
        finalTableData.push(['', '', '', '', 'Итого:', fmt(subtotal)]);
        finalTableData.push(['', '', '', '', `Скидка ${discountPct}%:`, `-${fmt(discountAmt)}`]);
    }
    if (isUrgent) {
        finalTableData.push(['', '', '', '', `Срочность +${URGENT_PCT}%:`, `+${fmt(urgentAmt)}`]);
    }
    finalTableData.push(['', '', '', '', 'Итого к оплате:', fmt(grandTotal)]);

    autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        body: finalTableData,
        theme: 'plain',
        styles: {
            fontSize: 9,
            font: 'Roboto',
            fontStyle: 'bold',
            textColor: [0, 0, 0],
            cellPadding: 2,
        },
        columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 15 },
            3: { cellWidth: 15 },
            4: { cellWidth: 35, halign: 'right' },
            5: { cellWidth: 25, halign: 'right' },
        }
    });

    // @ts-ignore
    currentY = doc.lastAutoTable.finalY + 5;

    // Сумма прописью
    doc.setFont('Roboto', 'normal');
    doc.text(`Всего наименований ${rowNum - 1}, на сумму ${fmt(grandTotal)} KZT`, margin, currentY);
    currentY += 6;
    
    doc.setFont('Roboto', 'bold');
    doc.text(`Всего к оплате: ${numberToWordsRu(grandTotal)} тенге 00 тиын`, margin, currentY);
    currentY += 2;
    doc.setLineWidth(0.5);
    doc.line(margin, currentY, pageWidth - margin, currentY);

    currentY += 15;

    // Подписи
    doc.setFont('Roboto', 'normal');
    doc.text('Руководитель', margin, currentY);
    doc.line(margin + 25, currentY, margin + 65, currentY);
    
    doc.text('Бухгалтер', margin + 80, currentY);
    doc.line(margin + 100, currentY, margin + 140, currentY);

    // Место печати (М.П.)
    doc.setFontSize(10);
    doc.setFont('Roboto', 'bold');
    doc.setTextColor(150, 150, 150);
    doc.text('М.П.', margin + 35, currentY - 5);
    doc.setTextColor(0, 0, 0);

    // Добавляем печать
    try {
        const img = new Image();
        img.src = '/images/stamp.png';
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
        });
        // Располагаем печать поверх М.П., делаем её достаточно крупной (например, 40х40 мм)
        // Координаты смещены, чтобы печать ложилась красиво на подпись и М.П.
        doc.addImage(img, 'PNG', margin + 15, currentY - 25, 40, 40);
    } catch (e) {
        console.warn('Could not load stamp image', e);
    }

    doc.save(`Счет_на_оплату_№${order.order_id}.pdf`);
}
