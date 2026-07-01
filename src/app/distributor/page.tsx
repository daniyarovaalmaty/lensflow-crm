'use client';

import { useState, useEffect, useMemo, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/dateUtils';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Package, Clock, CheckCircle, TruckIcon, Search,
    Download, User, Calendar, X, Zap, Pencil, Truck, Users,
    Building2, MessageSquarePlus, MessageCircle, Send, Banknote,
    FlaskConical, BoxIcon, ArrowRight, Eye, Lock, FileEdit, XCircle
} from 'lucide-react';
import type { Order, OrderStatus, Characteristic } from '@/types/order';
import {
    OrderStatusLabels, OrderStatusColors, CharacteristicLabels,
    PaymentStatusLabels, PaymentStatusColors,
    canEditOrder, editWindowRemainingMs
} from '@/types/order';
import type { PaymentStatus } from '@/types/order';
import { getPermissions, SubRoleLabels } from '@/types/user';
import type { SubRole } from '@/types/user';



const PRICE_PER_LENS = 17500;

export default function DistributorDashboard() {
    const { data: session } = useSession();
    const router = useRouter();
    const subRole = (session?.user?.subRole || 'dist_manager') as SubRole;
    const perms = getPermissions(subRole);
    const canSeePrices = perms.canViewPayments;

    useEffect(() => {
        if (!session?.user) return;
        if (session.user.role !== 'distributor') router.replace('/login');
    }, [session, router]);

    // ==================== STATE ====================
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState('');
    const [clinicFilter, setClinicFilter] = useState('all');

    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [partnerLabId, setPartnerLabId] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const [showRequestModal, setShowRequestModal] = useState<string | null>(null);
    const [requestType, setRequestType] = useState<'request_edit' | 'request_cancel'>('request_edit');
    const [requestReason, setRequestReason] = useState('');
    const [commentText, setCommentText] = useState('');
    const [sendingComment, setSendingComment] = useState(false);
    const [expediteOrderId, setExpediteOrderId] = useState<string | null>(null);
    const [isExpediting, setIsExpediting] = useState(false);
    const [tick, setTick] = useState(0);

    useEffect(() => { const t = setInterval(() => setTick(n => n + 1), 30_000); return () => clearInterval(t); }, []);

    const formatCountdown = (ms: number) => {
        if (ms <= 0) return null;
        const h = Math.floor(ms / 3600_000);
        const m = Math.floor((ms % 3600_000) / 60_000);
        return h > 0 ? `${h}ч ${m}м` : `${m}м`;
    };

    const selectedOrder = useMemo(() =>
        orders.find(o => o.order_id === selectedOrderId) || null,
        [orders, selectedOrderId]
    );

    // Lock body scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = selectedOrderId ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [selectedOrderId]);

    // ==================== DATA LOADING ====================
    useEffect(() => { loadOrders(); loadPartnerLab(); }, []);

    const loadOrders = async () => {
        try {
            const res = await fetch('/api/orders');
            if (res.ok) setOrders(await res.json());
        } catch (e) { console.error('Failed to load orders:', e); }
        finally { setIsLoading(false); }
    };

    const loadPartnerLab = async () => {
        try {
            const res = await fetch('/api/laboratories');
            if (res.ok) {
                const labs = await res.json();
                if (labs.length > 0) setPartnerLabId(labs[0].id);
            }
        } catch {}
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

    // ==================== FILTERING ====================
    const clinicNames = useMemo(() => {
        const names = new Set<string>();
        orders.forEach(o => {
            const name = o.company || o.meta.optic_name;
            if (name) names.add(name);
        });
        return Array.from(names).sort();
    }, [orders]);

    // All orders in kanban
    const kanbanOrders = useMemo(() => {
        let result = [...orders];

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            result = result.filter(o =>
                o.order_id.toLowerCase().includes(q) ||
                o.patient.name.toLowerCase().includes(q) ||
                (o.meta.doctor || '').toLowerCase().includes(q) ||
                (o.company || '').toLowerCase().includes(q)
            );
        }
        if (clinicFilter !== 'all') {
            result = result.filter(o => (o.company || o.meta.optic_name) === clinicFilter);
        }
        return result;
    }, [orders, searchQuery, clinicFilter]);

    const ordersByStatus = useMemo(() => ({
        new: kanbanOrders.filter(o => o.status === 'new'),
        in_production: kanbanOrders.filter(o => o.status === 'in_production' || o.status === 'rework'),
        ready: kanbanOrders.filter(o => o.status === 'ready'),
        shipped: kanbanOrders.filter(o => o.status === 'shipped' || o.status === 'out_for_delivery'),
        delivered: kanbanOrders.filter(o => ['delivered', 'accountant_review', 'docs_prep', 'docs_ready'].includes(o.status)),
    }), [kanbanOrders]);

    // ==================== ACTIONS ====================
    const forwardToLab = async (orderId: string) => {
        if (!partnerLabId) { alert('Лаборатория-партнёр не найдена'); return; }
        setActionLoading(orderId);
        try {
            await fetch(`/api/orders/${orderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ labOrgId: partnerLabId }),
            });
            await loadOrders();
        } catch (e) { console.error(e); }
        finally { setActionLoading(null); }
    };

    const selfFulfill = async (orderId: string) => {
        setActionLoading(orderId);
        try {
            await fetch(`/api/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'in_production' }),
            });
            await loadOrders();
        } catch (e) { console.error(e); }
        finally { setActionLoading(null); }
    };

    const updateStatus = async (orderId: string, newStatus: OrderStatus) => {
        setActionLoading(orderId);
        try {
            await fetch(`/api/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            await loadOrders();
        } catch (e) { console.error(e); }
        finally { setActionLoading(null); }
    };

    const handlePrintInvoice = (order: Order) => {
        import('@/lib/generateInvoicePdf').then(({ generateInvoicePdf }) => {
            generateInvoicePdf({
                order_id: order.order_id, patient: order.patient,
                meta: order.meta, company: order.company, config: order.config,
                is_urgent: order.is_urgent, total_price: order.total_price,
                discount_percent: (order as any).discount_percent,
                document_name_od: (order as any).document_name_od,
                document_name_os: (order as any).document_name_os,
                price_od: (order as any).price_od, price_os: (order as any).price_os,
                products: (order as any).products,
            });
        });
    };

    // ==================== HELPERS ====================
    const isLabOrder = (order: Order) => !!order.meta.lab_org_id;
    const isSelfFulfilled = (order: Order) => !order.meta.lab_org_id;

    const getOrderPrice = (order: Order) => {
        const od = order.config?.eyes?.od || { qty: 0 };
        const os = order.config?.eyes?.os || { qty: 0 };
        const odQty = od.characteristic ? (Number(od.qty) || 0) : 0;
        const osQty = os.characteristic ? (Number(os.qty) || 0) : 0;
        return order.total_price || (odQty + osQty) * PRICE_PER_LENS;
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

    // ==================== KANBAN CARD ====================
    const renderKanbanCard = (order: Order) => {
        const od = order.config?.eyes?.od || { km: '-', dk: '-', qty: 0 };
        const charLabel = od.characteristic
            ? CharacteristicLabels[od.characteristic as Characteristic] : '—';
        const payStatus = (order as any).payment_status || 'unpaid';
        const clinic = order.company || order.meta.optic_name;
        const lab = isLabOrder(order);

        return (
            <div
                key={order.order_id}
                onClick={() => setSelectedOrderId(order.order_id)}
                className="card cursor-pointer hover:shadow-md transition-all group hover:border-blue-200"
            >
                <div className="space-y-2">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-1.5">
                                <h4 className="font-semibold text-gray-900 text-sm group-hover:text-blue-700 transition-colors">
                                    {order.order_id}
                                </h4>
                                <span className={`text-[10px] font-bold rounded px-1.5 py-0.5 ${lab ? 'bg-violet-100 text-violet-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {lab ? '🔬 Лаб' : '📦 Своя'}
                                </span>
                            </div>
                            <p className="text-xs text-gray-600">{order.patient.name}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <span className="text-xs text-gray-400">{formatDate(order.meta.created_at)}</span>
                            {order.is_urgent && (
                                <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 rounded px-1.5 py-0.5">
                                    <Zap className="w-2.5 h-2.5" /> СРОЧНО
                                </span>
                            )}
                        </div>
                    </div>

                    {clinic && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Building2 className="w-3 h-3" />
                            <span className="truncate">{clinic}</span>
                        </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="bg-gray-100 rounded px-1.5 py-0.5">{charLabel}</span>
                        <span>Km: {od.km ?? '—'}</span>
                        <span>Dk: {od.dk ?? '—'}</span>
                    </div>

                    {/* Incoming order without lab — show forward/self-fulfill buttons */}
                    {isSelfFulfilled(order) && order.status === 'new' && (
                        <div className="flex gap-2 pt-1">
                            <button onClick={e => { e.stopPropagation(); forwardToLab(order.order_id); }}
                                className="flex-1 text-xs py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-medium transition-colors flex items-center justify-center gap-1"
                                disabled={actionLoading === order.order_id || !partnerLabId}>
                                <FlaskConical className="w-3 h-3" /> Перенаправить в MedInnVision LAB
                            </button>
                            <button onClick={e => { e.stopPropagation(); selfFulfill(order.order_id); }}
                                className="flex-1 text-xs py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-medium transition-colors flex items-center justify-center gap-1"
                                disabled={actionLoading === order.order_id}>
                                <BoxIcon className="w-3 h-3" /> Реализовать
                            </button>
                        </div>
                    )}

                    {/* Self-fulfilled actions (non-new) */}
                    {isSelfFulfilled(order) && order.status !== 'new' && order.status !== 'delivered' && order.status !== 'cancelled' && (
                        <div className="pt-1">
                            {order.status === 'in_production' && (
                                <button onClick={e => { e.stopPropagation(); updateStatus(order.order_id, 'ready'); }}
                                    className="w-full text-xs py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg font-medium transition-colors"
                                    disabled={actionLoading === order.order_id}>
                                    ✅ Готов
                                </button>
                            )}
                            {order.status === 'ready' && (
                                <button onClick={e => { e.stopPropagation(); updateStatus(order.order_id, 'shipped'); }}
                                    className="w-full text-xs py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg font-medium transition-colors"
                                    disabled={actionLoading === order.order_id}>
                                    🚚 Отгрузить
                                </button>
                            )}
                            {(order.status === 'shipped' || order.status === 'out_for_delivery') && (
                                <button onClick={e => { e.stopPropagation(); updateStatus(order.order_id, 'delivered'); }}
                                    className="w-full text-xs py-1.5 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg font-medium transition-colors"
                                    disabled={actionLoading === order.order_id}>
                                    📬 Доставлен
                                </button>
                            )}
                        </div>
                    )}

                    {/* Lab order: confirm delivery */}
                    {isLabOrder(order) && order.status === 'out_for_delivery' && (
                        <button onClick={e => { e.stopPropagation(); updateStatus(order.order_id, 'delivered'); }}
                            className="w-full text-xs py-1.5 bg-teal-600 text-white hover:bg-teal-700 rounded-lg font-medium transition-colors"
                            disabled={actionLoading === order.order_id}>
                            <CheckCircle className="w-3 h-3 inline mr-1" /> Подтвердить получение
                        </button>
                    )}

                    <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-gray-100">
                        {order.meta.doctor ? (
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                                <User className="w-3 h-3" />
                                {order.meta.doctor}
                            </div>
                        ) : <div />}
                        <div className="flex items-center gap-1.5 text-[11px]">
                            <span className={`w-2 h-2 rounded-full ${payStatus === 'paid' ? 'bg-emerald-500' : payStatus === 'partial' ? 'bg-amber-500' : 'bg-gray-300'}`} />
                            <span className={`font-medium ${payStatus === 'paid' ? 'text-emerald-600' : payStatus === 'partial' ? 'text-amber-600' : 'text-gray-400'}`}>
                                {PaymentStatusLabels[payStatus as PaymentStatus]}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // ==================== KANBAN COLUMN ====================
    const renderColumn = (title: string, Icon: any, colOrders: Order[], color: string) => (
        <div className="flex-shrink-0 w-[75vw] sm:w-auto sm:flex-1 min-w-0 sm:min-w-[220px]">
            <div className={`card mb-3 ${color}`}>
                <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5" />
                    <h3 className="font-semibold text-sm">{title}</h3>
                    <span className="ml-auto bg-white/50 rounded-full px-2 py-0.5 text-sm font-medium">
                        {colOrders.length}
                    </span>
                </div>
            </div>
            <div className="space-y-3">
                {colOrders.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-8 opacity-50 border-2 border-dashed border-gray-200 rounded-xl m-2">
                        <Package className="w-8 h-8 mb-2" />
                        <span className="text-xs font-medium">Нет заказов</span>
                    </div>
                ) : (
                    colOrders.map(order => renderKanbanCard(order))
                )}
            </div>
        </div>
    );

    // ==================== ORDER MODAL ====================
    const renderOrderModal = () => {
        if (!selectedOrder) return null;
        const order = selectedOrder;
        const od = order.config?.eyes?.od || { km: '-', dia: '-', dk: '-', qty: 0 };
        const os = order.config?.eyes?.os || { km: '-', dia: '-', dk: '-', qty: 0 };
        const lab = isLabOrder(order);
        const price = getOrderPrice(order);

        return (
            <div className="fixed inset-0 z-50 flex items-start justify-center p-2 sm:p-4 pt-[2vh] sm:pt-[5vh] overflow-y-auto"
                onClick={() => setSelectedOrderId(null)}>
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    onClick={e => e.stopPropagation()}
                    className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mb-[5vh] max-h-[90vh] overflow-y-auto"
                >
                    <div className="sticky top-0 bg-white border-b border-gray-100 px-4 sm:px-6 py-3 sm:py-4 rounded-t-2xl z-10">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-bold text-gray-900">Заказ {order.order_id}</h2>
                                    <span className={`text-xs font-bold rounded px-2 py-0.5 ${lab ? 'bg-violet-100 text-violet-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                        {lab ? '🔬 Лаборатория' : '📦 Своя реализация'}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500">
                                    {OrderStatusLabels[order.status === 'rework' ? 'in_production' : order.status]} • {formatDate(order.meta.created_at)}
                                </p>
                            </div>
                            <button onClick={() => setSelectedOrderId(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                    </div>

                    <div className="px-4 sm:px-6 py-4 space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className={`badge ${OrderStatusColors[order.status === 'rework' ? 'in_production' : order.status]}`}>
                                {OrderStatusLabels[order.status === 'rework' ? 'in_production' : order.status]}
                            </span>
                            {order.is_urgent && (
                                <span className="badge bg-amber-100 text-amber-700 flex items-center gap-1">
                                    <Zap className="w-3 h-3" /> СРОЧНО
                                </span>
                            )}
                            {canSeePrices && (() => {
                                const ps = (order as any).payment_status || 'unpaid';
                                return (
                                    <span className={`badge flex items-center gap-1.5 ${PaymentStatusColors[ps as PaymentStatus]}`}>
                                        <span className={`w-2 h-2 rounded-full ${ps === 'paid' ? 'bg-emerald-500' : ps === 'partial' ? 'bg-amber-500' : 'bg-gray-400'}`} />
                                        {PaymentStatusLabels[ps as PaymentStatus]}
                                    </span>
                                );
                            })()}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h4 className="text-xs font-semibold text-gray-400 uppercase mb-1">Пациент</h4>
                                <p className="text-sm font-medium text-gray-900">{order.patient.name}</p>
                                <p className="text-xs text-gray-500">{order.patient.phone}</p>
                            </div>
                            <div>
                                <h4 className="text-xs font-semibold text-gray-400 uppercase mb-1">Ответственный</h4>
                                <p className="text-sm font-medium text-gray-900">{order.meta.doctor || order.meta.optic_name || '—'}</p>
                                {order.company && <p className="text-xs text-gray-500">{order.company}</p>}
                            </div>
                        </div>

                        {order.delivery_method && (
                            <div className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3">
                                <span className="font-medium">Доставка:</span> {order.delivery_method}
                                {order.delivery_address && ` — ${order.delivery_address}`}
                            </div>
                        )}
                        {order.notes && (
                            <div className="text-xs text-gray-600 bg-yellow-50 rounded-lg p-3">
                                <span className="font-medium">Примечания:</span> {order.notes}
                            </div>
                        )}

                        <div className={`grid ${Number(od?.qty || 0) > 0 && Number(os?.qty || 0) > 0 ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                            {Number(od?.qty || 0) > 0 && renderEyeBlock("Правый (OD)", od)}
                            {Number(os?.qty || 0) > 0 && renderEyeBlock("Левый (OS)", os)}
                        </div>

                        {canSeePrices && (
                            <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-600">Итого</span>
                                <span className="text-xl font-bold text-gray-900">{price.toLocaleString('ru-RU')} ₸</span>
                            </div>
                        )}

                        {(() => {
                            const editable = canEditOrder(order);
                            const remainMs = editWindowRemainingMs(order);
                            const countdown = formatCountdown(remainMs);
                            const comments = ((order as any).comments || []) as any[];
                            const hasPendingRequest = comments.some((c: any) => 
                                ['request_edit', 'request_cancel'].includes(c.type) &&
                                !comments.some((r: any) => ['approve_edit', 'approve_cancel', 'reject_request'].includes(r.type) && new Date(r.createdAt) > new Date(c.createdAt))
                            );
                            const lastAction = [...comments].reverse().find((c: any) => ['approve_edit', 'approve_cancel', 'reject_request'].includes(c.type));

                            if (order.status === 'cancelled') {
                                return (
                                    <div className="flex items-center gap-1 text-xs text-red-400 bg-red-50 p-3 rounded-xl mb-4">
                                        <X className="w-4 h-4" /> Заказ отменён
                                    </div>
                                );
                            }

                            if (editable) {
                                return (
                                    <div className="bg-blue-50/50 p-3 rounded-xl flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2 text-sm text-blue-800">
                                            <Pencil className="w-4 h-4" />
                                            Доступно редактирование
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3">
                                            {countdown && !order.is_urgent && (
                                                <span className="text-xs text-amber-600 flex items-center gap-1">
                                                    <Clock className="w-3.5 h-3.5" /> ещё {countdown}
                                                </span>
                                            )}
                                            {!order.is_urgent && !['shipped', 'out_for_delivery', 'delivered', 'cancelled'].includes(order.status) && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setExpediteOrderId(order.order_id); }}
                                                    className="text-xs flex items-center gap-1 text-amber-600 hover:text-amber-700 font-medium transition-colors"
                                                >
                                                    <Zap className="w-3.5 h-3.5" /> Ускорить
                                                </button>
                                            )}
                                            <Link href={`/distributor/orders/${order.order_id}/edit`} onClick={(e) => { e.stopPropagation(); document.body.style.overflow = ''; }} className="text-xs bg-blue-600 text-white hover:bg-blue-700 px-3 py-1.5 rounded-lg font-medium transition-colors">
                                                Изменить
                                            </Link>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div className="bg-gray-50 border border-gray-100 p-3 rounded-xl mb-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="flex items-center gap-1 text-sm text-gray-500">
                                            <Lock className="w-4 h-4" /> Редактирование закрыто
                                        </span>
                                        {hasPendingRequest && (
                                            <span className="text-xs text-amber-600 font-medium animate-comment-blink">⏳ Запрос отправлен</span>
                                        )}
                                        {lastAction?.type === 'reject_request' && (
                                            <span className="text-xs text-red-500"><XCircle className="w-3.5 h-3.5 inline mr-1" /> Отклонено</span>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {!hasPendingRequest && (
                                            <div className="flex items-center gap-2">
                                                <button onClick={(e) => { e.stopPropagation(); setShowRequestModal(order.order_id); setRequestType('request_edit'); setRequestReason(''); }} className="flex-1 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 py-2 rounded-lg font-medium flex items-center justify-center gap-1">
                                                    <Pencil className="w-3.5 h-3.5" /> Запросить ред.
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); setShowRequestModal(order.order_id); setRequestType('request_cancel'); setRequestReason(''); }} className="flex-1 text-xs text-red-600 bg-red-50 hover:bg-red-100 py-2 rounded-lg font-medium flex items-center justify-center gap-1">
                                                    <X className="w-3.5 h-3.5" /> Запросить отмену
                                                </button>
                                            </div>
                                        )}
                                        {!order.is_urgent && !['shipped', 'out_for_delivery', 'delivered', 'cancelled'].includes(order.status) && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setExpediteOrderId(order.order_id); }}
                                                className="w-full text-xs text-amber-600 bg-amber-50 hover:bg-amber-100 py-2 rounded-lg font-medium flex items-center justify-center gap-1 mt-1 transition-colors border border-amber-200/50"
                                            >
                                                <Zap className="w-3.5 h-3.5" /> Ускорить заказ
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}

                        {showRequestModal === order.order_id && (
                            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3" onClick={e => e.stopPropagation()}>
                                <p className="text-sm font-medium text-amber-800">
                                    {requestType === 'request_edit' ? (
                                        <span className="inline-flex items-center gap-1.5"><FileEdit className="w-4 h-4" /> Запрос на редактирование</span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5"><XCircle className="w-4 h-4" /> Запрос на отмену заказа</span>
                                    )}
                                </p>
                                <textarea
                                    value={requestReason}
                                    onChange={e => setRequestReason(e.target.value)}
                                    placeholder="Опишите причину..."
                                    className="w-full px-3 py-2 text-sm border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white"
                                    rows={3}
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
                                    <button onClick={() => setShowRequestModal(null)} className="text-sm py-2 px-4 bg-white text-gray-600 rounded-lg border border-gray-200 hover:bg-gray-50 font-medium">Отмена</button>
                                </div>
                            </div>
                        )}

                        <div className="bg-gray-50 rounded-xl p-4 mt-4">
                            <h4 className="text-xs font-semibold text-gray-400 uppercase mb-3 flex items-center gap-1.5">
                                <MessageCircle className="w-3.5 h-3.5" /> Комментарии
                                {((order as any).comments?.length > 0) && (
                                    <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded-full">
                                        {(order as any).comments.length}
                                    </span>
                                )}
                            </h4>

                            {((order as any).comments?.length > 0) && (
                                <div className="space-y-2 mb-3 max-h-64 overflow-y-auto pr-1">
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
                                                            c.role === 'laboratory' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                                                        }`}>
                                                            {c.role === 'laboratory' ? 'Лаборатория' : 'Дистрибьютор'}
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
                                    placeholder="Ваш комментарий..."
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
                                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex-shrink-0"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            {isSelfFulfilled(order) && order.status === 'in_production' && (
                                <button onClick={() => { updateStatus(order.order_id, 'ready'); setSelectedOrderId(null); }}
                                    className="flex-1 btn bg-green-600 hover:bg-green-700 text-white text-sm py-2.5 rounded-xl font-medium">
                                    ✅ Отметить как готов
                                </button>
                            )}
                            {isSelfFulfilled(order) && order.status === 'ready' && (
                                <button onClick={() => { updateStatus(order.order_id, 'shipped'); setSelectedOrderId(null); }}
                                    className="flex-1 btn bg-purple-600 hover:bg-purple-700 text-white text-sm py-2.5 rounded-xl font-medium">
                                    🚚 Отгрузить клинике
                                </button>
                            )}
                            {isSelfFulfilled(order) && (order.status === 'shipped' || order.status === 'out_for_delivery') && (
                                <button onClick={() => { updateStatus(order.order_id, 'delivered'); setSelectedOrderId(null); }}
                                    className="flex-1 btn bg-teal-600 hover:bg-teal-700 text-white text-sm py-2.5 rounded-xl font-medium">
                                    📬 Подтвердить доставку
                                </button>
                            )}

                            {isLabOrder(order) && order.status === 'out_for_delivery' && (
                                <button onClick={() => { updateStatus(order.order_id, 'delivered'); setSelectedOrderId(null); }}
                                    className="flex-1 btn bg-teal-600 hover:bg-teal-700 text-white text-sm py-2.5 rounded-xl font-medium">
                                    <CheckCircle className="w-4 h-4 inline mr-1" /> Подтвердить получение
                                </button>
                            )}

                            {canSeePrices && (
                                <button onClick={() => handlePrintInvoice(order)}
                                    className="btn bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm py-2.5 px-4 rounded-xl font-medium">
                                    <Download className="w-4 h-4 inline mr-1" /> Счёт PDF
                                </button>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    };

    // ==================== RENDER ====================
    return (
        <div className="min-h-screen bg-surface">
            <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold">Дашборд</h1>
                            <p className="text-sm text-gray-400 mt-0.5">{SubRoleLabels[subRole] || 'Дистрибьютор'} • Ключевые показатели</p>
                        </div>
                        <div className="flex flex-wrap gap-2 sm:gap-3">
                            {perms.canCreateOrders && (
                                <Link
                                    href="/distributor/orders/new"
                                    className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-medium transition-colors text-white"
                                >
                                    <Plus className="w-4 h-4" /> Создать заказ
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {perms.canViewStats && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-4">
                            {[
                                { label: 'Новые', value: ordersByStatus.new.length, icon: Clock, bg: 'bg-blue-50', text: 'text-blue-700' },
                                { label: 'В работе', value: ordersByStatus.in_production.length, icon: TruckIcon, bg: 'bg-yellow-50', text: 'text-yellow-700' },
                                { label: 'Готовы', value: ordersByStatus.ready.length, icon: CheckCircle, bg: 'bg-green-50', text: 'text-green-700' },
                                { label: 'Отгружены', value: ordersByStatus.shipped.length, icon: Truck, bg: 'bg-purple-50', text: 'text-purple-700' },
                                { label: 'Доставлены', value: ordersByStatus.delivered.length, icon: Package, bg: 'bg-teal-50', text: 'text-teal-700' },
                            ].map(s => (
                                <div key={s.label} className={`rounded-xl p-3 ${s.bg}`}>
                                    <div className={`text-2xl font-bold mb-0.5 ${s.text}`}>{s.value}</div>
                                    <div className={`text-xs font-medium ${s.text} opacity-90`}>{s.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                    <div className="flex gap-2 flex-1 sm:max-w-md">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Поиск по номеру, пациенту, врачу..."
                                className="input pl-10 w-full text-sm"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        {clinicNames.length > 1 && (
                            <select value={clinicFilter} onChange={e => setClinicFilter(e.target.value)} className="input text-sm w-auto">
                                <option value="all">Все клиники</option>
                                {clinicNames.map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                        )}
                    </div>
                </div>

                {(
                    isLoading ? (
                        <div className="grid grid-cols-5 gap-4">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i}><div className="card"><div className="skeleton h-12" /></div><div className="card mt-3"><div className="skeleton h-24" /></div></div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory sm:snap-none">
                            {renderColumn("Новые", Clock, ordersByStatus.new, "bg-blue-50 text-blue-700")}
                            {renderColumn("В производстве", TruckIcon, ordersByStatus.in_production, "bg-yellow-50 text-yellow-700")}
                            {renderColumn("Готовы", CheckCircle, ordersByStatus.ready, "bg-green-50 text-green-700")}
                            {renderColumn("Отгружены", Truck, ordersByStatus.shipped, "bg-purple-50 text-purple-700")}
                            {renderColumn("Доставлены", Package, ordersByStatus.delivered, "bg-teal-50 text-teal-700")}
                        </div>
                    )
                )}
            </div>

            <AnimatePresence>
                {selectedOrderId && selectedOrder && renderOrderModal()}
            </AnimatePresence>

            {/* Expedite Order Modal */}
            <AnimatePresence>
                {expediteOrderId && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
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
                                    {isExpediting ? <span className="animate-pulse">...</span> : 'Подтвердить'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
