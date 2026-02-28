'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText, Download, DollarSign, CheckCircle, Clock, XCircle,
    Search, Calendar, TrendingUp, Package, ChevronDown, ChevronUp, User, Building2, MapPin
} from 'lucide-react';
import type { Order, PaymentStatus } from '@/types/order';
import { OrderStatusLabels, PaymentStatusLabels, PaymentStatusColors, CharacteristicLabels } from '@/types/order';
import type { Characteristic } from '@/types/order';
import { getPermissions } from '@/types/user';
import type { SubRole } from '@/types/user';
import * as XLSX from 'xlsx';

const FALLBACK_PRICE_PER_LENS = 17_500;
const DISCOUNT_PCT = 5;
const URGENT_SURCHARGE_PCT = 25;

function calcOrderTotal(order: Order): number {
    if (order.total_price && order.total_price > 0) return order.total_price;
    const od = order.config.eyes.od?.qty ?? 0;
    const os = order.config.eyes.os?.qty ?? 0;
    const base = (Number(od) + Number(os)) * FALLBACK_PRICE_PER_LENS;
    const disc = Math.round(base * DISCOUNT_PCT / 100);
    const after = base - disc;
    const surcharge = order.is_urgent ? Math.round(after * URGENT_SURCHARGE_PCT / 100) : 0;
    return after + surcharge;
}

function getLensPrice(char: string | undefined): number {
    if (char === 'toric') return 18_500;
    return 17_500;
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
                                    <th className="w-8 px-2"></th>
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
                                        <td colSpan={8} className="text-center py-12 text-gray-400">
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
                                    const discountAmt = Math.round(lensTotal * DISCOUNT_PCT / 100);
                                    const afterDiscount = lensTotal - discountAmt;
                                    const urgentAmt = order.is_urgent ? Math.round(afterDiscount * URGENT_SURCHARGE_PCT / 100) : 0;

                                    return (
                                        <React.Fragment key={order.order_id}>
                                            <tr
                                                onClick={() => setExpandedId(isExpanded ? null : order.order_id)}
                                                className="hover:bg-gray-50/60 transition-colors cursor-pointer"
                                            >
                                                <td className="px-2 py-3 text-gray-400">
                                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                </td>
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
                                                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                                    <div className="flex gap-1">
                                                        {perms.canChangePayments ? PAYMENT_OPTIONS.map(opt => (
                                                            <button
                                                                key={opt.value}
                                                                onClick={() => updatePayment(order.order_id, opt.value)}
                                                                disabled={updating === order.order_id}
                                                                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border font-medium transition-all ${payStatus === opt.value ? opt.color : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'}`}
                                                            >
                                                                <opt.icon className="w-3 h-3" />
                                                                {opt.label}
                                                            </button>
                                                        )) : (
                                                            <span className={`text-xs px-2 py-1 rounded-lg border font-medium ${PaymentStatusColors[payStatus]}`}>
                                                                {PaymentStatusLabels[payStatus]}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                            <AnimatePresence>
                                                {isExpanded && (
                                                    <tr>
                                                        <td colSpan={8} className="p-0">
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
                                                                                <span>Скидка {DISCOUNT_PCT}%</span>
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
                )}
            </div>
        </div>
    );
}
