'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import {
    FileText, Download, DollarSign, CheckCircle, Clock, XCircle,
    Search, Calendar, TrendingUp, Package
} from 'lucide-react';
import type { Order, PaymentStatus } from '@/types/order';
import { OrderStatusLabels, PaymentStatusLabels, PaymentStatusColors } from '@/types/order';
import * as XLSX from 'xlsx';

const PRICE_PER_LENS = 40_000;
const DISCOUNT_PCT = 5;
const URGENT_SURCHARGE_PCT = 25;

function calcOrderTotal(order: Order): number {
    const od = order.config.eyes.od?.qty ?? 0;
    const os = order.config.eyes.os?.qty ?? 0;
    const base = (Number(od) + Number(os)) * PRICE_PER_LENS;
    const disc = Math.round(base * DISCOUNT_PCT / 100);
    const after = base - disc;
    const surcharge = order.is_urgent ? Math.round(after * URGENT_SURCHARGE_PCT / 100) : 0;
    return after + surcharge;
}

const PAYMENT_OPTIONS: { value: PaymentStatus; label: string; icon: any; color: string }[] = [
    { value: 'unpaid', label: 'Не оплачен', icon: XCircle, color: 'text-red-600 bg-red-50 border-red-200' },
    { value: 'partial', label: 'Частично', icon: Clock, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { value: 'paid', label: 'Оплачен', icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
];

export default function AccountantPage() {
    const { data: session } = useSession();
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [payFilter, setPayFilter] = useState<'all' | PaymentStatus>('all');
    const [updating, setUpdating] = useState<string | null>(null);

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

    const filtered = useMemo(() => {
        let r = [...orders];
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
    }, [orders, payFilter, searchQuery, dateFrom, dateTo]);

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
        const rows = filtered.map(o => ({
            '№': o.order_id,
            'Пациент': o.patient.name,
            'Телефон': o.patient.phone,
            'Статус заказа': OrderStatusLabels[o.status],
            'Статус оплаты': PaymentStatusLabels[o.payment_status ?? 'unpaid'],
            'Срочный': o.is_urgent ? 'Да' : 'Нет',
            'Сумма (₸)': calcOrderTotal(o),
            'Дата': new Date(o.meta.created_at).toLocaleDateString('ru-RU'),
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Платежи');
        XLSX.writeFile(wb, `LensFlow_Payments_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    return (
        <div className="min-h-screen bg-surface">
            {/* Header */}
            <div className="bg-surface-elevated border-b border-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Бухгалтерия</h1>
                            <p className="text-gray-500 text-sm mt-1">Статусы оплат и финансовые документы</p>
                        </div>
                        <button onClick={exportExcel} className="btn btn-primary gap-2">
                            <Download className="w-4 h-4" />
                            Экспорт XLS
                        </button>
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
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600">№ заказа</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Пациент</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Статус</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Срочный</th>
                                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Сумма</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Дата</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Оплата</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-12 text-gray-400">
                                            Нет заказов
                                        </td>
                                    </tr>
                                ) : filtered.map(order => {
                                    const total = calcOrderTotal(order);
                                    const payStatus = (order.payment_status ?? 'unpaid') as PaymentStatus;
                                    const curOpt = PAYMENT_OPTIONS.find(o => o.value === payStatus) || PAYMENT_OPTIONS[0];
                                    return (
                                        <tr key={order.order_id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="px-4 py-3 font-mono font-medium text-gray-800">{order.order_id}</td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-gray-900">{order.patient.name}</div>
                                                <div className="text-xs text-gray-400">{order.patient.phone}</div>
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
                                            <td className="px-4 py-3">
                                                <div className="flex gap-1">
                                                    {PAYMENT_OPTIONS.map(opt => (
                                                        <button
                                                            key={opt.value}
                                                            onClick={() => updatePayment(order.order_id, opt.value)}
                                                            disabled={updating === order.order_id}
                                                            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border font-medium transition-all ${payStatus === opt.value ? opt.color : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'}`}
                                                        >
                                                            <opt.icon className="w-3 h-3" />
                                                            {opt.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
