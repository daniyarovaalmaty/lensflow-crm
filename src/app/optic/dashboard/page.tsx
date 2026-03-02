'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Package, Clock, CheckCircle, TruckIcon,
    Search, SlidersHorizontal, ChevronDown, ArrowUpDown,
    Download, FileText, Printer, User, Calendar, X, Zap, Pencil, Lock, Truck, MapPin, LogOut, Users, Building2, Menu
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
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
                (o.meta.doctor || '').toLowerCase().includes(q) ||
                (o.company || '').toLowerCase().includes(q)
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
        const additionalProducts = (order as any).products || [];
        const discountPct = (order as any).discount_percent ?? 5;
        const isUrgent = order.is_urgent;
        const URGENT_PCT = 25;
        const dateStr = new Date(order.meta.created_at).toLocaleDateString('ru-RU');
        const fmt = (n: number) => n.toLocaleString('ru-RU');

        // Per-eye prices from order data (with fallback to PRICE_PER_LENS for old orders)
        const odUnitPrice = (order as any).price_od || (odQty > 0 ? PRICE_PER_LENS : 0);
        const osUnitPrice = (order as any).price_os || (osQty > 0 ? PRICE_PER_LENS : 0);

        // Build rows
        let rows = '';
        let rowNum = 1;
        let subtotal = 0;

        if (odQty > 0) {
            const lineTotal = odQty * odUnitPrice;
            subtotal += lineTotal;
            rows += `<tr>
                <td style="padding:10px 14px;border:1px solid #e5e7eb;text-align:center;">${rowNum++}</td>
                <td style="padding:10px 14px;border:1px solid #e5e7eb;">${(order as any).document_name_od || 'MediLens \u2014 OD'}</td>
                <td style="padding:10px 14px;border:1px solid #e5e7eb;text-align:center;font-size:12px;">Km ${od.km || '\u2014'}, DIA ${od.dia || '\u2014'}, Dk ${od.dk || '\u2014'}</td>
                <td style="padding:10px 14px;border:1px solid #e5e7eb;text-align:center;">${odQty}</td>
                <td style="padding:10px 14px;border:1px solid #e5e7eb;text-align:right;">${fmt(odUnitPrice)} \u20b8</td>
                <td style="padding:10px 14px;border:1px solid #e5e7eb;text-align:right;font-weight:600;">${fmt(lineTotal)} \u20b8</td>
            </tr>`;
        }
        if (osQty > 0) {
            const lineTotal = osQty * osUnitPrice;
            subtotal += lineTotal;
            rows += `<tr>
                <td style="padding:10px 14px;border:1px solid #e5e7eb;text-align:center;">${rowNum++}</td>
                <td style="padding:10px 14px;border:1px solid #e5e7eb;">${(order as any).document_name_os || 'MediLens \u2014 OS'}</td>
                <td style="padding:10px 14px;border:1px solid #e5e7eb;text-align:center;font-size:12px;">Km ${os.km || '\u2014'}, DIA ${os.dia || '\u2014'}, Dk ${os.dk || '\u2014'}</td>
                <td style="padding:10px 14px;border:1px solid #e5e7eb;text-align:center;">${osQty}</td>
                <td style="padding:10px 14px;border:1px solid #e5e7eb;text-align:right;">${fmt(osUnitPrice)} \u20b8</td>
                <td style="padding:10px 14px;border:1px solid #e5e7eb;text-align:right;font-weight:600;">${fmt(lineTotal)} \u20b8</td>
            </tr>`;
        }

        // Additional products (accessories, solutions)
        for (const prod of additionalProducts) {
            const pPrice = prod.price || 0;
            const pQty = prod.qty || 1;
            const lineTotal = pPrice * pQty;
            subtotal += lineTotal;
            rows += `<tr>
                <td style="padding:10px 14px;border:1px solid #e5e7eb;text-align:center;">${rowNum++}</td>
                <td style="padding:10px 14px;border:1px solid #e5e7eb;">${prod.name}</td>
                <td style="padding:10px 14px;border:1px solid #e5e7eb;text-align:center;">\u2014</td>
                <td style="padding:10px 14px;border:1px solid #e5e7eb;text-align:center;">${pQty}</td>
                <td style="padding:10px 14px;border:1px solid #e5e7eb;text-align:right;">${fmt(pPrice)} \u20b8</td>
                <td style="padding:10px 14px;border:1px solid #e5e7eb;text-align:right;font-weight:600;">${fmt(lineTotal)} \u20b8</td>
            </tr>`;
        }

        // Discount & totals
        const discountAmt = Math.round(subtotal * discountPct / 100);
        const afterDiscount = subtotal - discountAmt;
        const urgentAmt = isUrgent ? Math.round(afterDiscount * URGENT_PCT / 100) : 0;
        const grandTotal = order.total_price || (afterDiscount + urgentAmt);

        const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>\u0421\u0447\u0451\u0442 ${order.order_id}</title>
