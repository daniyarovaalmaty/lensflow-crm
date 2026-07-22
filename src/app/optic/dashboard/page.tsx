'use client';

import { useState, useEffect, useMemo, useRef, useCallback, ReactNode } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/dateUtils';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Package, Clock, Check, CheckCircle, TruckIcon, Search, SlidersHorizontal, ChevronDown, ArrowUpDown, Download, FileText, Printer, User, Calendar, X, Zap, Pencil, Lock, Truck, MapPin, LogOut, Users, Building2, Menu, MessageSquarePlus, MessageCircle, Send, Warehouse, ShoppingCart, Target, XCircle, FileEdit, Link2, Banknote, Loader2, Wallet } from 'lucide-react';
import type { Order, OrderStatus, Characteristic } from '@/types/order';
import { OrderStatusLabels, OrderStatusColors, CharacteristicLabels, PaymentStatusLabels, PaymentStatusColors, canEditOrder, editWindowRemainingMs } from '@/types/order';
import type { PaymentStatus } from '@/types/order';
import { getPermissions, SubRoleLabels, getEffectiveClinicPermissions } from '@/types/user';
import type { SubRole } from '@/types/user';
import FullscreenButton from '@/components/ui/FullscreenButton';
import QuickNav from '@/components/ui/QuickNav';
import DoctorCalendar from '@/components/calendar/DoctorCalendar';

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
    
    // Dynamic clinic permissions override
    const clinicPerms = getEffectiveClinicPermissions({
        subRole,
        permissions: session?.user?.permissions,
    });
    
    const canSeePrices = clinicPerms.canViewFinance;

    // Redirect laboratory roles to their proper pages
    useEffect(() => {
        if (!session?.user) return;
        const role = session.user.role;
        const sr = session.user.subRole;
        // Procurement: redirect to dedicated procurement page
        if (sr === 'optic_procurement') {
            router.replace('/optic/procurement');
            return;
        }
        if (role === 'laboratory') {
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
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalOrders, setTotalOrders] = useState(0);
    const [showFilters, setShowFilters] = useState(false);
    const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [sendingComment, setSendingComment] = useState(false);
    const [requestType, setRequestType] = useState<'comment' | 'request_edit' | 'request_cancel'>('comment');
    const [showRequestModal, setShowRequestModal] = useState<string | null>(null);
    const [requestReason, setRequestReason] = useState('');
    const [expediteOrderId, setExpediteOrderId] = useState<string | null>(null);
    const [isExpediting, setIsExpediting] = useState(false);
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
        setPage(1);
    }, [searchQuery, filter, sortBy, dateFrom, dateTo]);

    useEffect(() => {
        loadOrders();
    }, [page, searchQuery, filter, sortBy, dateFrom, dateTo]);

    const loadOrders = async () => {
        try {
            setIsLoading(true);
            const params = new URLSearchParams({ page: page.toString(), limit: '50', sortBy });
            if (searchQuery.trim()) params.append('search', searchQuery.trim());
            if (filter !== 'all') {
                if (filter === 'unpaid') params.append('paymentStatus', 'unpaid');
                else params.append('status', filter);
            }
            if (dateFrom) params.append('dateFrom', dateFrom);
            if (dateTo) params.append('dateTo', dateTo);

            const response = await fetch(`/api/orders?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                if (data.data) {
                    setOrders(data.data);
                    setTotalPages(data.totalPages || 1);
                    setTotalOrders(data.total || 0);
                } else {
                    setOrders(data);
                }
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
            loadOrders();
        } catch (error) {
            console.error('Failed to confirm delivery:', error);
        }
    };

    const handleExpediteOrder = async () => {
        if (!expediteOrderId) return;
        try {
            setIsExpediting(true);
            const res = await fetch(`/api/orders/${expediteOrderId}/urgent`, { method: 'POST' });
            if (res.ok) {
                setExpediteOrderId(null);
                loadOrders();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to expedite order');
            }
        } catch (error) {
            console.error('Failed to expedite order:', error);
        } finally {
            setIsExpediting(false);
        }
    };

    const filteredOrders = orders; // Filtering is now server-side

    const stats = {
        total: filter === 'all' && !searchQuery && !dateFrom && !dateTo ? totalOrders : '-',
        new: '-', // Cannot count exact status numbers without fetching all, showing '-' for now
        in_production: '-',
        ready: '-',
        shipped: '-',
        delivered: '-',
    };

    const toggleExpand = (orderId: string) => {
        setExpandedOrders(prev => {
            const next = new Set(prev);
            next.has(orderId) ? next.delete(orderId) : next.add(orderId);
            return next;
        });
    };

    const setQuickDate = (preset: 'today' | '7d' | '30d' | '6m' | '1y' | 'all') => {
        if (preset === 'all') {
            setDateFrom('');
            setDateTo('');
            return;
        }
        const today = new Date();
        const fromDate = new Date();
        switch (preset) {
            case 'today': break;
            case '7d': fromDate.setDate(today.getDate() - 7); break;
            case '30d': fromDate.setDate(today.getDate() - 30); break;
            case '6m': fromDate.setMonth(today.getMonth() - 6); break;
            case '1y': fromDate.setFullYear(today.getFullYear() - 1); break;
        }
        setDateFrom(fromDate.toISOString().split('T')[0]);
        setDateTo(today.toISOString().split('T')[0]);
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
                contract: (order as any).contract,
                optic_inn: (order as any).optic_inn,
                optic_address: (order as any).optic_address,
                lab_org: (order as any).lab_org,
                distributor_org: (order as any).distributor_org,
            });
        });
    };

    const handlePrintWaybill = (order: Order) => {
        import('@/lib/generateWaybillPdf').then(({ generateWaybillPdf }) => {
            generateWaybillPdf({
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
                contract: (order as any).contract,
                optic_inn: (order as any).optic_inn,
                optic_address: (order as any).optic_address,
                lab_org: (order as any).lab_org,
                distributor_org: (order as any).distributor_org,
            });
        });
    };


    const renderParamRow = (label: string, value: any) => (
        <div className="flex justify-between text-xs py-1 border-b border-gray-100">
            <span className="text-gray-500">{label}</span>
            <span className="font-medium text-gray-800">{value != null && value !== '' ? String(value) : '—'}</span>
        </div>
    );

    const renderEyeBlock = (label: string, eye: any) => (
        <div>
            <h5 className="text-xs font-semibold text-gray-700 mb-1 mt-2">{label}</h5>
            <div className="bg-gray-50 rounded-lg p-3 space-y-0">
                {renderParamRow("Характеристика", eye.characteristic ? (CharacteristicLabels[eye.characteristic as Characteristic] || eye.characteristic) : null)}
                {renderParamRow("RGP", eye.isRgp ? 'Да' : 'Нет')}
                {renderParamRow("MyOrthoK", eye.myorthok ? 'Да' : 'Нет')}
                {renderParamRow("Km", eye.isRgp ? null : eye.km)}
                {renderParamRow("TP", eye.tp)}
                {renderParamRow("DIA", eye.dia)}
                {renderParamRow("E", eye.e1 != null ? `${eye.e1}${eye.e2 != null ? ' / ' + eye.e2 : ''}` : null)}
                {(eye.sph != null || eye.cyl != null || eye.ax != null) && (
                    <>
                        {renderParamRow("SPH", eye.sph)}
                        {renderParamRow("CYL", eye.cyl)}
                        {renderParamRow("AX", eye.ax)}
                    </>
                )}
                {renderParamRow("Тор.", eye.tor)}
                {renderParamRow("Dk", eye.dk)}
                {renderParamRow("Пробная", (eye.dk === '50' || eye.trial) ? 'Да' : 'Нет')}
                {renderParamRow("Цвет", eye.color || null)}
                {renderParamRow("Апик. клиренс", eye.apical_clearance)}
                {renderParamRow("Фактор компр.", eye.compression_factor)}
                {renderParamRow("Кол-во", eye.qty)}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-surface">
            <QuickNav />
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

                        {/* Desktop nav - row 1: actions */}
                        <div className="hidden md:flex items-center gap-2">
                            {/* Primary actions */}
                            {clinicPerms.canViewOrders && perms.canCreateOrders && (
                                <Link href="/optic/orders/new" className="btn btn-primary gap-2 text-sm">
                                    <Plus className="w-4 h-4" />
                                    Создать заказ
                                </Link>
                            )}
                            {clinicPerms.canViewCrm && (
                                <Link
                                    href="/sales/pipeline"
                                    className="flex items-center gap-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors py-2 px-3 rounded-lg"
                                >
                                    <Target className="w-4 h-4" />
                                    CRM
                                </Link>
                            )}
                            {clinicPerms.canViewFinance && (
                                <Link
                                    href="/optic/finances"
                                    className="flex items-center gap-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors py-2 px-3 rounded-lg"
                                >
                                    <Wallet className="w-4 h-4" />
                                    Финансы и ЗП
                                </Link>
                            )}
                            {clinicPerms.canViewPatients && (
                                <Link
                                    href="/optic/patients"
                                    className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors py-2 px-3 rounded-lg"
                                >
                                    <Users className="w-4 h-4" />
                                    Пациенты
                                </Link>
                            )}

                            <div className="w-px h-6 bg-gray-200 mx-1" />

                            <Link href="/profile" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Профиль">
                                <User className="w-4 h-4" />
                            </Link>
                            <Link href="/support" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Поддержка">
                                <MessageSquarePlus className="w-4 h-4" />
                            </Link>
                            <button
                                onClick={() => signOut({ callbackUrl: '/login' })}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Выйти"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                            <FullscreenButton />
                        </div>

                        {/* Mobile: create + hamburger */}
                        <div className="flex md:hidden items-center gap-2">
                            {clinicPerms.canViewOrders && perms.canCreateOrders && (
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
                            {clinicPerms.canViewCatalog && (
                                <Link
                                    href="/optic/catalog"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
                                >
                                    <Package className="w-4 h-4" />
                                    Каталог
                                </Link>
                            )}
                            {clinicPerms.canViewWarehouse && (
                                <Link
                                    href="/optic/warehouse"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
                                >
                                    <Warehouse className="w-4 h-4" />
                                    Склад
                                </Link>
                            )}
                            {clinicPerms.canViewPos && (
                                <Link
                                    href="/optic/pos"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
                                >
                                    <ShoppingCart className="w-4 h-4" />
                                    Касса POS
                                </Link>
                            )}
                            {clinicPerms.canViewCash && (
                                <Link
                                    href="/optic/cash-shifts"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
                                >
                                    <Banknote className="w-4 h-4" />
                                    Касса и Смены
                                </Link>
                            )}
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
                            {subRole === 'optic_manager' && (
                                <Link
                                    href="/optic/settings/itigris"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-orange-600 hover:bg-orange-50"
                                >
                                    <Link2 className="w-4 h-4" />
                                    ITIGRIS
                                </Link>
                            )}
                            {subRole === 'optic_manager' && (
                                <Link
                                    href="/clinic-manager/dashboard"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-violet-600 hover:bg-violet-50"
                                >
                                    <Link2 className="w-4 h-4" />
                                    ЛК Менеджера
                                </Link>
                            )}
                            {clinicPerms.canViewCrm && (
                                <Link
                                    href="/sales/pipeline"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                                >
                                    <Target className="w-4 h-4" />
                                    CRM Продажи
                                </Link>
                            )}
                            {clinicPerms.canViewFinance && (
                                <Link
                                    href="/optic/finances"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
                                >
                                    <Wallet className="w-4 h-4" />
                                    Финансы и ЗП
                                </Link>
                            )}
                            <Link
                                href="/optic/patients"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                            >
                                <Users className="w-4 h-4" />
                                Пациенты
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
                    {clinicPerms.canViewFinance && perms.canViewStats && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4 mt-4 sm:mt-6">
                            {[
                                { label: 'Всего', value: stats.total, icon: Package, bg: 'bg-gray-50', text: 'text-gray-700' },
                                { label: 'Новые', value: stats.new, icon: Clock, bg: 'bg-blue-50', text: 'text-blue-700' },
                                { label: 'В работе', value: stats.in_production, icon: TruckIcon, bg: 'bg-yellow-50', text: 'text-yellow-700' },
                                { label: 'Готовы', value: stats.ready, icon: CheckCircle, bg: 'bg-green-50', text: 'text-green-700' },
                                { label: 'Отгружены', value: stats.shipped, icon: TruckIcon, bg: 'bg-purple-50', text: 'text-purple-700' },
                                { label: 'Доставлены', value: stats.delivered, icon: MapPin, bg: 'bg-emerald-50', text: 'text-emerald-700' },
                            ].map(s => (
                                <div key={s.label} className={`rounded-xl p-3 sm:p-4 ${s.bg}`}>
                                    <div className={`text-2xl font-bold mb-0.5 ${s.text}`}>{s.value}</div>
                                    <div className={`text-xs font-medium ${s.text} opacity-90`}>{s.label}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>


            {/* === PATIENT QUICK ACCESS - compact ===  */}
            {clinicPerms.canViewPatients && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-3 pb-1">
                    <div className="flex items-center gap-3 flex-wrap">
                        <Link href="/optic/patients"
                            className="group inline-flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-sm font-medium py-2 px-4 rounded-xl transition-all hover:shadow-sm"
                        >
                            <Users className="w-4 h-4 text-emerald-600" />
                            Мои пациенты
                            <span className="text-emerald-400 group-hover:text-emerald-600 transition-colors">→</span>
                        </Link>
                        <span className="text-xs text-gray-400">Карточки, рецепты, консультации · синхронизация с MedMundus</span>
                    </div>
                </div>
            )}

            {/* === DOCTOR CALENDAR === */}
            {(clinicPerms.canViewPatients || clinicPerms.canViewCrm) && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
                    <DoctorCalendar />
                </div>
            )}

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
                        <button onClick={clearFilters} className="btn btn-secondary text-sm gap-1 h-[42px]">
                            <X className="w-4 h-4" /> Сбросить
                        </button>
                    )}
                </div>
                
                {/* Quick Date Filters */}
                <div className="flex flex-wrap items-center gap-2 mb-6 -mt-2">
                    <button onClick={() => setQuickDate('today')} className="px-3 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors">Сегодня</button>
                    <button onClick={() => setQuickDate('7d')} className="px-3 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors">7 дней</button>
                    <button onClick={() => setQuickDate('30d')} className="px-3 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors">30 дней</button>
                    <button onClick={() => setQuickDate('6m')} className="px-3 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors">Полгода</button>
                    <button onClick={() => setQuickDate('1y')} className="px-3 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors">Год</button>
                    <button onClick={() => setQuickDate('all')} className="px-3 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors">За всё время</button>
                </div>


                {/* Status Tabs */}
                <div className="flex gap-2 mb-4 sm:mb-6 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
                    {(['all', 'new', 'in_production', 'ready', 'shipped', 'delivered'] as const).map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`
                                px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all flex-shrink-0
                                ${filter === status
                                    ? 'bg-primary-600 text-white shadow-sm'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
                            `}
                        >
                            {status === 'all' ? 'Все' : OrderStatusLabels[status]}
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
                    </button>
                </div>

                {/* Results count */}
                <p className="text-sm text-gray-500 mb-4">
                    Найдено: {totalOrders} {totalOrders === 1 ? 'заказ' : totalOrders < 5 ? 'заказа' : 'заказов'}
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
                            const od = (order.config?.eyes?.od || { km: "-", dia: "-", dk: "-", qty: 0 });
                            const os = (order.config?.eyes?.os || { km: "-", dia: "-", dk: "-", qty: 0 });
                            // ITIGRIS orders use a different lensConfig shape (prescription/lens),
                            // not the native MediLens eyes.od/os — detect and summarize separately.
                            const isItigris = String(order.order_id || '').startsWith('ITG-');
                            const itgType = (order.config as any)?.orderType as string | undefined;
                            const itgTypeLabel = ({ GLASSES: 'Очки', CONTACT_LENS: 'Контактные линзы', SALE: 'Продажа', REPAIR: 'Ремонт', REPAIR_GLASSES_ORDER: 'Ремонт очков', CHECK_VISION: 'Проверка зрения' } as Record<string, string>)[itgType || ''] || 'Заказ ITIGRIS';
                            const itgRx = (order.config as any)?.prescription as any;
                            const itgPayment = (order.config as any)?.payment as any;
                            const itgFmt = (v: any) => v == null ? '—' : (Number(v) > 0 ? '+' : '') + Number(v).toFixed(2);
                            const itgEye = (e: any) => e ? `Sph ${itgFmt(e.sph)} Cyl ${itgFmt(e.cyl)} Ax ${e.ax != null ? Math.round(e.ax) + '°' : '—'}` : '—';
                            const odQty = od.characteristic ? (Number(od.qty) || 0) : 0;
                            const osQty = os.characteristic ? (Number(os.qty) || 0) : 0;
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
                                    className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow p-4 sm:p-5"
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
                                                <span>Тип: {isItigris ? itgTypeLabel : 'MediLens'}</span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mt-1">
                                                {isItigris ? (
                                                    itgRx ? (
                                                        <>
                                                            <span>OD: {itgEye(itgRx.od)}</span>
                                                            <span>OS: {itgEye(itgRx.os)}</span>
                                                        </>
                                                    ) : (
                                                        <span className="italic text-gray-400">Детали — в карточке заказа</span>
                                                    )
                                                ) : (
                                                    <>
                                                        <span>OD: Km {od.km} | DIA {od.dia} | Dk {od.dk}</span>
                                                        <span>OS: Km {os.km} | DIA {os.dia} | Dk {os.dk}</span>
                                                    </>
                                                )}
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

                                        {isItigris && (
                                            <Link
                                                href={`/optic/orders/itigris/${order.order_id}`}
                                                className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-medium transition-colors ml-2"
                                            >
                                                Открыть карточку ITIGRIS →
                                            </Link>
                                        )}

                                        {!isItigris && !order.is_urgent && !['shipped', 'out_for_delivery', 'delivered', 'cancelled'].includes(order.status) && (
                                            <button
                                                onClick={() => setExpediteOrderId(order.order_id)}
                                                className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium transition-colors ml-2"
                                            >
                                                <Zap className="w-3.5 h-3.5" />
                                                Ускорить заказ
                                            </button>
                                        )}

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

                                        {/* Edit window indicator (native MediLens orders only — ITIGRIS orders are read-only) */}
                                        {!isItigris && (() => {
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
                                            if (order.status === 'draft') {
                                                return (
                                                    <div className="flex items-center gap-2">
                                                        {clinicPerms.canViewFinance ? (
                                                            <button
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    if (!confirm('Подтвердить заказ и отправить в лабораторию?')) return;
                                                                    try {
                                                                        await fetch(`/api/orders/${order.order_id}/status`, {
                                                                            method: 'PATCH',
                                                                            headers: { 'Content-Type': 'application/json' },
                                                                            body: JSON.stringify({ status: 'new' }),
                                                                        });
                                                                        loadOrders();
                                                                    } catch (error) {
                                                                        console.error('Failed to approve order:', error);
                                                                    }
                                                                }}
                                                                className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                                            >
                                                                <Check className="w-3.5 h-3.5" />
                                                                Подтвердить заказ
                                                            </button>
                                                        ) : (
                                                            <span className="flex items-center gap-1 text-xs text-amber-500 font-medium bg-amber-50 px-2 py-1 rounded-md">
                                                                <Clock className="w-3.5 h-3.5" />
                                                                Ожидает бухгалтера
                                                            </span>
                                                        )}
                                                        <Link
                                                            href={`/optic/orders/${order.order_id}/edit`}
                                                            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                            Ред.
                                                        </Link>
                                                    </div>
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
                                                    {requestType === 'request_edit' ? (
                                                        <span className="inline-flex items-center gap-1">
                                                            <FileEdit className="w-4 h-4" /> Запрос на редактирование
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1">
                                                            <XCircle className="w-4 h-4" /> Запрос на отмену заказа
                                                        </span>
                                                    )}
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
                                            <div className="flex items-center gap-4 ml-auto">
                                                <button
                                                    onClick={() => handlePrintInvoice(order)}
                                                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors"
                                                >
                                                    <Download className="w-3.5 h-3.5" />
                                                    Счёт на оплату
                                                </button>
                                                <button
                                                    onClick={() => handlePrintWaybill(order)}
                                                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors"
                                                >
                                                    <Download className="w-3.5 h-3.5" />
                                                    Товарная накладная
                                                </button>
                                            </div>
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

                                                    <div className={`grid ${odQty > 0 && osQty > 0 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'} gap-4`}>
                                                        {odQty > 0 && renderEyeBlock("OD (Правый глаз)", od)}
                                                        {osQty > 0 && renderEyeBlock("OS (Левый глаз)", os)}
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

                                                    {isItigris ? (
                                                        <Link
                                                            href={`/optic/orders/itigris/${order.order_id}`}
                                                            className="block bg-orange-50 border border-orange-100 rounded-lg p-3 mt-4 hover:bg-orange-100 transition-colors"
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-sm font-medium text-orange-700">
                                                                    Полная информация — в карточке ITIGRIS →
                                                                </span>
                                                                {canSeePrices && (
                                                                    <span className="text-lg font-bold text-orange-700">
                                                                        {totalPrice.toLocaleString('ru-RU')} ₸
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {canSeePrices && itgPayment && (itgPayment.paid > 0 || itgPayment.due > 0) && (
                                                                <div className="flex items-center gap-4 mt-2 text-xs">
                                                                    <span className="text-emerald-700 font-medium">Оплачено: {Number(itgPayment.paid).toLocaleString('ru-RU')} ₸</span>
                                                                    {itgPayment.due > 0 && (
                                                                        <span className="text-red-600 font-medium">Остаток: {Number(itgPayment.due).toLocaleString('ru-RU')} ₸</span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </Link>
                                                    ) : canSeePrices && (
                                                        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 mt-4">
                                                            <div className="text-sm text-gray-600 space-y-0.5">
                                                                <div>
                                                                    {odQty > 0 && <span>OD: {odQty} × {((order as any).price_od ?? PRICE_PER_LENS).toLocaleString('ru-RU')} ₸</span>}
                                                                    {odQty > 0 && osQty > 0 && <span className="mx-2">+</span>}
                                                                    {osQty > 0 && <span>OS: {osQty} × {((order as any).price_os ?? PRICE_PER_LENS).toLocaleString('ru-RU')} ₸</span>}
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
                                                                    const typeLabels: Record<string, { label: ReactNode; cls: string }> = {
                                                                        request_edit: { label: <span className="inline-flex items-center gap-1"><FileEdit className="w-3.5 h-3.5" /> Запрос ред.</span>, cls: 'bg-amber-100 text-amber-700' },
                                                                        request_cancel: { label: <span className="inline-flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Запрос отмены</span>, cls: 'bg-red-100 text-red-700' },
                                                                        approve_edit: { label: <span className="inline-flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Одобрено ред.</span>, cls: 'bg-green-100 text-green-700' },
                                                                        approve_cancel: { label: <span className="inline-flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Отменён</span>, cls: 'bg-red-100 text-red-700' },
                                                                        reject_request: { label: <span className="inline-flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Отклонено</span>, cls: 'bg-gray-100 text-gray-700' },
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
            {/* Expedite Order Modal */}
            <AnimatePresence>
                {expediteOrderId && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                        onClick={() => setExpediteOrderId(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
                                <Zap className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Ускорить заказ {expediteOrderId}?</h3>
                            <p className="text-sm text-gray-600 mb-6">
                                Стоимость заказа будет увеличена согласно наценке за срочность (по умолчанию +25%). Время на редактирование будет завершено.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setExpediteOrderId(null)}
                                    className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors"
                                    disabled={isExpediting}
                                >
                                    Отмена
                                </button>
                                <button
                                    onClick={handleExpediteOrder}
                                    className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center"
                                    disabled={isExpediting}
                                >
                                    {isExpediting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Подтвердить'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            </div>
        </div>
    );
}
