'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    Search, Filter, Download, ArrowLeft, TrendingUp,
    CreditCard, Banknote, Building2, LayoutGrid, Phone,
    User, Calendar, Receipt, ChevronDown, ChevronUp,
    CheckCircle2, Clock, Layers, X, ShoppingBag
} from 'lucide-react';

interface SaleItem {
    id: string;
    name: string;
    category: string | null;
    quantity: number;
    unitPrice: number;
    total: number;
    serialNumbers?: string[];
}

interface Sale {
    id: string;
    saleNumber: string;
    customerName: string | null;
    customerPhone: string | null;
    subtotal: number;
    discountPercent: number;
    discountAmount: number;
    total: number;
    paymentMethod: string;
    paymentStatus: string;
    paidAmount: number;
    performedByName: string | null;
    notes: string | null;
    createdAt: string;
    items: SaleItem[];
    invoiceData?: {
        splitPayment?: boolean;
        cashAmount?: number;
        cardAmount?: number;
        transferAmount?: number;
        trafficSource?: string;
    } | null;
}

const PAY_LABELS: Record<string, { label: string; color: string; icon: any }> = {
    cash:           { label: 'Наличными',       color: 'bg-green-100 text-green-700',  icon: Banknote },
    card:           { label: 'Картой',          color: 'bg-blue-100 text-blue-700',    icon: CreditCard },
    kaspi:          { label: 'Картой',          color: 'bg-blue-100 text-blue-700',    icon: CreditCard },
    installment12:  { label: 'Рассрочка 12 мес',color: 'bg-indigo-100 text-indigo-700', icon: CreditCard },
    installment_12: { label: 'Рассрочка 12 мес',color: 'bg-indigo-100 text-indigo-700', icon: CreditCard },
    transfer:       { label: 'Перевод',         color: 'bg-violet-100 text-violet-700', icon: Building2 },
    mixed:          { label: 'Смешанно',        color: 'bg-orange-100 text-orange-700', icon: Layers },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    paid:     { label: 'Оплачено',       color: 'bg-emerald-100 text-emerald-700' },
    unpaid:   { label: 'Не оплачено',    color: 'bg-red-100 text-red-700' },
    partial:  { label: 'Частично',       color: 'bg-yellow-100 text-yellow-700' },
    refunded: { label: 'Возврат',        color: 'bg-gray-100 text-gray-700' },
};

function fmt(n: number) {
    return n.toLocaleString('ru-KZ') + ' ₸';
}

