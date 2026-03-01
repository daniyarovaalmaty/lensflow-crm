'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
    Package, Clock, CheckCircle, TruckIcon, AlertTriangle,
    BarChart3, DollarSign, TrendingUp, TrendingDown,
    Zap, Activity, Users, Download, ArrowRight, Building2, Stethoscope, Calendar, X, Percent
} from 'lucide-react';
import type { Order, OrderStatus, DefectRecord, PaymentStatus } from '@/types/order';
import { OrderStatusLabels, PaymentStatusLabels, PaymentStatusColors } from '@/types/order';
import { SubRoleLabels } from '@/types/user';
import type { SubRole } from '@/types/user';
import * as XLSX from 'xlsx';

const PRICE_PER_LENS = 17_500;
const URGENT_SURCHARGE_PCT = 25;

function calcOrderPrice(order: Order): number {
    // Use stored total_price if available
    if (order.total_price && order.total_price > 0) return order.total_price;
    // Fallback for old orders
    const od = order.config.eyes.od;
    const os = order.config.eyes.os;
    const totalLenses = (Number(od.qty) || 1) + (Number(os.qty) || 1);
    const base = totalLenses * PRICE_PER_LENS;
    const pct = (order as any).discount_percent ?? 5;
    const discountAmt = Math.round(base * pct / 100);
    const afterDiscount = base - discountAmt;
    const urgentCharge = order.is_urgent ? Math.round(afterDiscount * URGENT_SURCHARGE_PCT / 100) : 0;
    return afterDiscount + urgentCharge;
}