<style>body{font-family:'Segoe UI',Arial,sans-serif;max-width:800px;margin:0 auto;padding:30px;color:#111}
.header{display:flex;justify-content:space-between;border-bottom:3px solid #2563eb;padding-bottom:16px;margin-bottom:24px}
.logo{font-size:22px;font-weight:700;color:#2563eb}.invoice-num{font-size:18px;font-weight:700;text-align:right}
.invoice-date{font-size:13px;color:#6b7280;text-align:right;margin-top:4px}
table{width:100%;border-collapse:collapse;margin:20px 0}th{background:#f3f4f6;padding:10px 14px;border:1px solid #e5e7eb;font-size:11px;text-transform:uppercase;letter-spacing:0.5px}
.totals{text-align:right;margin:16px 0;font-size:14px;line-height:2}
.totals .label{color:#6b7280;margin-right:20px}.totals .discount{color:#059669}
.totals .surcharge{color:#d97706}
.totals .grand{font-size:20px;font-weight:700;border-top:2px solid #e5e7eb;padding-top:8px;margin-top:8px}
@media print{body{padding:0}}</style></head><body>
<div class="header"><div><div class="logo">LensFlow</div></div><div><div class="invoice-num">\u0421\u0447\u0451\u0442 \u2116${order.order_id}</div><div class="invoice-date">\u043e\u0442 ${dateStr}</div></div></div>
<p><strong>\u041f\u0430\u0446\u0438\u0435\u043d\u0442:</strong> ${order.patient.name} | <strong>\u0412\u0440\u0430\u0447:</strong> ${order.meta.doctor || '\u2014'}${order.company ? ' | <strong>\u041a\u043e\u043c\u043f\u0430\u043d\u0438\u044f:</strong> ' + order.company : ''}</p>
<table><thead><tr><th style="width:30px">\u2116</th><th>\u041d\u0430\u0438\u043c\u0435\u043d\u043e\u0432\u0430\u043d\u0438\u0435</th><th style="text-align:center">\u041f\u0430\u0440\u0430\u043c\u0435\u0442\u0440\u044b</th><th style="text-align:center">\u041a\u043e\u043b-\u0432\u043e</th><th style="text-align:right">\u0426\u0435\u043d\u0430</th><th style="text-align:right">\u0421\u0443\u043c\u043c\u0430</th></tr></thead><tbody>
${rows}
</tbody></table>
<div class="totals">
<div><span class="label">\u0421\u0443\u043c\u043c\u0430 \u0431\u0435\u0437 \u0441\u043a\u0438\u0434\u043a\u0438:</span> ${fmt(subtotal)} \u20b8</div>
<div class="discount"><span class="label">\u0421\u043a\u0438\u0434\u043a\u0430 ${discountPct}%:</span> -${fmt(discountAmt)} \u20b8</div>
${isUrgent ? `<div class="surcharge"><span class="label">\u0421\u0440\u043e\u0447\u043d\u043e\u0441\u0442\u044c +${URGENT_PCT}%:</span> +${fmt(urgentAmt)} \u20b8</div>` : ''}
<div class="grand"><span class="label">\u0418\u0442\u043e\u0433\u043e:</span> ${fmt(grandTotal)} \u20b8</div>
</div>
</body></html>`;

        // Generate PDF using html2pdf.js
        const container = document.createElement('div');
        container.innerHTML = html;
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        document.body.appendChild(container);

        import('html2pdf.js').then(({ default: html2pdf }) => {
            html2pdf().set({
                margin: [10, 10, 10, 10],
                filename: `Счёт_${order.order_id}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            }).from((container.firstElementChild || container) as HTMLElement).save().then(() => {
                document.body.removeChild(container);
            });
        });
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
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
                    <div className="flex items-center justify-between">
                        <div className="min-w-0">
                            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
                                {session?.user?.profile?.opticName || session?.user?.profile?.clinic || 'Мои заказы'}
                            </h1>
                            <p className="text-sm sm:text-base text-gray-600 mt-0.5 sm:mt-1 truncate">{session?.user?.profile?.fullName || SubRoleLabels[subRole]}</p>
                        </div>

                        {/* Desktop nav */}
                        <div className="hidden md:flex items-center gap-3">
                            {perms.canCreateOrders && (
                                <Link href="/optic/orders/new" className="btn btn-primary gap-2">
                                    <Plus className="w-5 h-5" />
                                    Создать заказ
                                </Link>
                            )}
                            {subRole === 'optic_manager' && (
                                <Link
                                    href="/optic/staff"
                                    className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-500 transition-colors py-2 px-3 rounded-lg hover:bg-blue-50"
                                >
                                    <Users className="w-4 h-4" />
                                    Сотрудники
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

                        {/* Mobile: create + hamburger */}
                        <div className="flex md:hidden items-center gap-2">
                            {perms.canCreateOrders && (
                                <Link href="/optic/orders/new" className="btn btn-primary gap-1.5 text-sm px-3 py-2">
                                    <Plus className="w-4 h-4" />
                                    <span className="hidden xs:inline">Заказ</span>
                                </Link>
                            )}
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Mobile dropdown menu */}
                    {mobileMenuOpen && (
                        <div className="md:hidden border-t border-gray-100 mt-3 pt-3 space-y-1">
                            {subRole === 'optic_manager' && (
                                <Link
                                    href="/optic/staff"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
                                >
                                    <Users className="w-4 h-4" />
                                    Сотрудники
                                </Link>
                            )}
                            <Link
                                href="/profile"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
                            >
                                <User className="w-4 h-4" />
                                Профиль
                            </Link>
                            <button
                                onClick={() => { setMobileMenuOpen(false); signOut({ callbackUrl: '/login' }); }}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 w-full text-left"
                            >
                                <LogOut className="w-4 h-4" />
                                Выйти
                            </button>
                        </div>
                    )}

                    {/* Stats */}
                    {perms.canViewStats && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-4 mt-4 sm:mt-6">
                            {[
                                { label: 'Всего', value: stats.total, icon: Package, bg: 'bg-gray-100', text: 'text-gray-600' },
                                { label: 'Новые', value: stats.new, icon: Clock, bg: 'bg-blue-100', text: 'text-blue-600' },
                                { label: 'В работе', value: stats.in_production, icon: TruckIcon, bg: 'bg-yellow-100', text: 'text-yellow-600' },
                                { label: 'Готовы', value: stats.ready, icon: CheckCircle, bg: 'bg-green-100', text: 'text-green-600' },
                                { label: 'Отгружены', value: stats.shipped, icon: TruckIcon, bg: 'bg-purple-100', text: 'text-purple-600' },
                            ].map(s => (
                                <div key={s.label} className="card !p-3 sm:!p-4">
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg ${s.bg} ${s.text} flex items-center justify-center`}>
                                            <s.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs sm:text-sm text-gray-600">{s.label}</p>
                                            <p className="text-lg sm:text-2xl font-bold text-gray-900">{s.value}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Filters & Orders */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
                {/* Search + Filter Controls */}
                <div className="flex flex-col sm:flex-row gap-3 mb-4 sm:mb-6">
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
                        className="input w-full sm:w-auto sm:min-w-[180px]"
                    >
                        {Object.entries(SortLabels).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                        ))}
                    </select>
                </div>

                {/* Date Filters — always visible */}
                <div className="flex flex-wrap items-end gap-2 sm:gap-3 mb-4 sm:mb-6">
                    <div className="flex-1 min-w-[130px]">
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                            <Calendar className="w-3.5 h-3.5 inline mr-1" />Дата от
                        </label>
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input w-full" />
                    </div>
                    <div className="flex-1 min-w-[130px]">
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                            <Calendar className="w-3.5 h-3.5 inline mr-1" />Дата до
                        </label>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input w-full" />
                    </div>
                    {hasActiveFilters && (
                        <button onClick={clearFilters} className="btn btn-secondary text-sm gap-1">
                            <X className="w-4 h-4" /> Сбросить
                        </button>
                    )}
                </div>


                {/* Status Tabs */}
                <div className="flex gap-2 mb-4 sm:mb-6 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
                    {(['all', 'new', 'in_production', 'ready', 'shipped'] as const).map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`
                                px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all flex-shrink-0
                                ${filter === status
                                    ? 'bg-primary-500 text-white shadow-sm'
                                    : 'bg-surface-elevated text-gray-700 hover:bg-surface-secondary'}
                            `}
                        >
                            {status === 'all' ? 'Все' : OrderStatusLabels[status]}
                            <span className="ml-1 sm:ml-1.5 text-xs opacity-70">
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
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                                <h3 className="text-base sm:text-lg font-semibold text-gray-900">{order.order_id}</h3>
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
                                                {order.company && (
                                                    <span className="flex items-center gap-1">
                                                        <Building2 className="w-3.5 h-3.5" />
                                                        {order.company}
                                                    </span>
                                                )}
                                                <span>Тип: MediLens</span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mt-1">
                                                <span>OD: Km {od.km} | DIA {od.dia} | Dk {od.dk}</span>
                                                <span>OS: Km {os.km} | DIA {os.dia} | Dk {os.dk}</span>
                                            </div>
                                        </div>
                                        <div className="text-left sm:text-right text-sm text-gray-500 sm:ml-4 flex-shrink-0 flex sm:block items-center gap-3">
                                            <p>{new Date(order.meta.created_at).toLocaleDateString('ru-RU')}</p>
                                            <p className="text-base font-semibold text-gray-900 sm:mt-1">
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

                                                    {/* Additional products */}
                                                    {(order as any).products?.length > 0 && (
                                                        <div className="mt-4">
                                                            <h5 className="text-xs font-semibold text-gray-700 mb-2">Дополнительные товары</h5>
                                                            <div className="bg-gray-50 rounded-lg divide-y divide-gray-100">
                                                                {((order as any).products as Array<{ name: string; qty: number; price: number; category?: string }>).map((prod, idx) => (
                                                                    <div key={idx} className="flex items-center justify-between px-3 py-2 text-sm">
                                                                        <div>
                                                                            <span className="text-gray-800 font-medium">{prod.name}</span>
                                                                            <span className="text-gray-400 ml-2">× {prod.qty}</span>
                                                                        </div>
                                                                        {canSeePrices && (
                                                                            <span className="text-gray-600">{((prod.price || 0) * (prod.qty || 1)).toLocaleString('ru-RU')} ₸</span>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {canSeePrices && (
                                                        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 mt-4">
                                                            <div className="text-sm text-gray-600 space-y-0.5">
                                                                <div>
                                                                    <span>OD: {Number(od.qty)} × {PRICE_PER_LENS.toLocaleString('ru-RU')} ₸</span>
                                                                    <span className="mx-2">+</span>
                                                                    <span>OS: {Number(os.qty)} × {PRICE_PER_LENS.toLocaleString('ru-RU')} ₸</span>
                                                                </div>
                                                                {(order as any).products?.length > 0 && (
                                                                    <div className="text-xs text-gray-400">
                                                                        + доп. товары: {((order as any).products as Array<{ price: number; qty: number }>).reduce((s: number, p: any) => s + (p.price || 0) * (p.qty || 1), 0).toLocaleString('ru-RU')} ₸
                                                                    </div>
                                                                )}
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
