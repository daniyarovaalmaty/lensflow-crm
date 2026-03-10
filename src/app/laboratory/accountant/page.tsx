'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText, Download, DollarSign, CheckCircle, Clock, XCircle,
    Search, Calendar, TrendingUp, Package, ChevronDown, ChevronUp, User, Building2, MapPin,
    Bell, ArrowRight, AlertCircle, Upload, Trash2, Paperclip
} from 'lucide-react';
import type { Order, PaymentStatus } from '@/types/order';
import { OrderStatusLabels, PaymentStatusLabels, PaymentStatusColors, CharacteristicLabels } from '@/types/order';
import type { Characteristic } from '@/types/order';
import { getPermissions } from '@/types/user';
import type { SubRole } from '@/types/user';
import * as XLSX from 'xlsx';

const FALLBACK_PRICE_PER_LENS = 17_500;
const URGENT_SURCHARGE_PCT = 25;

function calcOrderTotal(order: Order): number {
    if (order.total_price && order.total_price > 0) return order.total_price;
    const od = order.config.eyes.od?.qty ?? 0;
    const os = order.config.eyes.os?.qty ?? 0;
    const base = (Number(od) + Number(os)) * FALLBACK_PRICE_PER_LENS;
    const pct = (order as any).discount_percent ?? 5;
    const disc = Math.round(base * pct / 100);
    const after = base - disc;
    const surcharge = order.is_urgent ? Math.round(after * URGENT_SURCHARGE_PCT / 100) : 0;
    return after + surcharge;
}

function getLensPrice(char: string | undefined): number {
    if (char === 'toric') return 18_500;
    return 17_500;
}

