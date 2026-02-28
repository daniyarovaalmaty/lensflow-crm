'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Package, Clock, CheckCircle, TruckIcon,
    Search, SlidersHorizontal, ChevronDown, ArrowUpDown,
    Download, FileText, Printer, User, Calendar, X, Zap, Pencil, Lock, Truck, MapPin, LogOut
} from 'lucide-react';
import type { Order, OrderStatus, Characteristic } from '@/types/order';
import { OrderStatusLabels, OrderStatusColors, CharacteristicLabels, PaymentStatusLabels, PaymentStatusColors, canEditOrder, editWindowRemainingMs } from '@/types/order';
import type { PaymentStatus } from '@/types/order';
import { getPermissions, SubRoleLabels } from '@/types/user';
import type { SubRole } from '@/types/user';

const PRICE_PER_LENS = 17500; // fallback for print/expanded details

type SortOption = 'newest' | 'oldest' | 'patient_az' | 'patient_za';

const SortLabels: Record<SortOption, string> = {
    newest: 'Сначала новые',
    oldest: 'Сначала старые',
    patient_az: 'Пациент А → Я',
    patient_za: 'Пациент Я → А',
};

export default function OpticDashboard() {
    const { data: session } = useSession();
    const subRole = (session?.user?.subRole || 'optic_manager') as SubRole;
    const perms = getPermissions(subRole);
    const canSeePrices = subRole !== 'optic_doctor';

    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<OrderStatus | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<SortOption>('newest');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
    // tick every 30s to refresh countdown displays
    const [, setTick] = useState(0);
    useEffect(() => { const t = setInterval(() => setTick(n => n + 1), 30_000); return () => clearInterval(t); }, []);

    const formatCountdown = (ms: number) => {
        if (ms <= 0) return null;
        const h = Math.floor(ms / 3600_000);
        const m = Math.floor((ms % 3600_000) / 60_000);
        return h > 0 ? `${h}ч ${m}м` : `${m}м`;
    };

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        try {
            const response = await fetch('/api/orders');
            if (response.ok) {
                const data = await response.json();
                setOrders(data);
            }
        } catch (error) {
            console.error('Failed to load orders:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const confirmDelivery = async (orderId: string) => {
        try {
            await fetch(`/api/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'delivered' }),
            });
            await loadOrders();
        } catch (err) {
            console.error('Failed to confirm delivery:', err);
        }
    };

    const filteredOrders = useMemo(() => {
        let result = [...orders];

        // Status filter
        if (filter !== 'all') {
            result = result.filter(o => o.status === filter);
        }

        // Search filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            result = result.filter(o =>
                o.order_id.toLowerCase().includes(q) ||
                o.patient.name.toLowerCase().includes(q) ||
                (o.meta.doctor || '').toLowerCase().includes(q)
            );
        }

        // Date range filter
        if (dateFrom) {
            const from = new Date(dateFrom);
            result = result.filter(o => new Date(o.meta.created_at) >= from);
        }
        if (dateTo) {
            const to = new Date(dateTo);
            to.setHours(23, 59, 59, 999);
            result = result.filter(o => new Date(o.meta.created_at) <= to);
        }

        // Sort
        result.sort((a, b) => {
            switch (sortBy) {
                case 'newest':
                    return new Date(b.meta.created_at).getTime() - new Date(a.meta.created_at).getTime();
                case 'oldest':
                    return new Date(a.meta.created_at).getTime() - new Date(b.meta.created_at).getTime();
                case 'patient_az':
                    return a.patient.name.localeCompare(b.patient.name, 'ru');
                case 'patient_za':
                    return b.patient.name.localeCompare(a.patient.name, 'ru');
                default:
                    return 0;
            }
        });

        return result;
    }, [orders, filter, searchQuery, sortBy, dateFrom, dateTo]);

    const stats = {
        total: orders.length,
        new: orders.filter(o => o.status === 'new').length,
        in_production: orders.filter(o => o.status === 'in_production').length,
        ready: orders.filter(o => o.status === 'ready').length,
        shipped: orders.filter(o => o.status === 'shipped').length,
    };

    const toggleExpand = (orderId: string) => {
        setExpandedOrders(prev => {
            const next = new Set(prev);
            next.has(orderId) ? next.delete(orderId) : next.add(orderId);
            return next;
        });
    };

    const clearFilters = () => {
        setSearchQuery('');
        setFilter('all');
        setDateFrom('');
        setDateTo('');
        setSortBy('newest');
    };

    const hasActiveFilters = searchQuery || filter !== 'all' || dateFrom || dateTo || sortBy !== 'newest';

    const handlePrintInvoice = (order: Order) => {
        const od = order.config.eyes.od;
        const os = order.config.eyes.os;
        const odQty = Number(od.qty) || 0;
        const osQty = Number(os.qty) || 0;
        const totalLenses = odQty + osQty;
        const totalPrice = totalLenses * PRICE_PER_LENS;
        const dateStr = new Date(order.meta.created_at).toLocaleDateString('ru-RU');

        const renderEyeRow = (label: string, eye: any, qty: number) => `
            <tr>
                <td style="padding:10px 14px;border:1px solid #e5e7eb;">MediLens — ${label}</td>
                <td style="padding:10px 14px;border:1px solid #e5e7eb;text-align:center;">Km ${eye.km || '—'}, DIA ${eye.dia || '—'}, Dk ${eye.dk || '—'}</td>
                <td style="padding:10px 14px;border:1px solid #e5e7eb;text-align:center;">${qty}</td>
                <td style="padding:10px 14px;border:1px solid #e5e7eb;text-align:right;">${PRICE_PER_LENS.toLocaleString('ru-RU')} ₸</td>
                <td style="padding:10px 14px;border:1px solid #e5e7eb;text-align:right;font-weight:600;">${(qty * PRICE_PER_LENS).toLocaleString('ru-RU')} ₸</td>
            </tr>`;

        const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>Счёт ${order.order_id}</title>
<style>body{font-family:'Segoe UI',Arial,sans-serif;max-width:750px;margin:0 auto;padding:30px;color:#111}
.header{display:flex;justify-content:space-between;border-bottom:3px solid #2563eb;padding-bottom:16px;margin-bottom:24px}
.logo{font-size:22px;font-weight:700;color:#2563eb}.invoice-num{font-size:18px;font-weight:700;text-align:right}
.invoice-date{font-size:13px;color:#6b7280;text-align:right;margin-top:4px}
table{width:100%;border-collapse:collapse;margin:20px 0}th{background:#f3f4f6;padding:10px 14px;border:1px solid #e5e7eb;font-size:12px;text-transform:uppercase}
.total{text-align:right;font-size:18px;font-weight:700;margin:12px 0}
@media print{body{padding:0}}</style></head><body>
<div class="header"><div><div class="logo">LensFlow</div></div><div><div class="invoice-num">Счёт №${order.order_id}</div><div class="invoice-date">от ${dateStr}</div></div></div>
<p><strong>Пациент:</strong> ${order.patient.name} | <strong>Врач:</strong> ${order.meta.doctor || '—'}${order.company ? ' | <strong>Компания:</strong> ' + order.company : ''}</p>
<table><thead><tr><th>Наименование</th><th style="text-align:center">Параметры</th><th style="text-align:center">Кол-во</th><th style="text-align:right">Цена</th><th style="text-align:right">Сумма</th></tr></thead><tbody>
${renderEyeRow('OD', od, odQty)}${renderEyeRow('OS', os, osQty)}
</tbody></table>
<div class="total">Итого: ${totalPrice.toLocaleString('ru-RU')} ₸</div>
</body></html>`;

        const w = window.open('', '_blank');
        if (w) { w.document.write(html); w.document.close(); w.focus(); w.print(); }
    };

    const ParamRow = ({ label, value }: { label: string; value: any }) => (
        value != null && value !== '' ? (
            <div className="flex justify-between text-xs py-1 border-b border-gray-100">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium text-gray-800">{String(value)}</span>
            </div>
        ) : null
    );

    const EyeBlock = ({ label, eye }: { label: string; eye: any }) => (
        <div>
            <h5 className="text-xs font-semibold text-gray-700 mb-1 mt-2">{label}</h5>
            <div className="bg-gray-50 rounded-lg p-3 space-y-0">
                <ParamRow label="Характеристика" value={eye.characteristic ? (CharacteristicLabels[eye.characteristic as Characteristic] || eye.characteristic) : null} />
                <ParamRow label="Km" value={eye.km} />
                <ParamRow label="TP" value={eye.tp} />
                <ParamRow label="DIA" value={eye.dia} />
                <ParamRow label="E" value={eye.e1 != null ? `${eye.e1}${eye.e2 != null ? ' / ' + eye.e2 : ''}` : null} />
                {eye.tor != null && <ParamRow label="Тог." value={eye.tor} />}
                <ParamRow label="Dk" value={eye.dk} />
                <ParamRow label="Цвет" value={eye.color || null} />
                <ParamRow label="Апик. клиренс" value={eye.apical_clearance} />
                <ParamRow label="Фактор компр." value={eye.compression_factor} />
                <ParamRow label="Кол-во" value={eye.qty} />
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-surface">
            {/* Header */}
            <div className="bg-surface-elevated border-b border-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                {session?.user?.profile?.opticName || session?.user?.profile?.clinic || 'Мои заказы'}
                            </h1>
                            <p className="text-gray-600 mt-1">{session?.user?.profile?.fullName || SubRoleLabels[subRole]}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {perms.canCreateOrders && (
                                <Link href="/optic/orders/new" className="btn btn-primary gap-2">
                                    <Plus className="w-5 h-5" />
                                    Создать заказ
                                </Link>
                            )}
                            <Link
                                href="/profile"
                                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-500 transition-colors py-2 px-3 rounded-lg hover:bg-blue-50"
                            >
                                <User className="w-4 h-4" />
                                Профиль
                            </Link>
                            <button
                                onClick={() => signOut({ callbackUrl: '/login' })}
                                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 transition-colors py-2 px-3 rounded-lg hover:bg-red-50"
                            >
                                <LogOut className="w-4 h-4" />
                                Выйти
                            </button>
                        </div>
                    </div>

                    {/* Stats */}
                    {perms.canViewStats && (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
                            {[
                                { label: 'Всего', value: stats.total, icon: Package, bg: 'bg-gray-100', text: 'text-gray-600' },
                                { label: 'Новые', value: stats.new, icon: Clock, bg: 'bg-blue-100', text: 'text-blue-600' },
                                { label: 'В работе', value: stats.in_production, icon: TruckIcon, bg: 'bg-yellow-100', text: 'text-yellow-600' },
                                { label: 'Готовы', value: stats.ready, icon: CheckCircle, bg: 'bg-green-100', text: 'text-green-600' },
                                { label: 'Отгружены', value: stats.shipped, icon: TruckIcon, bg: 'bg-purple-100', text: 'text-purple-600' },
                            ].map(s => (
                                <div key={s.label} className="card">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-lg ${s.bg} ${s.text} flex items-center justify-center`}>
                                            <s.icon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">{s.label}</p>
                                            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Filters & Orders */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                {/* Search + Filter Controls */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Поиск по номеру, пациенту, врачу..."
                            className="input pl-10 w-full"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Sort */}
                    <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value as SortOption)}
                        className="input w-auto min-w-[180px]"
                    >
                        {Object.entries(SortLabels).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                        ))}
                    </select>

                    {/* Toggle advanced filters */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'} gap-2 whitespace-nowrap`}
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                        Фильтры
                    </button>
                </div>

                {/* Advanced Filters Panel */}
                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden mb-6"
                        >
                            <div className="card bg-blue-50/50 border border-blue-100">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {/* Date From */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                            <Calendar className="w-3.5 h-3.5 inline mr-1" />
                                            Дата от
                                        </label>
                                        <input
                                            type="date"
                                            value={dateFrom}
                                            onChange={e => setDateFrom(e.target.value)}
                                            className="input w-full"
                                        />
                                    </div>

                                    {/* Date To */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                            <Calendar className="w-3.5 h-3.5 inline mr-1" />
                                            Дата до
                                        </label>
                                        <input
                                            type="date"
                                            value={dateTo}
                                            onChange={e => setDateTo(e.target.value)}
                                            className="input w-full"
                                        />
                                    </div>

                                    {/* Clear filters */}
                                    <div className="flex items-end">
                                        {hasActiveFilters && (
                                            <button
                                                onClick={clearFilters}
                                                className="btn btn-secondary text-sm gap-1 w-full"
                                            >
                                                <X className="w-4 h-4" />
                                                Сбросить всё
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Status Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto">
                    {(['all', 'new', 'in_production', 'ready', 'shipped'] as const).map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`
                                px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all
                                ${filter === status
                                    ? 'bg-primary-500 text-white shadow-sm'
                                    : 'bg-surface-elevated text-gray-700 hover:bg-surface-secondary'}
                            `}
                        >
                            {status === 'all' ? 'Все' : OrderStatusLabels[status]}
                            <span className="ml-1.5 text-xs opacity-70">
                                {status === 'all' ? orders.length : orders.filter(o => o.status === status).length}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Results count */}
                <p className="text-sm text-gray-500 mb-4">
                    Найдено: {filteredOrders.length} {filteredOrders.length === 1 ? 'заказ' : filteredOrders.length < 5 ? 'заказа' : 'заказов'}
                </p>

                {/* Orders List */}
                {isLoading ? (
                    <div className="grid gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="card">
                                <div className="skeleton h-20" />
                            </div>
                        ))}
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="text-center py-16">
                        <Package className="w-14 h-14 text-gray-300 mx-auto mb-4" />
                        <p className="text-lg text-gray-600 mb-2">Заказов не найдено</p>
                        {hasActiveFilters && (
                            <button onClick={clearFilters} className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                                Сбросить фильтры
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {filteredOrders.map((order) => {
                            const isExpanded = expandedOrders.has(order.order_id);
                            const od = order.config.eyes.od;
                            const os = order.config.eyes.os;
                            const totalLenses = (Number(od.qty) || 0) + (Number(os.qty) || 0);
                            const totalPrice = order.total_price || totalLenses * PRICE_PER_LENS;

                            return (
                                <motion.div
                                    key={order.order_id}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="card card-hover"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-lg font-semibold text-gray-900">{order.order_id}</h3>
                                                {/* Hide internal 'rework' status from optic — show as "В производстве" */}
                                                {(() => {
                                                    const displayStatus = order.status === 'rework' ? 'in_production' : order.status;
                                                    return (
                                                        <span className={`badge ${OrderStatusColors[displayStatus]}`}>
                                                            {OrderStatusLabels[displayStatus]}
                                                        </span>
                                                    );
                                                })()}
                                                {/* Urgent badge */}
                                                {order.is_urgent && (
                                                    <span className="badge bg-amber-100 text-amber-700 flex items-center gap-1">
                                                        <Zap className="w-3 h-3" /> СРОЧНО
                                                    </span>
                                                )}
                                                {perms.canViewPayments && (() => {
                                                    const ps = (order as any).payment_status || 'unpaid';
                                                    return (
                                                        <span className={`badge flex items-center gap-1.5 ${PaymentStatusColors[ps as PaymentStatus]}`}>
                                                            <span className={`w-2 h-2 rounded-full ${ps === 'paid' ? 'bg-emerald-500' : ps === 'partial' ? 'bg-amber-500' : 'bg-gray-400'
                                                                }`} />
                                                            {PaymentStatusLabels[ps as PaymentStatus]}
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                                                <span>Пациент: <strong>{order.patient.name}</strong></span>
                                                {order.meta.doctor && (
                                                    <span className="flex items-center gap-1">
                                                        <User className="w-3.5 h-3.5" />
                                                        {order.meta.doctor}
                                                    </span>
                                                )}
                                                <span>Тип: MediLens</span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mt-1">
                                                <span>OD: Km {od.km} | DIA {od.dia} | Dk {od.dk}</span>
                                                <span>OS: Km {os.km} | DIA {os.dia} | Dk {os.dk}</span>
                                            </div>
                                        </div>
                                        <div className="text-right text-sm text-gray-500 ml-4 flex-shrink-0">
                                            <p>{new Date(order.meta.created_at).toLocaleDateString('ru-RU')}</p>
                                            <p className="text-base font-semibold text-gray-900 mt-1">
                                                {canSeePrices ? `${totalPrice.toLocaleString('ru-RU')} ₸` : ''}
                                            </p>
                                            {order.tracking_number && (
                                                <p className="font-mono text-xs mt-1">{order.tracking_number}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Expand / Actions row */}
                                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
                                        <button
                                            onClick={() => toggleExpand(order.order_id)}
                                            className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors"
                                        >
                                            <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                            {isExpanded ? 'Свернуть' : 'Подробнее'}
                                        </button>

                                        {/* out_for_delivery: prominent confirmation button */}
                                        {order.status === 'out_for_delivery' && (
                                            <div className="mb-3">
                                                <div className="flex items-center gap-2 text-xs text-purple-700 bg-purple-50 rounded-lg px-3 py-2 mb-2">
                                                    <Truck className="w-3.5 h-3.5" />
                                                    Курьер доставляет ваш заказ
                                                </div>
                                                <button
                                                    onClick={() => confirmDelivery(order.order_id)}
                                                    className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold py-2.5 px-4 rounded-xl transition-colors"
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                    Подтвердить получение
                                                </button>
                                            </div>
                                        )}

                                        {/* delivered: confirmation banner */}
                                        {order.status === 'delivered' && (
                                            <div className="flex items-center gap-2 text-xs text-teal-700 bg-teal-50 rounded-lg px-3 py-2 mb-3">
                                                <CheckCircle className="w-3.5 h-3.5" />
                                                <span>Доставлен — вы подтвердили получение</span>
                                                {order.delivered_at && (
                                                    <span className="ml-auto text-teal-500">{new Date(order.delivered_at).toLocaleDateString('ru-RU')}</span>
                                                )}
                                            </div>
                                        )}

                                        {/* Edit window indicator */}
                                        {(() => {
                                            const editable = canEditOrder(order);
                                            const remainMs = editWindowRemainingMs(order);
                                            const countdown = formatCountdown(remainMs);
                                            if (order.status !== 'new') {
                                                // show lock only if in non-editable production states
                                                if (['in_production', 'ready', 'rework', 'shipped', 'cancelled'].includes(order.status)) {
                                                    return (
                                                        <span className="flex items-center gap-1 text-xs text-gray-400">
                                                            <Lock className="w-3.5 h-3.5" />
                                                            В производстве
                                                        </span>
                                                    );
                                                }
                                                return null; // out_for_delivery and delivered have banners above
                                            }
                                            if (editable) {
                                                return (
                                                    <>
                                                        <Link
                                                            href={`/optic/orders/${order.order_id}/edit`}
                                                            className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                            Редактировать
                                                        </Link>
                                                        {countdown && !order.is_urgent && (
                                                            <span className="text-xs text-amber-600 flex items-center gap-1">
                                                                <Clock className="w-3.5 h-3.5" />
                                                                ещё {countdown}
                                                            </span>
                                                        )}
                                                    </>
                                                );
                                            }
                                            return (
                                                <span className="flex items-center gap-1 text-xs text-gray-400">
                                                    <Lock className="w-3.5 h-3.5" />
                                                    Окно редактирования закрыто
                                                </span>
                                            );
                                        })()}

                                        {perms.canViewPayments && (
                                            <button
                                                onClick={() => handlePrintInvoice(order)}
                                                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors ml-auto"
                                            >
                                                <FileText className="w-3.5 h-3.5" />
                                                Счёт
                                            </button>
                                        )}
                                    </div>

                                    {/* Expanded details */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="border-t border-gray-100 pt-4 mt-3">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                                                        <div className="space-y-1.5">
                                                            <p><span className="text-gray-400">Телефон:</span> {order.patient.phone}</p>
                                                            {order.company && <p><span className="text-gray-400">Компания:</span> {order.company}</p>}
                                                            {order.inn && <p><span className="text-gray-400">ИНН:</span> {order.inn}</p>}
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            {order.delivery_method && <p><span className="text-gray-400">Доставка:</span> {order.delivery_method}</p>}
                                                            {order.delivery_address && <p><span className="text-gray-400">Адрес:</span> {order.delivery_address}</p>}
                                                            {order.notes && <p><span className="text-gray-400">Примечания:</span> {order.notes}</p>}
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <EyeBlock label="OD (Правый глаз)" eye={od} />
                                                        <EyeBlock label="OS (Левый глаз)" eye={os} />
                                                    </div>

                                                    {canSeePrices && (
                                                        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 mt-4">
                                                            <div className="text-sm text-gray-600">
                                                                <span>OD: {Number(od.qty)} × {PRICE_PER_LENS.toLocaleString('ru-RU')} ₸</span>
                                                                <span className="mx-2">+</span>
                                                                <span>OS: {Number(os.qty)} × {PRICE_PER_LENS.toLocaleString('ru-RU')} ₸</span>
                                                            </div>
                                                            <span className="text-lg font-bold text-primary-600">
                                                                {totalPrice.toLocaleString('ru-RU')} ₸
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