export default function LabHeadDashboard() {
    const { data: session } = useSession();
    const subRole = (session?.user?.subRole || 'lab_head') as SubRole;

    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [counterpartyTab, setCounterpartyTab] = useState<'doctors' | 'clinics'>('doctors');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [orgs, setOrgs] = useState<{ id: string; name: string; discountPercent: number }[]>([]);
    const [editingDiscount, setEditingDiscount] = useState<string | null>(null);
    const [discountInput, setDiscountInput] = useState('');

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/organizations');
                if (res.ok) setOrgs(await res.json());
            } catch (e) { console.error(e); }
        })();
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/orders');
                if (res.ok) setOrders(await res.json());
            } catch (e) { console.error(e); }
            finally { setIsLoading(false); }
        })();
    }, []);

    // ─── Date-filtered orders ───
    const filteredOrders = useMemo(() => {
        let result = [...orders];
        if (dateFrom) {
            const from = new Date(dateFrom);
            result = result.filter(o => new Date(o.meta.created_at) >= from);
        }
        if (dateTo) {
            const to = new Date(dateTo);
            to.setHours(23, 59, 59, 999);
            result = result.filter(o => new Date(o.meta.created_at) <= to);
        }
        return result;
    }, [orders, dateFrom, dateTo]);

    // ─── Time helpers ───
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const thisMonthOrders = filteredOrders.filter(o => new Date(o.meta.created_at) >= startOfMonth);
    const lastMonthOrders = filteredOrders.filter(o => {
        const d = new Date(o.meta.created_at);
        return d >= startOfLastMonth && d <= endOfLastMonth;
    });

    // ─── KPIs ───
    const kpis = useMemo(() => {
        const totalOrders = filteredOrders.length;
        const totalThisMonth = thisMonthOrders.length;
        const totalLastMonth = lastMonthOrders.length;
        const growthPct = totalLastMonth > 0
            ? Math.round(((totalThisMonth - totalLastMonth) / totalLastMonth) * 100)
            : totalThisMonth > 0 ? 100 : 0;

        // Revenue
        const totalRevenue = filteredOrders.reduce((s, o) => s + calcOrderPrice(o), 0);
        const revenueThisMonth = thisMonthOrders.reduce((s, o) => s + calcOrderPrice(o), 0);
        const revenueLastMonth = lastMonthOrders.reduce((s, o) => s + calcOrderPrice(o), 0);
        const revenueGrowthPct = revenueLastMonth > 0
            ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100)
            : revenueThisMonth > 0 ? 100 : 0;

        // Payment stats
        const paidOrders = filteredOrders.filter(o => (o as any).payment_status === 'paid');
        const unpaidOrders = filteredOrders.filter(o => (o as any).payment_status !== 'paid');
        const paidRevenue = paidOrders.reduce((s, o) => s + calcOrderPrice(o), 0);
        const unpaidRevenue = unpaidOrders.reduce((s, o) => s + calcOrderPrice(o), 0);

        // Status breakdown
        const statusCounts: Record<string, number> = {};
        filteredOrders.forEach(o => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });

        // Defects
        const totalDefects = filteredOrders.reduce((s, o) => s + (o.defects || []).reduce((d: number, def: DefectRecord) => d + def.qty, 0), 0);
        const totalLenses = filteredOrders.reduce((s, o) => s + (Number(o.config.eyes.od.qty) || 1) + (Number(o.config.eyes.os.qty) || 1), 0);
        const defectRate = totalLenses > 0 ? ((totalDefects / totalLenses) * 100).toFixed(1) : '0';

        // Urgent orders
        const urgentOrders = filteredOrders.filter(o => o.is_urgent).length;
        const urgentPct = totalOrders > 0 ? Math.round((urgentOrders / totalOrders) * 100) : 0;

        // Avg production time (for orders that have production_started_at and are at least 'ready')
        const completedOrders = filteredOrders.filter(o =>
            o.production_started_at &&
            ['ready', 'shipped', 'out_for_delivery', 'delivered'].includes(o.status)
        );
        let avgProdHours = 0;
        if (completedOrders.length > 0) {
            const totalMs = completedOrders.reduce((s, o) => {
                const start = new Date(o.production_started_at!).getTime();
                const end = new Date(o.meta.updated_at || o.meta.created_at).getTime();
                return s + (end - start);
            }, 0);
            avgProdHours = Math.round(totalMs / completedOrders.length / 3600_000);
        }

        // Per-month revenue for last 6 months
        const monthlyRevenue: { month: string; revenue: number; orders: number }[] = [];
        for (let i = 5; i >= 0; i--) {
            const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
            const mo = filteredOrders.filter(o => {
                const d = new Date(o.meta.created_at);
                return d >= mStart && d <= mEnd;
            });
            monthlyRevenue.push({
                month: mStart.toLocaleDateString('ru-RU', { month: 'short' }),
                revenue: mo.reduce((s, o) => s + calcOrderPrice(o), 0),
                orders: mo.length,
            });
        }

        return {
            totalOrders, totalThisMonth, totalLastMonth, growthPct,
            totalRevenue, revenueThisMonth, revenueLastMonth, revenueGrowthPct,
            paidRevenue, unpaidRevenue,
            statusCounts,
            totalDefects, defectRate, totalLenses,
            urgentOrders, urgentPct,
            avgProdHours, completedOrders: completedOrders.length,
            monthlyRevenue,
        };
    }, [filteredOrders]);

    // ─── Counterparties ───
    const counterparties = useMemo(() => {
        // Doctors
        const doctorMap = new Map<string, { name: string; orders: number; revenue: number; unpaid: number; lastDate: string }>();
        filteredOrders.forEach(o => {
            const name = o.meta.doctor || 'Не указан';
            const existing = doctorMap.get(name) || { name, orders: 0, revenue: 0, unpaid: 0, lastDate: '' };
            existing.orders++;
            existing.revenue += calcOrderPrice(o);
            if ((o as any).payment_status !== 'paid') existing.unpaid += calcOrderPrice(o);
            if (!existing.lastDate || o.meta.created_at > existing.lastDate) existing.lastDate = o.meta.created_at;
            doctorMap.set(name, existing);
        });

        // Clinics
        const clinicMap = new Map<string, { name: string; orders: number; revenue: number; unpaid: number; lastDate: string }>();
        filteredOrders.forEach(o => {
            const name = o.meta.optic_name || o.company || 'Не указана';
            const existing = clinicMap.get(name) || { name, orders: 0, revenue: 0, unpaid: 0, lastDate: '' };
            existing.orders++;
            existing.revenue += calcOrderPrice(o);
            if ((o as any).payment_status !== 'paid') existing.unpaid += calcOrderPrice(o);
            if (!existing.lastDate || o.meta.created_at > existing.lastDate) existing.lastDate = o.meta.created_at;
            clinicMap.set(name, existing);
        });

        return {
            doctors: Array.from(doctorMap.values()).sort((a, b) => b.orders - a.orders),
            clinics: Array.from(clinicMap.values()).sort((a, b) => b.orders - a.orders),
        };
    }, [filteredOrders]);

    const getOrgDiscount = (clinicName: string) => {
        const org = orgs.find(o => o.name === clinicName);
        return org?.discountPercent ?? 5;
    };

    const getOrgId = (clinicName: string) => {
        return orgs.find(o => o.name === clinicName)?.id;
    };

    const saveDiscount = async (orgId: string, value: number) => {
        try {
            const res = await fetch(`/api/organizations/${orgId}/discount`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ discountPercent: value }),
            });
            if (res.ok) {
                const updated = await res.json();
                setOrgs(prev => prev.map(o => o.id === orgId ? { ...o, discountPercent: updated.discountPercent } : o));
            }
        } catch (e) { console.error(e); }
        setEditingDiscount(null);
    };

    // Export all data to Excel
    const exportToExcel = () => {
        try {
            const rows = orders.map(o => ({
                '№ заказа': o.order_id,
                'Пациент': o.patient.name,
                'Телефон': o.patient.phone,
                'Статус': OrderStatusLabels[o.status],
                'Оплата': (o as any).payment_status === 'paid' ? 'Оплачен' : (o as any).payment_status === 'partial' ? 'Частично' : 'Не оплачен',
                'Дата': new Date(o.meta.created_at).toLocaleDateString('ru-RU'),
                'Срочность': o.is_urgent ? 'Срочный' : 'Обычный',
                'Врач': o.meta.doctor || '—',
                'Оптика': o.meta.optic_name || '—',
                'OD Qty': Number(o.config.eyes.od.qty) || 1,
                'OS Qty': Number(o.config.eyes.os.qty) || 1,
                'Стоимость': calcOrderPrice(o),
            }));
            const ws = XLSX.utils.json_to_sheet(rows);
            const colWidths = Object.keys(rows[0] || {}).map(key => ({
                wch: Math.max(key.length, ...rows.map(r => String((r as any)[key] || '').length)) + 2,
            }));
            ws['!cols'] = colWidths;
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Заказы');
            XLSX.writeFile(wb, `LensFlow_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
        } catch (err: any) {
            console.error('Export error:', err);
            alert('Ошибка экспорта: ' + (err.message || err));
        }
    };

    const fmt = (n: number) => n.toLocaleString('ru-RU');

    if (isLoading) {
        return (
            <div className="min-h-screen bg-surface flex items-center justify-center">
                <div className="text-center">
                    <div className="skeleton w-12 h-12 rounded-full mx-auto mb-4" />
                    <p className="text-gray-600">Загрузка данных...</p>
                </div>
            </div>
        );
    }

    const GrowthBadge = ({ pct }: { pct: number }) => (
        <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${pct > 0 ? 'bg-emerald-100 text-emerald-700' : pct < 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
            }`}>
            {pct > 0 ? <TrendingUp className="w-3 h-3" /> : pct < 0 ? <TrendingDown className="w-3 h-3" /> : null}
            {pct > 0 ? '+' : ''}{pct}%
        </span>
    );

    const maxRevenue = Math.max(...kpis.monthlyRevenue.map(m => m.revenue), 1);

    const statusPipelineItems = [
        { key: 'new', label: 'Новые', color: 'bg-blue-500', lightColor: 'bg-blue-100 text-blue-700' },
        { key: 'in_production', label: 'В производстве', color: 'bg-yellow-500', lightColor: 'bg-yellow-100 text-yellow-700' },
        { key: 'ready', label: 'Готово', color: 'bg-green-500', lightColor: 'bg-green-100 text-green-700' },
        { key: 'rework', label: 'На доработку', color: 'bg-orange-500', lightColor: 'bg-orange-100 text-orange-700' },
        { key: 'shipped', label: 'Отгружено', color: 'bg-purple-500', lightColor: 'bg-purple-100 text-purple-700' },
        { key: 'out_for_delivery', label: 'В доставке', color: 'bg-indigo-500', lightColor: 'bg-indigo-100 text-indigo-700' },
        { key: 'delivered', label: 'Доставлено', color: 'bg-teal-500', lightColor: 'bg-teal-100 text-teal-700' },
    ];

    return (
        <div className="min-h-screen bg-surface">
            {/* Header */}
            <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold">Панель руководителя</h1>
                            <p className="text-sm text-gray-400 mt-0.5">{SubRoleLabels[subRole]} • Ключевые показатели лаборатории</p>
                        </div>
                        <div className="flex flex-wrap gap-2 sm:gap-3">
                            <button
                                onClick={exportToExcel}
                                className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-medium transition-colors"
                            >
                                <Download className="w-4 h-4" />
                                <span className="hidden sm:inline">Экспорт</span> XLS
                            </button>
                            <Link
                                href="/laboratory/production"
                                className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-medium transition-colors"
                            >
                                Канбан
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
                {/* Date Filters */}
                <div className="flex flex-wrap items-end gap-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                            <Calendar className="w-3.5 h-3.5 inline mr-1" />Дата от
                        </label>
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                            <Calendar className="w-3.5 h-3.5 inline mr-1" />Дата до
                        </label>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input" />
                    </div>
                    {(dateFrom || dateTo) && (
                        <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="btn btn-secondary text-sm gap-1">
                            <X className="w-4 h-4" /> Сбросить
                        </button>
                    )}
                    <div className="ml-auto text-xs text-gray-400">
                        Показано: {filteredOrders.length} заказов
                    </div>
                </div>
                {/* ─── KPI Cards Row ─── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total Orders */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                                <Package className="w-5 h-5" />
                            </div>
                            <GrowthBadge pct={kpis.growthPct} />
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{kpis.totalThisMonth}</p>
                        <p className="text-sm text-gray-500 mt-1">Заказов за месяц</p>
                        <p className="text-xs text-gray-400 mt-0.5">Всего: {kpis.totalOrders}</p>
                    </div>

                    {/* Revenue This Month */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                <DollarSign className="w-5 h-5" />
                            </div>
                            <GrowthBadge pct={kpis.revenueGrowthPct} />
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{fmt(kpis.revenueThisMonth)} ₸</p>
                        <p className="text-sm text-gray-500 mt-1">Выручка за месяц</p>
                        <p className="text-xs text-gray-400 mt-0.5">Всего: {fmt(kpis.totalRevenue)} ₸</p>
                    </div>

                    {/* Defect Rate */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{kpis.defectRate}%</p>
                        <p className="text-sm text-gray-500 mt-1">Процент брака</p>
                        <p className="text-xs text-gray-400 mt-0.5">{kpis.totalDefects} браков / {kpis.totalLenses} линз</p>
                    </div>

                    {/* Avg Production Time */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                                <Clock className="w-5 h-5" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{kpis.avgProdHours > 0 ? `${kpis.avgProdHours} ч` : '—'}</p>
                        <p className="text-sm text-gray-500 mt-1">Ср. время производства</p>
                        <p className="text-xs text-gray-400 mt-0.5">{kpis.completedOrders} выполн. заказов</p>
                    </div>
                </div>

                {/* ─── Second Row: Finance + Urgency ─── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Financial Summary */}
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-5">
                            <BarChart3 className="w-5 h-5 text-blue-600" />
                            Выручка по месяцам
                        </h3>
                        <div className="flex items-end gap-2 sm:gap-3 h-40 overflow-x-auto">
                            {kpis.monthlyRevenue.map((m, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                    <span className="text-[10px] font-semibold text-gray-500">{fmt(m.revenue / 1000)}к</span>
                                    <div className="w-full relative">
                                        <div
                                            className={`w-full rounded-t-lg transition-all ${i === kpis.monthlyRevenue.length - 1 ? 'bg-blue-500' : 'bg-blue-200'}`}
                                            style={{ height: `${Math.max((m.revenue / maxRevenue) * 120, 4)}px` }}
                                        />
                                    </div>
                                    <span className="text-[10px] text-gray-400">{m.month}</span>
                                    <span className="text-[10px] text-gray-400">{m.orders} шт</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Payment Status */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-5">
                            <DollarSign className="w-5 h-5 text-emerald-600" />
                            Оплаты
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                                    <span className="text-sm text-gray-700">Оплачено</span>
                                </div>
                                <span className="text-sm font-bold text-gray-900">{fmt(kpis.paidRevenue)} ₸</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-red-400" />
                                    <span className="text-sm text-gray-700">Не оплачено</span>
                                </div>
                                <span className="text-sm font-bold text-gray-900">{fmt(kpis.unpaidRevenue)} ₸</span>
                            </div>
                            {/* Progress bar */}
                            <div className="w-full h-3 bg-red-100 rounded-full overflow-hidden mt-2">
                                <div
                                    className="h-full bg-emerald-500 rounded-full transition-all"
                                    style={{ width: `${kpis.totalRevenue > 0 ? (kpis.paidRevenue / kpis.totalRevenue) * 100 : 0}%` }}
                                />
                            </div>
                            <p className="text-xs text-gray-400 text-center">
                                {kpis.totalRevenue > 0 ? Math.round((kpis.paidRevenue / kpis.totalRevenue) * 100) : 0}% собрано
                            </p>
                        </div>

                        <div className="mt-5 pt-4 border-t border-gray-100 space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-amber-500" />
                                    <span className="text-sm text-gray-700">Срочные заказы</span>
                                </div>
                                <span className="text-sm font-bold text-gray-900">{kpis.urgentOrders}</span>
                            </div>
                            <p className="text-xs text-gray-400">{kpis.urgentPct}% от общего числа</p>
                        </div>
                    </div>
                </div>

                {/* ─── Pipeline View ─── */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-5">
                        <Activity className="w-5 h-5 text-purple-600" />
                        Воронка заказов
                    </h3>

                    {/* Status bar */}
                    <div className="flex h-5 rounded-full overflow-hidden mb-5">
                        {statusPipelineItems.map(s => {
                            const count = kpis.statusCounts[s.key] || 0;
                            const pct = kpis.totalOrders > 0 ? (count / kpis.totalOrders) * 100 : 0;
                            return pct > 0 ? (
                                <div key={s.key} className={`${s.color} transition-all`} style={{ width: `${pct}%` }}
                                    title={`${s.label}: ${count}`} />
                            ) : null;
                        })}
                    </div>

                    {/* Status cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                        {statusPipelineItems.map(s => {
                            const count = kpis.statusCounts[s.key] || 0;
                            return (
                                <div key={s.key} className={`rounded-xl p-3 text-center ${s.lightColor}`}>
                                    <p className="text-2xl font-bold">{count}</p>
                                    <p className="text-xs font-medium mt-1">{s.label}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ─── Counterparties ─── */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Users className="w-5 h-5 text-indigo-600" />
                            Контрагенты
                        </h3>
                        <div className="flex bg-gray-100 rounded-xl p-1">
                            <button
                                type="button"
                                onClick={() => setCounterpartyTab('doctors')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${counterpartyTab === 'doctors'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <Stethoscope className="w-3.5 h-3.5" />
                                Врачи ({counterparties.doctors.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setCounterpartyTab('clinics')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${counterpartyTab === 'clinics'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <Building2 className="w-3.5 h-3.5" />
                                Клиники ({counterparties.clinics.length})
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">
                                        {counterpartyTab === 'doctors' ? 'Врач' : 'Клиника'}
                                    </th>
                                    <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Заказов</th>
                                    <th className="text-right py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Выручка</th>
                                    <th className="text-right py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Неоплачено</th>
                                    {counterpartyTab === 'clinics' && (
                                        <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Скидка %</th>
                                    )}
                                    <th className="text-right py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Посл. заказ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(counterpartyTab === 'doctors' ? counterparties.doctors : counterparties.clinics).map((cp, i) => (
                                    <tr key={cp.name + i} className="border-b border-gray-50 hover:bg-gray-50/50">
                                        <td className="py-3 px-3">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${counterpartyTab === 'doctors'
                                                    ? 'bg-blue-100 text-blue-700'
                                                    : 'bg-indigo-100 text-indigo-700'
                                                    }`}>
                                                    {cp.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-medium text-gray-900">{cp.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            <span className="inline-flex items-center justify-center min-w-[28px] h-6 bg-blue-50 text-blue-700 text-xs font-bold rounded-full px-2">
                                                {cp.orders}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3 text-right font-medium text-gray-900">{fmt(cp.revenue)} ₸</td>
                                        <td className="py-3 px-3 text-right">
                                            {cp.unpaid > 0 ? (
                                                <span className="text-red-600 font-medium">{fmt(cp.unpaid)} ₸</span>
                                            ) : (
                                                <span className="text-emerald-600 font-medium">—</span>
                                            )}
                                        </td>
                                        {counterpartyTab === 'clinics' && (() => {
                                            const orgId = getOrgId(cp.name);
                                            const discount = getOrgDiscount(cp.name);
                                            const isEditing = editingDiscount === orgId;
                                            return (
                                                <td className="py-3 px-3 text-center">
                                                    {isEditing && orgId ? (
                                                        <div className="flex items-center justify-center gap-1">
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                max={100}
                                                                step={0.5}
                                                                value={discountInput}
                                                                onChange={e => setDiscountInput(e.target.value)}
                                                                onKeyDown={e => {
                                                                    if (e.key === 'Enter') saveDiscount(orgId, Number(discountInput));
                                                                    if (e.key === 'Escape') setEditingDiscount(null);
                                                                }}
                                                                className="w-16 text-center text-xs border border-blue-300 rounded-lg px-1 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                autoFocus
                                                            />
                                                            <button
                                                                onClick={() => saveDiscount(orgId, Number(discountInput))}
                                                                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                                            >✓</button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => {
                                                                if (orgId && subRole === 'lab_head') {
                                                                    setEditingDiscount(orgId);
                                                                    setDiscountInput(String(discount));
                                                                }
                                                            }}
                                                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${subRole === 'lab_head' && orgId
                                                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer'
                                                                : 'bg-gray-50 text-gray-600'
                                                                }`}
                                                            title={subRole === 'lab_head' ? 'Нажмите для редактирования' : ''}
                                                        >
                                                            <Percent className="w-3 h-3" />
                                                            {discount}
                                                        </button>
                                                    )}
                                                </td>
                                            );
                                        })()}
                                        <td className="py-3 px-3 text-right text-gray-500">
                                            {cp.lastDate ? new Date(cp.lastDate).toLocaleDateString('ru-RU') : '—'}
                                        </td>
                                    </tr>
                                ))}
                                {(counterpartyTab === 'doctors' ? counterparties.doctors : counterparties.clinics).length === 0 && (
                                    <tr>
                                        <td colSpan={counterpartyTab === 'clinics' ? 6 : 5} className="py-8 text-center text-gray-400">
                                            Нет данных
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ─── Recent Orders Table ─── */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Users className="w-5 h-5 text-gray-600" />
                            Последние заказы
                        </h3>
                        <Link
                            href="/laboratory/production"
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                        >
                            Все заказы <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Заказ</th>
                                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Пациент</th>
                                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Врач</th>
                                    <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Статус</th>
                                    <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Оплата</th>
                                    <th className="text-right py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Сумма</th>
                                    <th className="text-right py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Дата</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders
                                    .sort((a, b) => new Date(b.meta.created_at).getTime() - new Date(a.meta.created_at).getTime())
                                    .slice(0, 10)
                                    .map(order => {
                                        const ps = (order as any).payment_status || 'unpaid';
                                        return (
                                            <tr key={order.order_id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                                <td className="py-3 px-3">
                                                    <span className="font-semibold text-gray-900">{order.order_id}</span>
                                                    {order.is_urgent && (
                                                        <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 rounded px-1 py-0.5">
                                                            <Zap className="w-2.5 h-2.5" /> СРОЧ
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-3 text-gray-700">{order.patient.name}</td>
                                                <td className="py-3 px-3 text-gray-500">{order.meta.doctor || '—'}</td>
                                                <td className="py-3 px-3 text-center">
                                                    <span className={`text-xs font-medium px-2 py-1 rounded-lg ${statusPipelineItems.find(s => s.key === order.status)?.lightColor || 'bg-gray-100 text-gray-700'
                                                        }`}>
                                                        {OrderStatusLabels[order.status]}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3 text-center">
                                                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${PaymentStatusColors[ps as PaymentStatus]}`}>
                                                        <span className={`w-2 h-2 rounded-full ${ps === 'paid' ? 'bg-emerald-500' : ps === 'partial' ? 'bg-amber-500' : 'bg-gray-400'}`} />
                                                        {PaymentStatusLabels[ps as PaymentStatus]}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3 text-right font-medium text-gray-900">{fmt(calcOrderPrice(order))} ₸</td>
                                                <td className="py-3 px-3 text-right text-gray-500">{new Date(order.meta.created_at).toLocaleDateString('ru-RU')}</td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