function generateInvoice(order: Order) {
    const wb = XLSX.utils.book_new();
    const od = order.config.eyes.od;
    const os = order.config.eyes.os;
    const odQty = Number(od?.qty) || 0;
    const osQty = Number(os?.qty) || 0;
    const odChar = od?.characteristic as string | undefined;
    const osChar = os?.characteristic as string | undefined;
    const odPrice = getLensPrice(odChar);
    const osPrice = getLensPrice(osChar);
    const additionalProducts = (order as any).products as Array<{ name: string; qty: number; price: number }> || [];
    const discountPct = (order as any).discount_percent ?? 5;
    const date = new Date(order.meta.created_at);
    const dateStr = date.toLocaleDateString('ru-RU');
    const fmt = (n: number) => n.toLocaleString('ru-RU');

    // Calculate totals
    const subtotal = (odQty * odPrice) + (osQty * osPrice) + additionalProducts.reduce((s, p) => s + (p.price || 0) * (p.qty || 1), 0);
    const discountAmt = Math.round(subtotal * discountPct / 100);
    const afterDiscount = subtotal - discountAmt;
    const urgentAmt = order.is_urgent ? Math.round(afterDiscount * URGENT_SURCHARGE_PCT / 100) : 0;
    const total = afterDiscount + urgentAmt;

    // Build rows (7 columns: A-G)
    const rows: any[][] = [];
    const r = (a = '', b = '', c = '', d = '', e = '', f = '', g = '') => rows.push([a, b, c, d, e, f, g]);

    // Header
    r();                                                                          // 1
    r('', '', `СЧЁТ НА ОПЛАТУ № ${order.order_id}`);                             // 2
    r('', '', `от ${dateStr} г.`);                                                // 3
    r();                                                                          // 4

    // Supplier & buyer info
    r('', 'Поставщик:', '', 'ТОО «MedInVision»');                                // 5
    r('', 'БИН:', '', '240640050498');                                            // 6
    r('', 'Адрес:', '', 'г. Алматы, пр. Сейфуллина 510а');                       // 7
    r();                                                                          // 8
    r('', 'Покупатель:', '', order.company || order.patient.name);                // 9
    if (order.inn) r('', 'БИН/ИИН:', '', order.inn);                             // 10
    r('', 'Врач:', '', order.meta.doctor || '—');                                // 11
    if (order.delivery_address) r('', 'Адрес доставки:', '', order.delivery_address);
    r();

    // Table header
    const headerRow = rows.length;
    r('№', 'Наименование товара / услуги', '', 'Ед.', 'Кол-во', 'Цена, ₸', 'Сумма, ₸');

    // Line items
    let lineNo = 1;
    if (odQty > 0) {
        const charLabel = odChar ? (CharacteristicLabels[odChar as Characteristic] || odChar) : 'Стандарт';
        r(String(lineNo++), `Ортокератологическая линза MediLens OD (${charLabel})`, '', 'шт', String(odQty), fmt(odPrice), fmt(odQty * odPrice));
    }
    if (osQty > 0) {
        const charLabel = osChar ? (CharacteristicLabels[osChar as Characteristic] || osChar) : 'Стандарт';
        r(String(lineNo++), `Ортокератологическая линза MediLens OS (${charLabel})`, '', 'шт', String(osQty), fmt(osPrice), fmt(osQty * osPrice));
    }
    additionalProducts.forEach(p => {
        r(String(lineNo++), p.name, '', 'шт', String(p.qty || 1), fmt(p.price || 0), fmt((p.price || 0) * (p.qty || 1)));
    });

    // Totals section
    r();
    r('', '', '', '', '', 'Подитог:', fmt(subtotal));
    if (discountPct > 0) {
        r('', '', '', '', '', `Скидка ${discountPct}%:`, `−${fmt(discountAmt)}`);
    }
    if (order.is_urgent) {
        r('', '', '', '', '', `Наценка за срочность ${URGENT_SURCHARGE_PCT}%:`, `+${fmt(urgentAmt)}`);
    }
    const totalRow = rows.length;
    r('', '', '', '', '', 'ИТОГО к оплате:', `${fmt(total)} ₸`);

    r();
    r();

    // Patient info
    r('', 'Пациент:', '', order.patient.name);
    r('', 'Телефон:', '', order.patient.phone || '—');
    if (order.is_urgent) r('', 'Тип заказа:', '', '⚡ СРОЧНЫЙ');

    r();
    r();

    // Signatures
    r('', 'Руководитель ______________ / __________________ /', '', '', '', 'Бухгалтер ______________ / __________________ /');

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Column widths
    ws['!cols'] = [
        { wch: 5 },   // A: №
        { wch: 18 },  // B: Label
        { wch: 40 },  // C: Наименование (part 2)
        { wch: 28 },  // D: Value / Ед.
        { wch: 10 },  // E: Кол-во
        { wch: 22 },  // F: Цена
        { wch: 18 },  // G: Сумма
    ];

    // Merge cells for title
    ws['!merges'] = [
        { s: { r: 1, c: 2 }, e: { r: 1, c: 6 } },  // Title row
        { s: { r: 2, c: 2 }, e: { r: 2, c: 6 } },  // Date row
    ];

    // Merge B+C for table header "Наименование"
    ws['!merges'].push({ s: { r: headerRow, c: 1 }, e: { r: headerRow, c: 2 } });

    // Merge B+C for each line item description
    for (let i = headerRow + 1; i < rows.length; i++) {
        const row = rows[i];
        // Only merge if it's a line item row (starts with a number in column A)
        if (row[0] && !isNaN(Number(row[0]))) {
            ws['!merges'].push({ s: { r: i, c: 1 }, e: { r: i, c: 2 } });
        }
    }

    // Merge D onwards for info rows (Поставщик, Покупатель, etc.)
    [4, 5, 6, 8].forEach(rowIdx => {
        if (rows[rowIdx]) ws['!merges']!.push({ s: { r: rowIdx, c: 3 }, e: { r: rowIdx, c: 6 } });
    });

    XLSX.utils.book_append_sheet(wb, ws, 'Счёт на оплату');
    XLSX.writeFile(wb, `Счет_${order.order_id}_${dateStr.replace(/\./g, '-')}.xlsx`);
}

