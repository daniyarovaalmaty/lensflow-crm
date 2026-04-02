'use client';

import ExcelJS from 'exceljs';

interface OrderData {
    order_id: string;
    patient: { name: string; phone?: string; email?: string };
    meta: { doctor?: string; optic_name?: string; created_at: string };
    company?: string;
    inn?: string;
    config: any;
    is_urgent?: boolean;
    document_name_od?: string;
    document_name_os?: string;
    delivery_method?: string;
    delivery_address?: string;
    notes?: string;
}

export async function generateOrderApplicationXlsx(order: OrderData): Promise<void> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Заявка');

    const dateStr = new Date(order.meta.created_at).toLocaleDateString('ru-RU');

    const od = order.config?.eyes?.od || {};
    const os = order.config?.eyes?.os || {};
    const odQty = Number(od.qty) || 0;
    const osQty = Number(os.qty) || 0;

    // Column widths
    ws.columns = [
        { width: 20 }, // A
        { width: 35 }, // B
        { width: 12 }, // C
        { width: 12 }, // D
        { width: 12 }, // E
        { width: 12 }, // F
        { width: 12 }, // G
        { width: 10 }, // H
    ];

    // === HEADER ===
    const headerRow = ws.addRow(['LensFlow — Заявка на изготовление линз']);
    ws.mergeCells('A1:H1');
    headerRow.getCell(1).font = { size: 16, bold: true, color: { argb: '2563EB' } };
    headerRow.getCell(1).alignment = { horizontal: 'center' };
    headerRow.height = 30;

    ws.addRow([]); // spacer

    // === ORDER INFO ===
    const infoTitle = ws.addRow(['Информация о заказе']);
    ws.mergeCells(`A${infoTitle.number}:H${infoTitle.number}`);
    infoTitle.getCell(1).font = { size: 12, bold: true };
    infoTitle.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F3F4F6' } };

    const addInfoRow = (label: string, value: string) => {
        const row = ws.addRow([label, value]);
        row.getCell(1).font = { color: { argb: '6B7280' }, size: 10 };
        row.getCell(2).font = { bold: true, size: 10 };
    };

    addInfoRow('Номер заказа', order.order_id);
    addInfoRow('Дата', dateStr);
    addInfoRow('Пациент', order.patient.name);
    if (order.patient.phone) addInfoRow('Телефон', order.patient.phone);
    if (order.meta.doctor) addInfoRow('Врач', order.meta.doctor);
    if (order.meta.optic_name) addInfoRow('Клиника', order.meta.optic_name);
    if (order.company) addInfoRow('Компания', order.company);
    if (order.inn) addInfoRow('ИИН/БИН', order.inn);
    if (order.delivery_method) {
        addInfoRow('Доставка', order.delivery_method === 'pickup' ? 'Самовывоз' : 'Доставка');
    }
    if (order.delivery_address) addInfoRow('Адрес доставки', order.delivery_address);
    if (order.is_urgent) addInfoRow('Срочность', '⚡ СРОЧНЫЙ ЗАКАЗ');

    ws.addRow([]); // spacer

    // === LENS PARAMETERS ===
    const lensTitle = ws.addRow(['Параметры линз']);
    ws.mergeCells(`A${lensTitle.number}:H${lensTitle.number}`);
    lensTitle.getCell(1).font = { size: 12, bold: true };
    lensTitle.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F3F4F6' } };

    const lensHeader = ws.addRow(['Глаз', 'Наименование (1С)', 'Km', 'Tp', 'DIA', 'e', 'Dk', 'Кол-во']);
    lensHeader.eachCell((cell) => {
        cell.font = { bold: true, size: 9, color: { argb: '374151' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E5E7EB' } };
        cell.border = {
            top: { style: 'thin' }, bottom: { style: 'thin' },
            left: { style: 'thin' }, right: { style: 'thin' },
        };
        cell.alignment = { horizontal: 'center' };
    });

    const addLensRow = (eye: string, data: any, qty: number, docName?: string) => {
        if (qty <= 0) return;
        const row = ws.addRow([
            eye,
            docName || `${data.characteristic || ''} DK ${data.dk || ''}`.trim(),
            data.km ?? '—',
            data.tp ?? '—',
            data.dia ?? '—',
            data.e1 != null ? String(data.e1) : '—',
            data.dk ?? '—',
            qty,
        ]);
        row.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin' }, bottom: { style: 'thin' },
                left: { style: 'thin' }, right: { style: 'thin' },
            };
            cell.alignment = { horizontal: 'center' };
            cell.font = { size: 10 };
        });
        row.getCell(1).font = { bold: true, size: 10 };
        row.getCell(2).alignment = { horizontal: 'left' };
    };

    addLensRow('OD', od, odQty, order.document_name_od);
    addLensRow('OS', os, osQty, order.document_name_os);

    // === TORIC PARAMS ===
    const hasToricOd = od.characteristic === 'toric' && (od.sph != null || od.cyl != null || od.ax != null || od.tor != null);
    const hasToricOs = os.characteristic === 'toric' && (os.sph != null || os.cyl != null || os.ax != null || os.tor != null);

    if (hasToricOd || hasToricOs) {
        ws.addRow([]); // spacer
        const toricTitle = ws.addRow(['Торические параметры']);
        ws.mergeCells(`A${toricTitle.number}:H${toricTitle.number}`);
        toricTitle.getCell(1).font = { size: 11, bold: true };

        const toricHeader = ws.addRow(['Глаз', 'SPH', 'CYL', 'AX', 'TOR', 'Фактор сжатия']);
        toricHeader.eachCell((cell) => {
            cell.font = { bold: true, size: 9, color: { argb: '374151' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E5E7EB' } };
            cell.border = {
                top: { style: 'thin' }, bottom: { style: 'thin' },
                left: { style: 'thin' }, right: { style: 'thin' },
            };
            cell.alignment = { horizontal: 'center' };
        });

        const addToricRow = (eye: string, data: any) => {
            const row = ws.addRow([
                eye,
                data.sph ?? '—',
                data.cyl ?? '—',
                data.ax ?? '—',
                data.tor ?? '—',
                data.compression_factor ?? '—',
            ]);
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin' }, bottom: { style: 'thin' },
                    left: { style: 'thin' }, right: { style: 'thin' },
                };
                cell.alignment = { horizontal: 'center' };
                cell.font = { size: 10 };
            });
        };

        if (hasToricOd) addToricRow('OD', od);
        if (hasToricOs) addToricRow('OS', os);
    }

    // === NOTES ===
    if (order.notes) {
        ws.addRow([]); // spacer
        const notesTitle = ws.addRow(['Примечания']);
        ws.mergeCells(`A${notesTitle.number}:H${notesTitle.number}`);
        notesTitle.getCell(1).font = { size: 11, bold: true };

        const notesRow = ws.addRow([order.notes]);
        ws.mergeCells(`A${notesRow.number}:H${notesRow.number}`);
        notesRow.getCell(1).font = { size: 10, italic: true, color: { argb: '4B5563' } };
        notesRow.getCell(1).alignment = { wrapText: true };
    }

    // === SIGNATURES ===
    ws.addRow([]);
    ws.addRow([]);
    const sigRow = ws.addRow(['Ответственный: ___________________', '', '', '', 'Дата: ___________________']);
    sigRow.getCell(1).font = { size: 9, color: { argb: '6B7280' } };
    sigRow.getCell(5).font = { size: 9, color: { argb: '6B7280' } };

    // === SAVE ===
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Заявка_${order.order_id}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
}