function fmtDate(iso: string) {
    return new Date(iso).toLocaleString('ru-KZ', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function fmtDateShort(iso: string) {
    return new Date(iso).toLocaleDateString('ru-KZ', {
        day: '2-digit', month: '2-digit', year: 'numeric',
    });
}

export default function SalesHistoryPage() {
    const router = useRouter();
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [payFilter, setPayFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [showFilters, setShowFilters] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/optic/sales');
            if (res.ok) setSales(await res.json());
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const filtered = useMemo(() => {
        return sales.filter(s => {
            const q = search.toLowerCase();
            const matchSearch = !q
                || s.saleNumber.toLowerCase().includes(q)
                || (s.customerName?.toLowerCase().includes(q) ?? false)
                || (s.customerPhone?.toLowerCase().includes(q) ?? false)
                || (s.performedByName?.toLowerCase().includes(q) ?? false)
                || s.items.some(i => i.name.toLowerCase().includes(q));

            const matchPay = payFilter === 'all' 
                || s.paymentMethod === payFilter 
                || (payFilter === 'card' && s.paymentMethod === 'kaspi')
                || (payFilter === 'installment12' && s.paymentMethod === 'installment_12');

            const saleDate = new Date(s.createdAt);
            const matchFrom = !dateFrom || saleDate >= new Date(dateFrom);
            const matchTo = !dateTo || saleDate <= new Date(dateTo + 'T23:59:59');

            return matchSearch && matchPay && matchFrom && matchTo;
        });
    }, [sales, search, payFilter, dateFrom, dateTo]);

    // Summary stats — correctly splits mixed payments via invoiceData
    const stats = useMemo(() => {
        let cashTotal = 0;
        let cardTotal = 0;
        let total = 0;
        let validCount = 0;
        for (const s of filtered) {
            if (s.paymentStatus === 'refunded') continue;
            validCount++;
            total += s.total;
            if (s.paymentMethod === 'mixed' && s.invoiceData) {
                const invData = s.invoiceData as any;
                if (invData.split && Array.isArray(invData.split)) {
                    for (const sp of invData.split) {
                        if (sp.method === 'cash') cashTotal += sp.amount;
                        else cardTotal += sp.amount; // card, transfer, kaspi
                    }
                } else if (s.invoiceData.splitPayment) {
                    cashTotal += s.invoiceData.cashAmount ?? 0;
                    cardTotal += (s.invoiceData.cardAmount ?? 0) + (s.invoiceData.transferAmount ?? 0);
                }
            } else if (s.paymentMethod === 'cash') {
                cashTotal += s.total;
            } else if (s.paymentMethod === 'card' || s.paymentMethod === 'transfer' || s.paymentMethod === 'kaspi' || s.paymentMethod === 'installment12' || s.paymentMethod === 'installment_12') {
                cardTotal += s.total;
            }
        }
        return {
            total,
            cashTotal,
            cardTotal,
            count: filtered.length,
            validCount,
            avgCheck: validCount ? Math.round(total / validCount) : 0,
        };
    }, [filtered]);


    const exportCSV = () => {
        const rows = [
            ['№ чека', 'Дата', 'Покупатель', 'Телефон', 'Товары', 'Сумма', 'Скидка', 'Итого', 'Оплата', 'Статус', 'Кассир', 'Примечание'],
            ...filtered.map(s => [
                s.saleNumber,
                fmtDate(s.createdAt),
                s.customerName || '—',
                s.customerPhone || '—',
                s.items.map(i => `${i.name} x${i.quantity}`).join('; '),
                s.subtotal,
                s.discountAmount,
                s.total,
                PAY_LABELS[s.paymentMethod]?.label || s.paymentMethod,
                STATUS_LABELS[s.paymentStatus]?.label || s.paymentStatus,
                s.performedByName || '—',
                s.notes || '—',
            ]),
        ];
        const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sales_${fmtDateShort(new Date().toISOString())}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleRefund = async (saleId: string) => {
        if (!window.confirm('Вы уверены, что хотите сделать возврат по этому чеку? Товары вернутся на склад, а выручка будет пересчитана.')) {
            return;
        }
        try {
            const res = await fetch(`/api/optic/sales/${saleId}/refund`, { method: 'POST' });
            if (res.ok) {
                alert('Возврат успешно оформлен');
                load();
            } else {
                const data = await res.json();
                alert(data.error || 'Ошибка при оформлении возврата');
            }
        } catch (e) {
            console.error(e);
            alert('Ошибка сети при оформлении возврата');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/optic/pos')}
                            className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
                                <Receipt className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">История продаж</h1>
                                <p className="text-xs text-gray-500">Полный отчёт по всем транзакциям</p>
                            </div>
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                            <button
                                onClick={() => setShowFilters(p => !p)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
                                    showFilters ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                <Filter className="w-4 h-4" />
                                Фильтры
                            </button>
                            <button
                                onClick={exportCSV}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
                            >
                                <Download className="w-4 h-4" />
                                CSV
                            </button>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="mt-3 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Поиск по имени, телефону, номеру чека, товару..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:bg-white"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Filters panel */}
                    {showFilters && (
                        <div className="mt-3 flex flex-wrap gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Способ оплаты</label>
                                <select
                                    value={payFilter}
                                    onChange={e => setPayFilter(e.target.value)}
                                    className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                >
                                    <option value="all">Все способы</option>
                                    <option value="cash">Наличными</option>
                                    <option value="card">Картой</option>
                                    <option value="installment12">Рассрочка 12 мес</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Дата с</label>
                                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                                    className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Дата по</label>
                                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                                    className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                            </div>
                            {(payFilter !== 'all' || dateFrom || dateTo) && (
                                <button
                                    onClick={() => { setPayFilter('all'); setDateFrom(''); setDateTo(''); }}
                                    className="self-end text-sm text-red-500 hover:text-red-700 flex items-center gap-1"
                                >
                                    <X className="w-3.5 h-3.5" /> Сбросить
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                                <TrendingUp className="w-4 h-4 text-indigo-600" />
                            </div>
                            <span className="text-xs font-medium text-gray-500">Выручка</span>
                        </div>
                        <div className="text-xl font-bold text-gray-900">{fmt(stats.total)}</div>
                        <div className="text-xs text-gray-400 mt-0.5">за выбранный период</div>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                            </div>
                            <span className="text-xs font-medium text-gray-500">Продаж</span>
                        </div>
                        <div className="text-xl font-bold text-gray-900">{stats.count}</div>
                        <div className="text-xs text-gray-400 mt-0.5">транзакций</div>
                    </div>
                    {/* Наличные в кассе */}
                    <div className="bg-white rounded-2xl border border-green-100 p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                                <Banknote className="w-4 h-4 text-green-600" />
                            </div>
                            <span className="text-xs font-medium text-gray-500">В кассе</span>
                        </div>
                        <div className="text-xl font-bold text-green-700">{fmt(stats.cashTotal)}</div>
                        <div className="text-xs text-gray-400 mt-0.5">наличными</div>
                    </div>
                    {/* Безнал / банк */}
                    <div className="bg-white rounded-2xl border border-blue-100 p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                <CreditCard className="w-4 h-4 text-blue-600" />
                            </div>
                            <span className="text-xs font-medium text-gray-500">Через банк</span>
                        </div>
                        <div className="text-xl font-bold text-blue-700">{fmt(stats.cardTotal)}</div>
                        <div className="text-xs text-gray-400 mt-0.5">карта / перевод</div>
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Receipt className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="text-gray-500 font-medium">Продажи не найдены</p>
                        <p className="text-gray-400 text-sm mt-1">Попробуйте изменить фильтры</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        {/* Table Header */}
                        <div className="hidden md:grid grid-cols-[1fr_2fr_1.5fr_1fr_1fr_1fr_40px] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <div>Чек / Дата</div>
                            <div>Покупатель</div>
                            <div>Товары</div>
                            <div>Сумма</div>
                            <div>Оплата</div>
                            <div>Кассир</div>
                            <div />
                        </div>

                        {/* Rows */}
                        <div className="divide-y divide-gray-50">
                            {filtered.map(sale => {
                                const pay = PAY_LABELS[sale.paymentMethod] || { label: sale.paymentMethod, color: 'bg-gray-100 text-gray-600', icon: CreditCard };
                                const PayIcon = pay.icon;
                                const status = STATUS_LABELS[sale.paymentStatus] || { label: sale.paymentStatus, color: 'bg-gray-100 text-gray-600' };
                                const isExpanded = expandedId === sale.id;

                                return (
                                    <div key={sale.id} className="hover:bg-gray-50/50 transition-colors">
                                        {/* Main row */}
                                        <div
                                            className="grid grid-cols-1 md:grid-cols-[1fr_2fr_1.5fr_1fr_1fr_1fr_40px] gap-4 px-5 py-4 cursor-pointer"
                                            onClick={() => setExpandedId(isExpanded ? null : sale.id)}
                                        >
                                            {/* Check # and date */}
                                            <div>
                                                <div className="font-bold text-gray-900 text-sm">{sale.saleNumber}</div>
                                                <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                                    <Calendar className="w-3 h-3" />
                                                    {fmtDate(sale.createdAt)}
                                                </div>
                                            </div>

                                            {/* Customer */}
                                            <div className="flex items-start gap-2.5">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0 text-sm font-bold mt-0.5">
                                                    {sale.customerName ? sale.customerName[0].toUpperCase() : '?'}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-gray-900 text-sm">
                                                        {sale.customerName || <span className="text-gray-400 font-normal">Без имени</span>}
                                                    </div>
                                                    {sale.customerPhone ? (
                                                        <a
                                                            href={`tel:${sale.customerPhone}`}
                                                            onClick={e => e.stopPropagation()}
                                                            className="text-xs text-indigo-600 hover:underline flex items-center gap-1 mt-0.5"
                                                        >
                                                            <Phone className="w-3 h-3" />
                                                            {sale.customerPhone}
                                                        </a>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">Нет телефона</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Items preview */}
                                            <div className="text-sm">
                                                {sale.items.slice(0, 2).map((item, i) => (
                                                    <div key={i} className="text-gray-700 truncate max-w-[200px]">
                                                        {item.name}
                                                        <span className="text-gray-400 ml-1">×{item.quantity}</span>
                                                    </div>
                                                ))}
                                                {sale.items.length > 2 && (
                                                    <span className="text-xs text-gray-400">+{sale.items.length - 2} ещё</span>
                                                )}
                                            </div>

                                            {/* Amount */}
                                            <div>
                                                <div className={`font-bold ${sale.paymentStatus === 'refunded' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                                                    {fmt(sale.total)}
                                                </div>
                                                {sale.discountAmount > 0 && (
                                                    <div className="text-xs text-emerald-600">скидка {fmt(sale.discountAmount)}</div>
                                                )}
                                                <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium mt-1 ${status.color}`}>
                                                    {status.label}
                                                </span>
                                            </div>

                                            {/* Payment method */}
                                            <div>
                                                <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-semibold ${pay.color}`}>
                                                    <PayIcon className="w-3.5 h-3.5" />
                                                    {pay.label}
                                                </span>
                                            </div>

                                            {/* Cashier */}
                                            <div>
                                                <div className="text-sm text-gray-700 flex items-center gap-1">
                                                    <User className="w-3 h-3 text-gray-400" />
                                                    {sale.performedByName || '—'}
                                                </div>
                                                {(sale as any).doctor && (
                                                    <div className="text-xs text-indigo-600 flex items-center gap-1 mt-1" title="Врач/Оптометрист">
                                                        🩺 {(sale as any).doctor.fullName}
                                                    </div>
                                                )}
                                                {sale.notes && (
                                                    <div className="text-xs text-gray-400 truncate max-w-[120px] mt-0.5" title={sale.notes}>
                                                        💬 {sale.notes}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Expand toggle */}
                                            <div className="flex items-center justify-center">
                                                {isExpanded
                                                    ? <ChevronUp className="w-4 h-4 text-gray-400" />
                                                    : <ChevronDown className="w-4 h-4 text-gray-400" />
                                                }
                                            </div>
                                        </div>

                                        {/* Expanded detail */}
                                        {isExpanded && (
                                            <div className="px-5 pb-5 bg-indigo-50/40 border-t border-indigo-100">
                                                <div className="pt-4 grid md:grid-cols-2 gap-6">
                                                    {/* Items table */}
                                                    <div>
                                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Состав чека</h4>
                                                        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                                                            <table className="w-full text-sm">
                                                                <thead>
                                                                    <tr className="bg-gray-50 border-b border-gray-100">
                                                                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Товар</th>
                                                                        <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">Кол-во</th>
                                                                        <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Цена</th>
                                                                        <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Итог</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-gray-50">
                                                                    {sale.items.map((item, i) => (
                                                                        <tr key={i}>
                                                                            <td className="px-3 py-2">
                                                                                <div className="font-medium text-gray-900">{item.name}</div>
                                                                                {item.category && (
                                                                                    <div className="text-xs text-gray-400">{item.category}</div>
                                                                                )}
                                                                                {item.serialNumbers && item.serialNumbers.length > 0 && (
                                                                                    <div className="text-xs text-indigo-600 font-mono mt-0.5">
                                                                                        # {item.serialNumbers.join(', ')}
                                                                                    </div>
                                                                                )}
                                                                            </td>
                                                                            <td className="px-3 py-2 text-center text-gray-600">{item.quantity}</td>
                                                                            <td className="px-3 py-2 text-right text-gray-600">{fmt(item.unitPrice)}</td>
                                                                            <td className="px-3 py-2 text-right font-semibold text-gray-900">{fmt(item.total)}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                                <tfoot>
                                                                    <tr className="bg-gray-50 border-t border-gray-200">
                                                                        <td colSpan={3} className="px-3 py-2 text-sm font-bold text-gray-700">
                                                                            {sale.discountAmount > 0 ? `Итого (скидка ${sale.discountPercent}%)` : 'Итого'}
                                                                        </td>
                                                                        <td className="px-3 py-2 text-right font-bold text-indigo-700 text-base">{fmt(sale.total)}</td>
                                                                    </tr>
                                                                </tfoot>
                                                            </table>
                                                        </div>
                                                    </div>

                                                    {/* Details sidebar */}
                                                    <div className="space-y-3">
                                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Детали транзакции</h4>
                                                        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
                                                            <div className="flex justify-between items-center text-sm">
                                                                <span className="text-gray-500">№ чека</span>
                                                                <span className="font-bold text-gray-900">{sale.saleNumber}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center text-sm">
                                                                <span className="text-gray-500">Дата и время</span>
                                                                <span className="font-medium text-gray-700">{fmtDate(sale.createdAt)}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center text-sm">
                                                                <span className="text-gray-500">Покупатель</span>
                                                                <span className="font-medium text-gray-700">{sale.customerName || '—'}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center text-sm">
                                                                <span className="text-gray-500">Телефон</span>
                                                                {sale.customerPhone ? (
                                                                    <a href={`tel:${sale.customerPhone}`} className="font-medium text-indigo-600 hover:underline">
                                                                        {sale.customerPhone}
                                                                    </a>
                                                                ) : <span className="text-gray-400">—</span>}
                                                            </div>
                                                            <div className="flex justify-between items-center text-sm">
                                                                <span className="text-gray-500">Способ оплаты</span>
                                                                <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-semibold ${pay.color}`}>
                                                                    <PayIcon className="w-3 h-3" />
                                                                    {pay.label}
                                                                </span>
                                                            </div>
                                                            {sale.paymentMethod === 'mixed' && sale.invoiceData && (sale.invoiceData as any).split && Array.isArray((sale.invoiceData as any).split) ? (
                                                                <div className="bg-orange-50 rounded-xl border border-orange-100 p-3 space-y-1.5">
                                                                    <div className="text-xs font-semibold text-orange-700 mb-1">Разбивка оплаты:</div>
                                                                    {(sale.invoiceData as any).split.map((sp: any, idx: number) => (
                                                                        <div key={idx} className="flex justify-between text-xs">
                                                                            <span className="text-gray-500 flex items-center gap-1">
                                                                                {sp.method === 'cash' ? '🪙 ' : sp.method === 'kaspi' ? '🔴 ' : '💳 '}{sp.label || sp.method}
                                                                            </span>
                                                                            <span className="font-semibold text-gray-800">{fmt(sp.amount)}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : sale.paymentMethod === 'mixed' && sale.invoiceData?.splitPayment ? (
                                                                <div className="bg-orange-50 rounded-xl border border-orange-100 p-3 space-y-1.5">
                                                                    <div className="text-xs font-semibold text-orange-700 mb-1">Разбивка оплаты:</div>
                                                                    {sale.invoiceData.cashAmount != null && (
                                                                        <div className="flex justify-between text-xs">
                                                                            <span className="text-gray-500 flex items-center gap-1">🪙 Наличные</span>
                                                                            <span className="font-semibold text-gray-800">{fmt(sale.invoiceData.cashAmount)}</span>
                                                                        </div>
                                                                    )}
                                                                    {sale.invoiceData.cardAmount != null && (
                                                                        <div className="flex justify-between text-xs">
                                                                            <span className="text-gray-500 flex items-center gap-1">💳 Карта</span>
                                                                            <span className="font-semibold text-gray-800">{fmt(sale.invoiceData.cardAmount)}</span>
                                                                        </div>
                                                                    )}
                                                                    {sale.invoiceData.transferAmount != null && (
                                                                        <div className="flex justify-between text-xs">
                                                                            <span className="text-gray-500 flex items-center gap-1">📲 Перевод</span>
                                                                            <span className="font-semibold text-gray-800">{fmt(sale.invoiceData.transferAmount)}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : null}
                                                            {sale.invoiceData?.trafficSource && (
                                                                <div className="flex justify-between items-center text-sm">
                                                                    <span className="text-gray-500">Источник трафика</span>
                                                                    <span className="font-medium text-gray-700">{sale.invoiceData.trafficSource}</span>
                                                                </div>
                                                            )}
                                                            <div className="flex justify-between items-center text-sm">
                                                                <span className="text-gray-500">Статус</span>
                                                                <span className={`text-xs px-2.5 py-1 rounded-lg font-semibold ${status.color}`}>
                                                                    {status.label}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between items-center text-sm">
                                                                <span className="text-gray-500">Кассир</span>
                                                                <span className="font-medium text-gray-700">{sale.performedByName || '—'}</span>
                                                            </div>
                                                            {(sale as any).doctor && (
                                                                <div className="flex justify-between items-center text-sm">
                                                                    <span className="text-gray-500">Врач</span>
                                                                    <span className="font-medium text-indigo-700">{(sale as any).doctor.fullName}</span>
                                                                </div>
                                                            )}
                                                            {sale.notes && (
                                                                <div className="flex flex-col text-sm border-t pt-2 mt-2">
                                                                    <span className="text-gray-500 mb-1">Комментарий:</span>
                                                                    <span className="font-medium text-gray-700 bg-gray-50 p-2 rounded-lg">{sale.notes}</span>
                                                                </div>
                                                            )}
                                                            {sale.subtotal !== sale.total && (
                                                                <>
                                                                    <div className="flex justify-between items-center text-sm border-t pt-2">
                                                                        <span className="text-gray-500">Сумма до скидки</span>
                                                                        <span className="font-medium text-gray-500 line-through">{fmt(sale.subtotal)}</span>
                                                                    </div>
                                                                    <div className="flex justify-between items-center text-sm">
                                                                        <span className="text-gray-500">Скидка ({sale.discountPercent}%)</span>
                                                                        <span className="font-medium text-emerald-600">−{fmt(sale.discountAmount)}</span>
                                                                    </div>
                                                                </>
                                                            )}
                                                            <div className="flex justify-between items-center pt-2 border-t">
                                                                <span className="font-bold text-gray-900">К оплате</span>
                                                                <span className="font-bold text-xl text-indigo-700">{fmt(sale.total)}</span>
                                                            </div>
                                                            {sale.notes && (
                                                                <div className="bg-yellow-50 rounded-lg p-3 text-xs text-yellow-700 mt-2">
                                                                    💬 {sale.notes}
                                                                </div>
                                                            )}
                                                            
                                                            {/* Refund button */}
                                                            {sale.paymentStatus !== 'refunded' && (
                                                                <div className="pt-3 border-t mt-3">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleRefund(sale.id);
                                                                        }}
                                                                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-sm font-semibold transition-colors"
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                        Сделать возврат
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Table footer */}
                        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-sm text-gray-500">{filtered.length} продаж</span>
                            <span className="text-sm font-bold text-gray-900">Итого: {fmt(stats.total)}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