const PAYMENT_OPTIONS: { value: PaymentStatus; label: string; icon: any; color: string }[] = [
    { value: 'unpaid', label: 'Не оплачен', icon: XCircle, color: 'text-red-600 bg-red-50 border-red-200' },
    { value: 'partial', label: 'Частично', icon: Clock, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { value: 'paid', label: 'Оплачен', icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
];

export default function AccountantPage() {
    const { data: session } = useSession();
    const subRole = (session?.user?.subRole || 'lab_accountant') as SubRole;
    const perms = getPermissions(subRole);
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [payFilter, setPayFilter] = useState<'all' | PaymentStatus>('all');
    const [updating, setUpdating] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [docFilter, setDocFilter] = useState<'all' | 'accountant_review' | 'docs_ready'>('all');
    const [orderDocs, setOrderDocs] = useState<Record<string, Array<{ index: number; name: string; mimeType: string; size: number; uploadedAt: string; uploadedBy: string }>>>({});
    const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

    useEffect(() => { loadOrders(); }, []);

    const loadOrders = async () => {
        try {
            const res = await fetch('/api/orders');
            if (res.ok) setOrders(await res.json());
        } finally {
            setIsLoading(false);
        }
    };

    const updatePayment = async (orderId: string, status: PaymentStatus) => {
        setUpdating(orderId);
        try {
            const res = await fetch(`/api/orders/${orderId}/payment`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ payment_status: status }),
            });
            if (res.ok) await loadOrders();
        } finally {
            setUpdating(null);
        }
    };

    const updateOrderStatus = async (orderId: string, newStatus: string) => {
        setUpdating(orderId);
        try {
            const res = await fetch(`/api/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            if (res.ok) await loadOrders();
        } finally {
            setUpdating(null);
        }
    };

    const loadDocs = async (orderId: string) => {
        try {
            const res = await fetch(`/api/orders/${orderId}/documents`);
            if (res.ok) {
                const docs = await res.json();
                setOrderDocs(prev => ({ ...prev, [orderId]: docs }));
            }
        } catch (e) {
            console.error('Load docs error:', e);
        }
    };

    const handleFileUpload = async (orderId: string, files: FileList | null) => {
        if (!files || files.length === 0) return;
        setUploadingDoc(orderId);
        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const base64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve((reader.result as string).split(',')[1]);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
                await fetch(`/api/orders/${orderId}/documents`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: file.name,
                        data: base64,
                        mimeType: file.type,
                        size: file.size,
                    }),
                });
            }
            await loadDocs(orderId);
        } finally {
            setUploadingDoc(null);
        }
    };

    const deleteDoc = async (orderId: string, index: number) => {
        await fetch(`/api/orders/${orderId}/documents`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ index }),
        });
        await loadDocs(orderId);
    };

    const downloadDoc = async (orderId: string, index: number, fileName: string) => {
        try {
            const res = await fetch(`/api/orders/${orderId}/documents?download=${index}`);
            if (!res.ok) return;
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Download error:', e);
        }
    };

    const pendingDocs = useMemo(() => orders.filter(o => o.status === 'accountant_review'), [orders]);
    const completedDocs = useMemo(() => orders.filter(o => o.status === 'docs_ready'), [orders]);

    const filtered = useMemo(() => {
        let r = [...orders];
        if (docFilter === 'accountant_review') r = r.filter(o => o.status === 'accountant_review');
        else if (docFilter === 'docs_ready') r = r.filter(o => o.status === 'docs_ready');
        if (payFilter !== 'all') r = r.filter(o => (o.payment_status ?? 'unpaid') === payFilter);
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            r = r.filter(o =>
                o.order_id.toLowerCase().includes(q) ||
                o.patient.name.toLowerCase().includes(q) ||
                (o.meta.doctor || '').toLowerCase().includes(q)
            );
        }
        if (dateFrom) r = r.filter(o => new Date(o.meta.created_at) >= new Date(dateFrom));
        if (dateTo) {
            const dt = new Date(dateTo); dt.setHours(23, 59, 59, 999);
            r = r.filter(o => new Date(o.meta.created_at) <= dt);
        }
        return r.sort((a, b) => new Date(b.meta.created_at).getTime() - new Date(a.meta.created_at).getTime());
    }, [orders, payFilter, docFilter, searchQuery, dateFrom, dateTo]);

    const stats = useMemo(() => {
        const all = orders;
        const paid = all.filter(o => o.payment_status === 'paid');
        const unpaid = all.filter(o => !o.payment_status || o.payment_status === 'unpaid');
        const partial = all.filter(o => o.payment_status === 'partial');
        return {
            total: all.reduce((s, o) => s + calcOrderTotal(o), 0),
            collected: paid.reduce((s, o) => s + calcOrderTotal(o), 0),
            paidCount: paid.length,
            unpaidCount: unpaid.length,
            partialCount: partial.length,
        };
    }, [orders]);

    const exportExcel = () => {
        try {
            const rows = filtered.map(o => ({
                '№': o.order_id,
                'Пациент': o.patient.name,
                'Компания': o.company || '',
                'Телефон': o.patient.phone,
                'Статус заказа': OrderStatusLabels[o.status],
                'Статус оплаты': PaymentStatusLabels[o.payment_status ?? 'unpaid'],
                'Срочный': o.is_urgent ? 'Да' : 'Нет',
                'Сумма (₸)': calcOrderTotal(o),
                'Дата': new Date(o.meta.created_at).toLocaleDateString('ru-RU'),
            }));
            const ws = XLSX.utils.json_to_sheet(rows);
            const colWidths = Object.keys(rows[0] || {}).map(key => ({
                wch: Math.max(key.length, ...rows.map(r => String((r as any)[key] || '').length)) + 2,
            }));
            ws['!cols'] = colWidths;
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Платежи');
            XLSX.writeFile(wb, `LensFlow_Payments_${new Date().toISOString().slice(0, 10)}.xlsx`);
        } catch (err: any) {
            console.error('Export error:', err);
            alert('Ошибка экспорта: ' + (err.message || err));
        }
    };

    return (
        <div className="min-h-screen bg-surface">
            {/* Header */}
            <div className="bg-surface-elevated border-b border-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Бухгалтерия</h1>
                            <p className="text-gray-500 text-sm mt-0.5">Статусы оплат и финансовые документы</p>
                        </div>
                        <button onClick={exportExcel} className="btn btn-primary gap-2 self-start sm:self-auto">
                            <Download className="w-4 h-4" />
                            Экспорт XLS
                        </button>
                    </div>

                    {/* Incoming documents alert */}
                    {pendingDocs.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-xl p-4 flex items-center gap-4"
                        >
                            <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center shrink-0">
                                <Bell className="w-5 h-5 text-cyan-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-cyan-900">Новые документы для обработки</h3>
                                <p className="text-sm text-cyan-700">
                                    {pendingDocs.length} {pendingDocs.length === 1 ? 'заказ ожидает' : pendingDocs.length < 5 ? 'заказа ожидают' : 'заказов ожидают'} выпуска закрывающих документов
                                </p>
                            </div>
                            <button
                                onClick={() => setDocFilter('accountant_review')}
                                className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
                            >
                                Показать
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </motion.div>
                    )}

                    {/* Document workflow tabs */}
                    <div className="flex gap-2 mb-4">
                        {[
                            { value: 'all' as const, label: 'Все заказы', count: orders.length },
                            { value: 'accountant_review' as const, label: 'Ожидают обработки', count: pendingDocs.length, color: 'text-cyan-700 bg-cyan-50 border-cyan-200' },
                            { value: 'docs_ready' as const, label: 'Обработанные', count: completedDocs.length, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
                        ].map(tab => (
                            <button
                                key={tab.value}
                                onClick={() => setDocFilter(tab.value)}
                                className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${docFilter === tab.value
                                    ? tab.color || 'bg-primary-600 text-white border-primary-600'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
                                    }`}
                            >
                                {tab.label}
                                {tab.count > 0 && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${docFilter === tab.value ? 'bg-white/20' : 'bg-gray-100'
                                        }`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Stats cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <TrendingUp className="w-4 h-4 text-primary-500" />
                                <span className="text-xs text-gray-500 font-medium">Всего</span>
                            </div>
                            <p className="text-lg font-bold text-gray-900">{stats.total.toLocaleString('ru-RU')} ₸</p>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                                <span className="text-xs text-gray-500 font-medium">Собрано</span>
                            </div>
                            <p className="text-lg font-bold text-emerald-700">{stats.collected.toLocaleString('ru-RU')} ₸</p>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <Package className="w-4 h-4 text-blue-500" />
                                <span className="text-xs text-gray-500 font-medium">Оплачено заказов</span>
                            </div>
                            <p className="text-lg font-bold text-gray-900">{stats.paidCount}</p>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <XCircle className="w-4 h-4 text-red-500" />
                                <span className="text-xs text-gray-500 font-medium">Не оплачено</span>
                            </div>
                            <p className="text-lg font-bold text-red-700">{stats.unpaidCount}</p>
                        </motion.div>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap gap-3 items-center">
                        <div className="relative flex-1 min-w-[200px] max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Поиск..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="input pl-10 w-full"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input text-sm" />
                            <span className="text-gray-400">—</span>
                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input text-sm" />
                        </div>
                        <div className="flex gap-2">
                            {(['all', 'unpaid', 'partial', 'paid'] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setPayFilter(f)}
                                    className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${payFilter === f ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'}`}
                                >
                                    {f === 'all' ? 'Все' : f === 'unpaid' ? 'Не оплачен' : f === 'partial' ? 'Частично' : 'Оплачен'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                {isLoading ? (
                    <div className="text-center py-16 text-gray-400">Загрузка...</div>
                ) : (
                    <div className="card overflow-hidden p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm min-w-[800px]">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="w-8 px-2"></th>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-600">№ заказа</th>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Пациент</th>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Компания</th>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Статус</th>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Срочный</th>
                                        <th className="text-right px-4 py-3 font-semibold text-gray-600">Сумма</th>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Дата</th>
                                        <th className="text-center px-4 py-3 font-semibold text-gray-600">Документы</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filtered.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="text-center py-12 text-gray-400">
                                                Нет заказов
                                            </td>
                                        </tr>
                                    ) : filtered.map(order => {
                                        const total = calcOrderTotal(order);
                                        const payStatus = (order.payment_status ?? 'unpaid') as PaymentStatus;
                                        const isExpanded = expandedId === order.order_id;
                                        const od = order.config.eyes.od;
                                        const os = order.config.eyes.os;
                                        const odQty = Number(od?.qty) || 0;
                                        const osQty = Number(os?.qty) || 0;
                                        const odChar = od?.characteristic as Characteristic | undefined;
                                        const osChar = os?.characteristic as Characteristic | undefined;
                                        const odUnitPrice = getLensPrice(odChar);
                                        const osUnitPrice = getLensPrice(osChar);
                                        const odSubtotal = odQty * odUnitPrice;
                                        const osSubtotal = osQty * osUnitPrice;
                                        const additionalProducts = (order as any).products as Array<{ name: string; qty: number; price: number; category?: string }> || [];
                                        const additionalTotal = additionalProducts.reduce((sum, p) => sum + (p.price || 0) * (p.qty || 1), 0);
                                        const lensTotal = odSubtotal + osSubtotal + additionalTotal;
                                        const orderDiscountPct = (order as any).discount_percent ?? 5;
                                        const discountAmt = Math.round(lensTotal * orderDiscountPct / 100);
                                        const afterDiscount = lensTotal - discountAmt;
                                        const urgentAmt = order.is_urgent ? Math.round(afterDiscount * URGENT_SURCHARGE_PCT / 100) : 0;

                                        const isAccountantReview = order.status === 'accountant_review';
                                        return (
                                            <React.Fragment key={order.order_id}>
                                                <tr
                                                    onClick={() => setExpandedId(isExpanded ? null : order.order_id)}
                                                    className={`hover:bg-gray-50/60 transition-colors cursor-pointer ${isAccountantReview ? 'bg-cyan-50/40 border-l-4 border-l-cyan-400' : ''}`}
                                                >
                                                    <td className="px-2 py-3 text-gray-400">
                                                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                    </td>
                                                    <td className="px-4 py-3 font-mono font-medium text-gray-800">{order.order_id}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="font-medium text-gray-900">{order.patient.name}</div>
                                                        <div className="text-xs text-gray-400">{order.patient.phone}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">
                                                        {order.company || '—'}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="text-xs text-gray-600">{OrderStatusLabels[order.status]}</span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {order.is_urgent
                                                            ? <span className="text-xs font-semibold text-amber-600 bg-amber-50 rounded-full px-2 py-0.5">Срочный</span>
                                                            : <span className="text-xs text-gray-400">—</span>
                                                        }
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{total.toLocaleString('ru-RU')} ₸</td>
                                                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                                                        {new Date(order.meta.created_at).toLocaleDateString('ru-RU')}
                                                    </td>
                                                    <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                                                        {order.status === 'accountant_review' ? (
                                                            <button
                                                                onClick={() => updateOrderStatus(order.order_id, 'docs_ready')}
                                                                disabled={updating === order.order_id}
                                                                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg font-medium transition-colors mx-auto"
                                                            >
                                                                <CheckCircle className="w-3.5 h-3.5" />
                                                                Док. готовы
                                                            </button>
                                                        ) : order.status === 'docs_ready' ? (
                                                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
                                                                <CheckCircle className="w-3 h-3" />
                                                                Обработано
                                                            </span>
                                                        ) : order.status === 'shipped' ? (
                                                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-gray-50 text-gray-500 rounded-lg border border-gray-200">
                                                                Ожидает
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-gray-300">—</span>
                                                        )}
                                                    </td>

                                                </tr>
                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <tr>
                                                            <td colSpan={9} className="p-0">
                                                                <motion.div
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: 'auto', opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    transition={{ duration: 0.2 }}
                                                                    className="overflow-hidden"
                                                                >
                                                                    <div className="bg-gray-50/70 border-t border-b border-gray-100 px-6 py-5">
                                                                        {/* Order meta info */}
                                                                        <div className="flex flex-wrap gap-6 mb-4 text-sm text-gray-600">
                                                                            <div className="flex items-center gap-1.5">
                                                                                <User className="w-3.5 h-3.5 text-gray-400" />
                                                                                <span className="font-medium">Врач:</span> {order.meta.doctor || '—'}
                                                                            </div>
                                                                            {order.company && (
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <Building2 className="w-3.5 h-3.5 text-gray-400" />
                                                                                    <span className="font-medium">Компания:</span> {order.company}
                                                                                    {order.inn && <span className="text-gray-400 ml-1">(ИНН: {order.inn})</span>}
                                                                                </div>
                                                                            )}
                                                                            {order.delivery_address && (
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                                                                    <span className="font-medium">Доставка:</span> {order.delivery_address}
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {/* Line items table */}
                                                                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                                                            <table className="w-full text-sm">
                                                                                <thead className="bg-gray-50">
                                                                                    <tr>
                                                                                        <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs">Позиция</th>
                                                                                        <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs">Характеристика</th>
                                                                                        <th className="text-center px-4 py-2.5 font-semibold text-gray-600 text-xs">Кол-во</th>
                                                                                        <th className="text-right px-4 py-2.5 font-semibold text-gray-600 text-xs">Цена за шт</th>
                                                                                        <th className="text-right px-4 py-2.5 font-semibold text-gray-600 text-xs">Сумма</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody className="divide-y divide-gray-100">
                                                                                    {odQty > 0 && (
                                                                                        <tr>
                                                                                            <td className="px-4 py-2.5 text-gray-800">OD — Ортокератологическая линза MediLens</td>
                                                                                            <td className="px-4 py-2.5 text-gray-600">{odChar ? (CharacteristicLabels[odChar] || odChar) : '—'}</td>
                                                                                            <td className="px-4 py-2.5 text-center text-gray-800">{odQty}</td>
                                                                                            <td className="px-4 py-2.5 text-right text-gray-600">{odUnitPrice.toLocaleString('ru-RU')} ₸</td>
                                                                                            <td className="px-4 py-2.5 text-right font-medium text-gray-900">{odSubtotal.toLocaleString('ru-RU')} ₸</td>
                                                                                        </tr>
                                                                                    )}
                                                                                    {osQty > 0 && (
                                                                                        <tr>
                                                                                            <td className="px-4 py-2.5 text-gray-800">OS — Ортокератологическая линза MediLens</td>
                                                                                            <td className="px-4 py-2.5 text-gray-600">{osChar ? (CharacteristicLabels[osChar] || osChar) : '—'}</td>
                                                                                            <td className="px-4 py-2.5 text-center text-gray-800">{osQty}</td>
                                                                                            <td className="px-4 py-2.5 text-right text-gray-600">{osUnitPrice.toLocaleString('ru-RU')} ₸</td>
                                                                                            <td className="px-4 py-2.5 text-right font-medium text-gray-900">{osSubtotal.toLocaleString('ru-RU')} ₸</td>
                                                                                        </tr>
                                                                                    )}
                                                                                    {/* Additional products */}
                                                                                    {additionalProducts.map((prod, idx) => (
                                                                                        <tr key={`prod-${idx}`}>
                                                                                            <td className="px-4 py-2.5 text-gray-800">{prod.name}</td>
                                                                                            <td className="px-4 py-2.5 text-gray-600">{prod.category === 'solution' ? 'Раствор' : prod.category === 'accessory' ? 'Аксессуар' : prod.category || '—'}</td>
                                                                                            <td className="px-4 py-2.5 text-center text-gray-800">{prod.qty}</td>
                                                                                            <td className="px-4 py-2.5 text-right text-gray-600">{(prod.price || 0).toLocaleString('ru-RU')} ₸</td>
                                                                                            <td className="px-4 py-2.5 text-right font-medium text-gray-900">{((prod.price || 0) * (prod.qty || 1)).toLocaleString('ru-RU')} ₸</td>
                                                                                        </tr>
                                                                                    ))}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>

                                                                        {/* Totals */}
                                                                        <div className="mt-3 flex justify-end">
                                                                            <div className="w-72 space-y-1 text-sm">
                                                                                <div className="flex justify-between text-gray-600">
                                                                                    <span>Подитог</span>
                                                                                    <span>{lensTotal.toLocaleString('ru-RU')} ₸</span>
                                                                                </div>
                                                                                <div className="flex justify-between text-emerald-600">
                                                                                    <span>Скидка {orderDiscountPct}%</span>
                                                                                    <span>−{discountAmt.toLocaleString('ru-RU')} ₸</span>
                                                                                </div>
                                                                                {order.is_urgent && (
                                                                                    <div className="flex justify-between text-amber-600">
                                                                                        <span>Наценка срочный {URGENT_SURCHARGE_PCT}%</span>
                                                                                        <span>+{urgentAmt.toLocaleString('ru-RU')} ₸</span>
                                                                                    </div>
                                                                                )}
                                                                                <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-200">
                                                                                    <span>Итого</span>
                                                                                    <span>{total.toLocaleString('ru-RU')} ₸</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        {/* Payment status controls */}
                                                                        <div className="mt-4 pt-4 border-t border-gray-200">
                                                                            <div className="flex items-center justify-between">
                                                                                <span className="text-sm font-semibold text-gray-700">Статус оплаты</span>
                                                                                <div className="flex gap-2">
                                                                                    {perms.canChangePayments ? PAYMENT_OPTIONS.map(opt => (
                                                                                        <button
                                                                                            key={opt.value}
                                                                                            onClick={() => updatePayment(order.order_id, opt.value)}
                                                                                            disabled={updating === order.order_id}
                                                                                            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${payStatus === opt.value ? opt.color : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'}`}
                                                                                        >
                                                                                            <opt.icon className="w-3.5 h-3.5" />
                                                                                            {opt.label}
                                                                                        </button>
                                                                                    )) : (
                                                                                        <span className={`text-xs px-3 py-1.5 rounded-lg border font-medium ${PaymentStatusColors[payStatus]}`}>
                                                                                            {PaymentStatusLabels[payStatus]}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        {/* Download invoice button */}
                                                                        <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                                                                            <span className="text-sm font-semibold text-gray-700">Счёт на оплату</span>
                                                                            <button
                                                                                onClick={() => generateInvoice(order)}
                                                                                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium rounded-lg transition-colors"
                                                                            >
                                                                                <Download className="w-3.5 h-3.5" />
                                                                                Скачать счёт (Excel)
                                                                            </button>
                                                                        </div>

                                                                        {/* Closing documents upload */}
                                                                        <div className="mt-4 pt-4 border-t border-gray-200">
                                                                            <div className="flex items-center justify-between mb-3">
                                                                                <span className="text-sm font-semibold text-gray-700">Закрывающие документы</span>
                                                                                <label className="flex items-center gap-2 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer">
                                                                                    <Upload className="w-3.5 h-3.5" />
                                                                                    {uploadingDoc === order.order_id ? 'Загрузка...' : 'Загрузить файл'}
                                                                                    <input
                                                                                        type="file"
                                                                                        multiple
                                                                                        className="hidden"
                                                                                        disabled={uploadingDoc === order.order_id}
                                                                                        onChange={e => handleFileUpload(order.order_id, e.target.files)}
                                                                                    />
                                                                                </label>
                                                                            </div>
                                                                            {/* Document list */}
                                                                            {(() => {
                                                                                const docs = orderDocs[order.order_id];
                                                                                if (docs === undefined) {
                                                                                    loadDocs(order.order_id);
                                                                                    return <p className="text-xs text-gray-400">Загрузка...</p>;
                                                                                }
                                                                                if (docs.length === 0) {
                                                                                    return <p className="text-xs text-gray-400">Нет загруженных документов</p>;
                                                                                }
                                                                                return (
                                                                                    <div className="space-y-2">
                                                                                        {docs.map((doc, i) => (
                                                                                            <div key={i} className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 px-3 py-2">
                                                                                                <Paperclip className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                                                                <div className="flex-1 min-w-0">
                                                                                                    <p className="text-xs font-medium text-gray-800 truncate">{doc.name}</p>
                                                                                                    <p className="text-[10px] text-gray-400">
                                                                                                        {(doc.size / 1024).toFixed(1)} KB · {new Date(doc.uploadedAt).toLocaleString('ru-RU')}
                                                                                                    </p>
                                                                                                </div>
                                                                                                <button
                                                                                                    onClick={() => downloadDoc(order.order_id, doc.index, doc.name)}
                                                                                                    className="text-primary-600 hover:text-primary-700 p-1"
                                                                                                    title="Скачать"
                                                                                                >
                                                                                                    <Download className="w-3.5 h-3.5" />
                                                                                                </button>
                                                                                                <button
                                                                                                    onClick={() => deleteDoc(order.order_id, doc.index)}
                                                                                                    className="text-red-400 hover:text-red-600 p-1"
                                                                                                    title="Удалить"
                                                                                                >
                                                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                                                </button>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                    </div>
                                                                </motion.div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </AnimatePresence>
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
