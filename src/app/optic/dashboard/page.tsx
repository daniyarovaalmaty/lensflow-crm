'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/dateUtils';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Package, Clock, CheckCircle, TruckIcon, Search, SlidersHorizontal, ChevronDown, ArrowUpDown, Download, FileText, Printer, User, Calendar, X, Zap, Pencil, Lock, Truck, MapPin, LogOut, Users, Building2, Menu, MessageSquarePlus, MessageCircle, Send, Warehouse, ShoppingCart, Target, XCircle, FileEdit } from 'lucide-react';
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
    const router = useRouter();
    const subRole = (session?.user?.subRole || 'optic_manager') as SubRole;
    const perms = getPermissions(subRole);
    const canSeePrices = subRole !== 'optic_doctor';

    // Redirect laboratory roles to their proper pages
    useEffect(() => {
        if (!session?.user) return;
        const role = session.user.role;
        if (role === 'laboratory') {
            const sr = session.user.subRole;
            if (sr === 'lab_accountant') {
                router.replace('/laboratory/accountant');
            } else {
                router.replace('/laboratory/production');
            }
        }
    }, [session, router]);

    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<OrderStatus | 'all' | 'unpaid'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<SortOption>('newest');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [sendingComment, setSendingComment] = useState(false);
    const [requestType, setRequestType] = useState<'comment' | 'request_edit' | 'request_cancel'>('comment');
    const [showRequestModal, setShowRequestModal] = useState<string | null>(null);
    const [requestReason, setRequestReason] = useState('');
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
        if (filter === 'unpaid') {
            result = result.filter(o => (o as any).payment_status !== 'paid');
        } else if (filter !== 'all') {
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
        import('@/lib/generateInvoicePdf').then(({ generateInvoicePdf }) => {
            generateInvoicePdf({
                order_id: order.order_id,
                patient: order.patient,
                meta: order.meta,
                company: order.company,
                config: order.config,
                is_urgent: order.is_urgent,
                total_price: order.total_price,
                discount_percent: (order as any).discount_percent,
                document_name_od: (order as any).document_name_od,
                document_name_os: (order as any).document_name_os,
                price_od: (order as any).price_od,
                price_os: (order as any).price_os,
                products: (order as any).products,
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
                                <>
                                    <Link
                                        href="/optic/catalog"
                                        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-500 transition-colors py-2 px-3 rounded-lg hover:bg-blue-50"
                                    >
                                        <Package className="w-4 h-4" />
                                        Каталог
                                    </Link>
                                    <Link
                                        href="/optic/warehouse"
                                        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-500 transition-colors py-2 px-3 rounded-lg hover:bg-blue-50"
                                    >
                                        <Warehouse className="w-4 h-4" />
                                        Склад
                                    </Link>
                                    <Link
                                        href="/optic/pos"
                                        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-500 transition-colors py-2 px-3 rounded-lg hover:bg-blue-50"
                                    >
                                        <ShoppingCart className="w-4 h-4" />
                                        Касса
                                    </Link>
                                    <Link
                                        href="/optic/staff"
                                        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-500 transition-colors py-2 px-3 rounded-lg hover:bg-blue-50"
                                    >
                                        <Users className="w-4 h-4" />
                                        Сотрудники
                                    </Link>
                                </>
                            )}
                            <Link
                                href="/sales/pipeline"
                                className="flex items-center gap-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors py-2 px-3 rounded-lg"
                            >
                                <Target className="w-4 h-4" />
                                CRM Продажи
                            </Link>
                            <Link
                                href="/profile"
                                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-500 transition-colors py-2 px-3 rounded-lg hover:bg-blue-50"
                            >
                                <User className="w-4 h-4" />
                                Профиль
                            </Link>
                            <Link
                                href="/support"
                                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-500 transition-colors py-2 px-3 rounded-lg hover:bg-blue-50"
                            >
                                <MessageSquarePlus className="w-4 h-4" />
                                Поддержка
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
                                <>
                                    <Link
                                        href="/optic/catalog"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
                                    >
                                        <Package className="w-4 h-4" />
                                        Каталог
                                    </Link>
                                    <Link
                                        href="/optic/warehouse"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
                                    >
                                        <Warehouse className="w-4 h-4" />
                                        Склад
                                    </Link>
                                    <Link
                                        href="/optic/pos"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
                                    >
                                        <ShoppingCart className="w-4 h-4" />
                                        Касса
                                    </Link>
                                    <Link
                                        href="/optic/staff"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
                                    >
                                        <Users className="w-4 h-4" />
                                        Сотрудники
                                    </Link>
                                </>
                            )}
                            <Link
                                href="/sales/pipeline"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                            >
                                <Target className="w-4 h-4" />
                                CRM Продажи
                            </Link>
                            <Link
                                href="/profile"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
                            >
                                <User className="w-4 h-4" />
                                Профиль
                            </Link>
                            <Link
                                href="/support"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
                            >
                                <MessageSquarePlus className="w-4 h-4" />
                                Поддержка
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
                    <button
                        onClick={() => setFilter('unpaid')}
                        className={`
                            px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all flex-shrink-0
                            ${filter === 'unpaid'
                                ? 'bg-red-500 text-white shadow-sm'
                                : 'bg-red-50 text-red-600 hover:bg-red-100'}
                        `}
                    >
                        Неоплаченные
                        <span className="ml-1 sm:ml-1.5 text-xs opacity-70">
                            {orders.filter(o => (o as any).payment_status !== 'paid').length}
                        </span>
                    </button>
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
                            const odQty = Number(od.qty) || 0;
                            const osQty = Number(os.qty) || 0;
                            const odPrice = (order as any).price_od ?? PRICE_PER_LENS;
                            const osPrice = (order as any).price_os ?? PRICE_PER_LENS;
                            const lensTotal = (odQty * odPrice) + (osQty * osPrice);
                            const additionalTotal = ((order as any).products || []).reduce((sum: number, p: any) => sum + (p.price || 0) * (p.qty || 1), 0);
                            const discountAmt = Math.round((lensTotal + additionalTotal) * ((order as any).discount_percent || 0) / 100);
                            const afterDiscount = (lensTotal + additionalTotal) - discountAmt;
                            const urgentAmt = order.is_urgent ? Math.round(afterDiscount * 25 / 100) : 0;
                            const totalPrice = order.total_price || (afterDiscount + urgentAmt);

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
                                                            <span className={`w-2 h-2 rounded-full ${ps === 'paid' ? 'bg-emerald-500' : ps === 'partial' ? 'bg-amber-500' : 'bg-gray-400'}`} />
                                                            {PaymentStatusLabels[ps as PaymentStatus]}
                                                        </span>
                                                    );
                                                })()}
                                                {/* Comment notification from lab */}
                                                {(() => {
                                                    const comments = (order as any).comments || [];
                                                    if (comments.length === 0) return null;
                                                    const last = comments[comments.length - 1];
                                                    if (last.role !== 'laboratory') return null;
                                                    return (
                                                        <span className="badge bg-blue-100 text-blue-700 flex items-center gap-1 animate-comment-blink">
                                                            <MessageCircle className="w-3 h-3" />
                                                            Комментарий от лаборатории
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
                                            <p>{formatDate(order.meta.created_at)}</p>
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
                                                    <span className="ml-auto text-teal-500">{formatDate(order.delivered_at)}</span>
                                                )}
                                            </div>
                                        )}

                                        {/* Edit window indicator */}
                                        {(() => {
                                            const editable = canEditOrder(order);
                                            const remainMs = editWindowRemainingMs(order);
                                            const countdown = formatCountdown(remainMs);
                                            // Check pending requests
                                            const comments = ((order as any).comments || []) as any[];
                                            const hasPendingRequest = comments.some((c: any) => 
                                                ['request_edit', 'request_cancel'].includes(c.type) &&
                                                !comments.some((r: any) => ['approve_edit', 'approve_cancel', 'reject_request'].includes(r.type) && new Date(r.createdAt) > new Date(c.createdAt))
                                            );
                                            const lastAction = [...comments].reverse().find((c: any) => ['approve_edit', 'approve_cancel', 'reject_request'].includes(c.type));

                                            if (order.status === 'cancelled') {
                                                return (
                                                    <span className="flex items-center gap-1 text-xs text-red-400">
                                                        <X className="w-3.5 h-3.5" />
                                                        Заказ отменён
                                                    </span>
                                                );
                                            }
                                            if (order.status !== 'new') {
                                                // In production — show request buttons
                                                if (['in_production', 'ready', 'rework', 'shipped'].includes(order.status)) {
                                                    return (
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="flex items-center gap-1 text-xs text-gray-400">
                                                                <Lock className="w-3.5 h-3.5" />
                                                                В производстве
                                                            </span>
                                                            {!hasPendingRequest && (
                                                                <>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); setShowRequestModal(order.order_id); setRequestType('request_edit'); setRequestReason(''); }}
                                                                        className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
                                                                    >
                                                                        <Pencil className="w-3 h-3" /> Запросить ред.
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); setShowRequestModal(order.order_id); setRequestType('request_cancel'); setRequestReason(''); }}
                                                                        className="text-xs text-red-500 hover:text-red-600 font-medium flex items-center gap-1"
                                                                    >
                                                                        <X className="w-3 h-3" /> Запросить отмену
                                                                    </button>
                                                                </>
                                                            )}
                                                            {hasPendingRequest && (
                                                                <span className="text-xs text-amber-600 font-medium animate-comment-blink">⏳ Запрос отправлен</span>
                                                            )}
                                                        </div>
                                                    );
                                                }
                                                return null;
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
                                            // Edit window closed — show request buttons
                                            return (
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="flex items-center gap-1 text-xs text-gray-400">
                                                        <Lock className="w-3.5 h-3.5" />
                                                        Закрыто
                                                    </span>
                                                    {!hasPendingRequest && (
                                                        <>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setShowRequestModal(order.order_id); setRequestType('request_edit'); setRequestReason(''); }}
                                                                className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
                                                            >
                                                                <Pencil className="w-3 h-3" /> Запросить ред.
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setShowRequestModal(order.order_id); setRequestType('request_cancel'); setRequestReason(''); }}
                                                                className="text-xs text-red-500 hover:text-red-600 font-medium flex items-center gap-1"
                                                            >
                                                                <X className="w-3 h-3" /> Запросить отмену
                                                            </button>
                                                        </>
                                                    )}
                                                    {hasPendingRequest && (
                                                        <span className="text-xs text-amber-600 font-medium animate-comment-blink">⏳ Запрос отправлен</span>
                                                    )}
                                                    {lastAction?.type === 'reject_request' && (
                                                        <span className="text-xs text-red-500"><XCircle className="w-4 h-4 inline mr-1" /> Отклонено: {lastAction.text}</span>
                                                    )}
                                                </div>
                                            );
                                        })()}

                                        {/* Request modal */}
                                        {showRequestModal === order.order_id && (
                                            <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2" onClick={e => e.stopPropagation()}>
                                                <p className="text-sm font-medium text-amber-800">
                                                    {requestType === 'request_edit' ? '<FileEdit className="w-4 h-4 inline mr-1" /> Запрос на редактирование' : '<XCircle className="w-4 h-4 inline mr-1" /> Запрос на отмену заказа'}
                                                </p>
                                                <textarea
                                                    value={requestReason}
                                                    onChange={e => setRequestReason(e.target.value)}
                                                    placeholder="Укажите причину..."
                                                    className="w-full px-3 py-2 text-sm border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white"
                                                    rows={2}
                                                />
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={async () => {
                                                            if (!requestReason.trim()) return;
                                                            setSendingComment(true);
                                                            await fetch(`/api/orders/${(order as any).id}/comments`, {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ text: requestReason, type: requestType }),
                                                            });
                                                            setShowRequestModal(null);
                                                            setRequestReason('');
                                                            setSendingComment(false);
                                                            loadOrders();
                                                        }}
                                                        disabled={!requestReason.trim() || sendingComment}
                                                        className="flex-1 text-sm py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 font-medium"
                                                    >
                                                        Отправить запрос
                                                    </button>
                                                    <button
                                                        onClick={() => setShowRequestModal(null)}
                                                        className="text-sm py-2 px-4 bg-white text-gray-600 rounded-lg border border-gray-200 hover:bg-gray-50"
                                                    >
                                                        Отмена
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {perms.canViewPayments && (
                                            <button
                                                onClick={() => handlePrintInvoice(order)}
                                                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors ml-auto"
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                                Скачать счёт PDF
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
                                                                    <span>OD: {Number(od.qty)} × {((order as any).price_od ?? PRICE_PER_LENS).toLocaleString('ru-RU')} ₸</span>
                                                                    <span className="mx-2">+</span>
                                                                    <span>OS: {Number(os.qty)} × {((order as any).price_os ?? PRICE_PER_LENS).toLocaleString('ru-RU')} ₸</span>
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

                                                    {/* Comments Section */}
                                                    <div className="bg-gray-50 rounded-xl p-4 mt-4">
                                                        <h4 className="text-xs font-semibold text-gray-400 uppercase mb-3 flex items-center gap-1.5">
                                                            <MessageCircle className="w-3.5 h-3.5" />
                                                            Комментарии
                                                            {((order as any).comments?.length > 0) && (
                                                                <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded-full">
                                                                    {(order as any).comments.length}
                                                                </span>
                                                            )}
                                                        </h4>

                                                        {((order as any).comments?.length > 0) && (
                                                            <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                                                                {((order as any).comments as any[]).map((c: any, i: number) => {
                                                                    const typeLabels: Record<string, { label: string; cls: string }> = {
                                                                        request_edit: { label: '<FileEdit className="w-4 h-4 inline mr-1" /> Запрос ред.', cls: 'bg-amber-100 text-amber-700' },
                                                                        request_cancel: { label: '<XCircle className="w-4 h-4 inline mr-1" /> Запрос отмены', cls: 'bg-red-100 text-red-700' },
                                                                        approve_edit: { label: '<CheckCircle className="w-4 h-4 inline mr-1" /> Одобрено ред.', cls: 'bg-green-100 text-green-700' },
                                                                        approve_cancel: { label: '<CheckCircle className="w-4 h-4 inline mr-1" /> Отменён', cls: 'bg-red-100 text-red-700' },
                                                                        reject_request: { label: '<XCircle className="w-4 h-4 inline mr-1" /> Отклонено', cls: 'bg-gray-100 text-gray-700' },
                                                                    };
                                                                    const typeBadge = typeLabels[c.type];
                                                                    return (
                                                                    <div key={i} className={`text-xs rounded-lg p-2.5 ${
                                                                        c.role === 'laboratory'
                                                                            ? 'bg-blue-50 border border-blue-100 mr-4'
                                                                            : 'bg-white border border-gray-200 ml-4'
                                                                    }`}>
                                                                        <div className="flex items-center justify-between mb-1">
                                                                            <span className="font-semibold text-gray-700">
                                                                                {c.authorName}
                                                                                <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                                                                                    c.role === 'laboratory'
                                                                                        ? 'bg-blue-100 text-blue-600'
                                                                                        : 'bg-green-100 text-green-600'
                                                                                }`}>
                                                                                    {c.role === 'laboratory' ? 'Лаборатория' : 'Врач'}
                                                                                </span>
                                                                                {typeBadge && (
                                                                                    <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${typeBadge.cls}`}>
                                                                                        {typeBadge.label}
                                                                                    </span>
                                                                                )}
                                                                            </span>
                                                                            <span className="text-gray-400">
                                                                                {new Date(c.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-gray-600 whitespace-pre-wrap">{c.text}</p>
                                                                    </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}

                                                        <div className="flex gap-2">
                                                            <input
                                                                type="text"
                                                                value={commentText}
                                                                onChange={e => setCommentText(e.target.value)}
                                                                onKeyDown={e => {
                                                                    if (e.key === 'Enter' && commentText.trim() && !sendingComment) {
                                                                        e.preventDefault();
                                                                        setSendingComment(true);
                                                                        fetch(`/api/orders/${(order as any).id}/comments`, {
                                                                            method: 'POST',
                                                                            headers: { 'Content-Type': 'application/json' },
                                                                            body: JSON.stringify({ text: commentText }),
                                                                        }).then(res => {
                                                                            if (res.ok) { setCommentText(''); loadOrders(); }
                                                                        }).finally(() => setSendingComment(false));
                                                                    }
                                                                }}
                                                                placeholder="Ответить на комментарий..."
                                                                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                                disabled={sendingComment}
                                                            />
                                                            <button
                                                                onClick={() => {
                                                                    if (!commentText.trim() || sendingComment) return;
                                                                    setSendingComment(true);
                                                                    fetch(`/api/orders/${(order as any).id}/comments`, {
                                                                        method: 'POST',
                                                                        headers: { 'Content-Type': 'application/json' },
                                                                        body: JSON.stringify({ text: commentText }),
                                                                    }).then(res => {
                                                                        if (res.ok) { setCommentText(''); loadOrders(); }
                                                                    }).finally(() => setSendingComment(false));
                                                                }}
                                                                disabled={!commentText.trim() || sendingComment}
                                                                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                                            >
                                                                <Send className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
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
