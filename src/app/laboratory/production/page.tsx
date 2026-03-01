'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Clock, CheckCircle, TruckIcon, Package, Printer, User,
    Search, X, Calendar, SlidersHorizontal, AlertTriangle, Ban,
    RotateCcw, Eye, ChevronDown, DollarSign, Zap, Truck, MapPin, Download
} from 'lucide-react';
import type { Order, OrderStatus, DefectRecord, PaymentStatus } from '@/types/order';
import { OrderStatusLabels, CharacteristicLabels, PaymentStatusLabels, PaymentStatusColors, canStartProduction, editWindowRemainingMs } from '@/types/order';
import { ProductionTimer } from '@/components/production/ProductionTimer';
import type { Characteristic } from '@/types/order';
import { getPermissions, SubRoleLabels } from '@/types/user';
import type { SubRole } from '@/types/user';
import * as XLSX from 'xlsx';

export default function ProductionHubPage() {
    const { data: session } = useSession();
    const subRole = (session?.user?.subRole || 'lab_admin') as SubRole;
    const perms = getPermissions(subRole);

    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    // Tick every minute to refresh countdown displays
    const [, setTick] = useState(0);
    useEffect(() => { const t = setInterval(() => setTick(n => n + 1), 60_000); return () => clearInterval(t); }, []);

    // Modal state
    // Modal state - store IDs only to avoid sync issues
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [selectedDefectId, setSelectedDefectId] = useState<{ orderId: string; defectId: string } | null>(null);

    const selectedOrder = useMemo(() =>
        orders.find(o => o.order_id === selectedOrderId) || null,
        [orders, selectedOrderId]
    );

    const selectedDefect = useMemo(() => {
        if (!selectedDefectId) return null;
        const order = orders.find(o => o.order_id === selectedDefectId.orderId);
        if (!order) return null;
        const defect = (order.defects || []).find((d: DefectRecord) => d.id === selectedDefectId.defectId);
        if (!defect) return null;
        return { order, defect };
    }, [orders, selectedDefectId]);

    // Defect form state
    const [defectQty, setDefectQty] = useState('1');
    const [defectNote, setDefectNote] = useState('');
    const [showDefectForm, setShowDefectForm] = useState(false);
    const [addingDefect, setAddingDefect] = useState(false);

    useEffect(() => {
        loadOrders();
        const interval = setInterval(loadOrders, 30000);
        return () => clearInterval(interval);
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

    // Keep selected order in sync after reload


    // ==================== ACTIONS ====================
    const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
        try {
            const response = await fetch(`/api/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            if (response.ok) await loadOrders();
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    };

    const generateTracking = async (orderId: string) => {
        const trackingNumber = `TRK-${Date.now().toString(36).toUpperCase()}`;
        await fetch(`/api/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tracking_number: trackingNumber }),
        });
    };

    const addDefect = async (orderId: string) => {
        const qty = parseInt(defectQty);
        if (isNaN(qty) || qty < 1) return;
        setAddingDefect(true);
        try {
            const response = await fetch(`/api/orders/${orderId}/defects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qty, note: defectNote || undefined }),
            });
            if (response.ok) {
                await loadOrders();
                setShowDefectForm(false);
                setDefectQty('1');
                setDefectNote('');
            }
        } catch (error) {
            console.error('Failed to add defect:', error);
        } finally {
            setAddingDefect(false);
        }
    };

    const exportToExcel = () => {
        const rows = filteredOrders.map(o => ({
            '№ заказа': o.order_id,
            'Пациент': o.patient.name,
            'Телефон': o.patient.phone,
            'Статус': OrderStatusLabels[o.status],
            'Оплата': o.payment_status === 'paid' ? 'Оплачен' : o.payment_status === 'partial' ? 'Частично' : 'Не оплачен',
            'Дата': new Date(o.meta.created_at).toLocaleDateString('ru-RU'),
            'Срочность': o.is_urgent ? 'Срочный' : 'Обычный',
            'Ответственный': o.meta.doctor || o.meta.optic_name || '—',
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Заказы');
        XLSX.writeFile(wb, `LensFlow_Orders_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const toggleDefectArchive = async (orderId: string, defectId: string, archived: boolean) => {
        try {
            const res = await fetch(`/api/orders/${orderId}/defects/${defectId}/archive`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ archived }),
            });
            if (res.ok) await loadOrders();
        } catch (error) {
            console.error('Failed to toggle archive:', error);
        }
    };

    // ==================== PRINT ====================
    // Shared helper: horizontal OD/OS table for print
    const renderEyeTable = (od: any, os: any) => `
        <table style="width:100%;border-collapse:collapse;margin:10px 0;font-size:13px">
            <thead>
                <tr style="background:#f3f4f6">
                    <th style="text-align:left;padding:6px 8px;border:1px solid #d1d5db;font-weight:600">Глаз</th>
                    <th style="text-align:left;padding:6px 8px;border:1px solid #d1d5db;font-weight:600">Характеристика</th>
                    <th style="text-align:center;padding:6px 8px;border:1px solid #d1d5db;font-weight:600">Km</th>
                    <th style="text-align:center;padding:6px 8px;border:1px solid #d1d5db;font-weight:600">TP</th>
                    <th style="text-align:center;padding:6px 8px;border:1px solid #d1d5db;font-weight:600">DIA</th>
                    <th style="text-align:center;padding:6px 8px;border:1px solid #d1d5db;font-weight:600">E</th>
                    <th style="text-align:center;padding:6px 8px;border:1px solid #d1d5db;font-weight:600">Тор.</th>
                    <th style="text-align:center;padding:6px 8px;border:1px solid #d1d5db;font-weight:600">Пробная</th>
                    <th style="text-align:center;padding:6px 8px;border:1px solid #d1d5db;font-weight:600">Цвет</th>
                    <th style="text-align:center;padding:6px 8px;border:1px solid #d1d5db;font-weight:600">Dk</th>

                    <th style="text-align:center;padding:6px 8px;border:1px solid #d1d5db;font-weight:600">Кол-во</th>
                </tr>
            </thead>
            <tbody>
                ${[{ label: 'OD', eye: od }, { label: 'OS', eye: os }].map(({ label, eye }) => `
                    <tr>
                        <td style="padding:6px 8px;border:1px solid #d1d5db;font-weight:700">${label}</td>
                        <td style="padding:6px 8px;border:1px solid #d1d5db">${eye.characteristic ? (CharacteristicLabels[eye.characteristic as Characteristic] || eye.characteristic) : '—'}</td>
                        <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:center">${eye.km ?? '—'}</td>
                        <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:center">${eye.tp ?? '—'}</td>
                        <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:center">${eye.dia ?? '—'}</td>
                        <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:center">${eye.e1 != null ? eye.e1 : '—'}${eye.e2 != null ? ' / ' + eye.e2 : ''}</td>
                        <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:center">${eye.tor ?? '—'}</td>
                        <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:center">${eye.trial ? 'Да' : '—'}</td>
                        <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:center">${eye.color || '—'}</td>
                        <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:center">${eye.dk ?? '—'}</td>

                        <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:center;font-weight:600">${eye.qty ?? 1}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>`;

    const handlePrint = (order: Order) => {
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Заказ ${order.order_id}</title>
            <style>body{font-family:Arial,sans-serif;max-width:900px;margin:0 auto;padding:20px;color:#111}h1{font-size:20px}
            .meta{color:#6b7280;font-size:14px;margin-bottom:20px}.lens-type{font-weight:600;font-size:14px;margin:15px 0 5px;padding:8px 12px;background:#f3f4f6;border-radius:6px}
            @media print{body{padding:0}}</style></head><body>
            <h1>Заказ №${order.order_id}</h1>
            <p class="meta">Врач: ${order.meta.doctor || '—'} | Пациент: ${order.patient.name} | ${order.patient.phone}</p>
            ${order.delivery_method ? `<p style="font-size:14px;margin:8px 0;color:#333"><b>Доставка:</b> ${order.delivery_method}${order.delivery_address ? ' — ' + order.delivery_address : ''}</p>` : ''}
            ${order.notes ? `<div style="font-size:14px;margin:10px 0;padding:10px 14px;background:#fefce8;border:1px solid #fde68a;border-radius:6px"><b>Комментарии:</b> ${order.notes}</div>` : ''}
            <div class="lens-type">Тип линз: Ортокератологическая</div>
            ${renderEyeTable(order.config.eyes.od, order.config.eyes.os)}
            </body></html>`;
        const w = window.open('', '_blank');
        if (w) { w.document.write(html); w.document.close(); w.focus(); w.print(); }
    };

    const printDefect = (order: Order, defect: DefectRecord) => {
        const html = `<html><head><meta charset="utf-8"><title>Акт брака ${defect.id}</title>
            <style>body{font-family:Arial,sans-serif;padding:40px;color:#333;max-width:900px;margin:0 auto}h1{color:#dc2626;border-bottom:2px solid #dc2626;padding-bottom:10px}
            .section{margin:20px 0;padding:15px;background:#fef2f2;border-radius:8px}.section h3{margin:0 0 10px;color:#991b1b}
            .info-table{width:100%;border-collapse:collapse;margin-top:10px}.info-table td,.info-table th{padding:6px 12px;text-align:left;border-bottom:1px solid #fecaca;font-size:14px}
            .info-table th{font-weight:600;color:#991b1b;width:40%}.lens-type{font-weight:600;font-size:14px;margin:15px 0 5px;padding:8px 12px;background:#f3f4f6;border-radius:6px}
            .footer{margin-top:40px;padding-top:20px;border-top:1px solid #ddd}
            .sig{margin-top:50px;display:flex;justify-content:space-between}.sig div{text-align:center;width:40%;border-top:1px solid #333;padding-top:5px;font-size:13px}
            @media print{body{padding:20px}}</style></head><body>
            <h1>Акт брака</h1>
            <div class="section"><h3>Информация о браке</h3><table class="info-table">
                <tr><th>ID брака</th><td>${defect.id}</td></tr>
                <tr><th>Дата</th><td>${new Date(defect.date).toLocaleString('ru-RU')}</td></tr>
                <tr><th>Количество</th><td>${defect.qty} шт.</td></tr>
                ${defect.note ? `<tr><th>Причина</th><td>${defect.note}</td></tr>` : ''}
                <tr><th>Статус</th><td>${defect.archived ? 'Принято в архив ✓' : 'Не принято'}</td></tr>
            </table></div>
            <div class="section"><h3>Данные заказа</h3><table class="info-table">
                <tr><th>Номер заказа</th><td>${order.order_id}</td></tr>
                <tr><th>Дата заказа</th><td>${new Date(order.meta.created_at).toLocaleString('ru-RU')}</td></tr>
                <tr><th>Пациент</th><td>${order.patient.name}</td></tr>
                <tr><th>Телефон</th><td>${order.patient.phone}</td></tr>
                <tr><th>Врач</th><td>${order.meta.doctor || '—'}</td></tr>
                <tr><th>Оптика</th><td>${order.meta.optic_name || '—'}</td></tr>
            </table></div>
            <div class="lens-type">Тип линз: Ортокератологическая</div>
            ${renderEyeTable(order.config.eyes.od, order.config.eyes.os)}
            <div class="footer"><p style="font-size:13px;color:#666">Дата печати: ${new Date().toLocaleString('ru-RU')}</p>
            <div class="sig"><div>Ответственный</div><div>Принял</div></div></div></body></html>`;
        const w = window.open('', '_blank');
        if (w) { w.document.write(html); w.document.close(); w.focus(); w.print(); }
    };

    // ==================== FILTERING ====================
    const filteredOrders = useMemo(() => {
        let result = [...orders];
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            result = result.filter(o =>
                o.order_id.toLowerCase().includes(q) ||
                o.patient.name.toLowerCase().includes(q) ||
                (o.meta.doctor || '').toLowerCase().includes(q)
            );
        }
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
    }, [orders, searchQuery, dateFrom, dateTo]);

    const ordersByStatus = {
        new: filteredOrders.filter(o => o.status === 'new'),
        in_production: filteredOrders.filter(o => o.status === 'in_production'),
        ready: filteredOrders.filter(o => o.status === 'ready'),
        rework: filteredOrders.filter(o => o.status === 'rework'),
        shipped: filteredOrders.filter(o => o.status === 'shipped'),
        out_for_delivery: filteredOrders.filter(o => o.status === 'out_for_delivery'),
        delivered: filteredOrders.filter(o => o.status === 'delivered'),
    };

    const allDefects = useMemo(() => {
        const result: { order: Order; defect: DefectRecord }[] = [];
        orders.forEach(order => {
            (order.defects || []).forEach((defect: DefectRecord) => {
                result.push({ order, defect });
            });
        });
        result.sort((a, b) => new Date(b.defect.date).getTime() - new Date(a.defect.date).getTime());
        return result;
    }, [orders]);

    const hasActiveFilters = searchQuery || dateFrom || dateTo;

    // ==================== PARAM ROW HELPER ====================
    const ParamRow = ({ label, value }: { label: string; value: any }) => (
        value != null && value !== '' ? (
            <div className="flex justify-between text-xs py-1 border-b border-gray-50">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium text-gray-800">{String(value)}</span>
            </div>
        ) : null
    );

    const EyeSection = ({ label, eye, color }: { label: string; eye: any; color: string }) => (
        <div className="space-y-0.5">
            <h5 className={`text-xs font-semibold ${color} mb-1`}>{label}</h5>
            <ParamRow label="Характеристика" value={eye.characteristic ? CharacteristicLabels[eye.characteristic as Characteristic] : undefined} />
            <ParamRow label="Km" value={eye.km} />
            <ParamRow label="TP" value={eye.tp} />
            <ParamRow label="DIA" value={eye.dia} />
            <ParamRow label="E1 / E2" value={eye.e1 != null ? `${eye.e1}${eye.e2 != null ? ' / ' + eye.e2 : ''}` : undefined} />
            <ParamRow label="Тор." value={eye.tor} />
            <ParamRow label="Dk" value={eye.dk} />
            <ParamRow label="Цвет" value={eye.color} />
            <ParamRow label="Пробная" value={eye.trial ? 'Да' : undefined} />
            <ParamRow label="Апик. клиренс" value={eye.apical_clearance} />
            <ParamRow label="Фактор компр." value={eye.compression_factor} />
            <ParamRow label="Кол-во" value={eye.qty} />
        </div>
    );

    // ==================== COMPACT KANBAN CARD ====================
    const updatePaymentStatus = async (orderId: string, paymentStatus: PaymentStatus) => {
        try {
            const res = await fetch(`/api/orders/${orderId}/payment`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ payment_status: paymentStatus }),
            });
            if (res.ok) {
                const updated = await res.json();
                setOrders(prev => prev.map(o => o.order_id === orderId ? updated : o));
            }
        } catch (err) {
            console.error('Failed to update payment status:', err);
        }
    };

    const OrderCard = ({ order }: { order: Order }) => {
        const od = order.config.eyes.od;
        const os = order.config.eyes.os;
        const charLabel = od.characteristic
            ? CharacteristicLabels[od.characteristic as Characteristic]
            : '—';
        const defectCount = (order.defects || []).reduce((s: number, d: DefectRecord) => s + d.qty, 0);
        const payStatus = (order as any).payment_status || 'unpaid';

        return (
            <div
                onClick={() => { setSelectedOrderId(order.order_id); setShowDefectForm(false); }}
                className="card cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group"
            >
                <div className="space-y-2">
                    <div className="flex items-start justify-between">
                        <div>
                            <h4 className="font-semibold text-gray-900 text-sm group-hover:text-blue-700 transition-colors">
                                {order.order_id}
                            </h4>
                            <p className="text-xs text-gray-600">{order.patient.name}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <span className="text-xs text-gray-400">
                                {new Date(order.meta.created_at).toLocaleDateString('ru-RU')}
                            </span>
                            {order.is_urgent && (
                                <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 rounded px-1.5 py-0.5">
                                    <Zap className="w-2.5 h-2.5" /> СРОЧНО
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="bg-gray-100 rounded px-1.5 py-0.5">{charLabel}</span>
                        <span>Km: {od.km ?? '—'}</span>
                        <span>Dk: {od.dk ?? '—'}</span>
                    </div>

                    {order.status === 'in_production' && order.production_started_at && (
                        <ProductionTimer startTime={order.production_started_at} />
                    )}

                    {defectCount > 0 && (
                        <div className="flex items-center gap-1 text-xs text-red-600 font-medium">
                            <AlertTriangle className="w-3 h-3" />
                            Браки: {defectCount} шт.
                        </div>
                    )}

                    <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-gray-100">
                        {order.meta.doctor ? (
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                                <User className="w-3 h-3" />
                                {order.meta.doctor}
                            </div>
                        ) : <div />}
                        <div className="flex items-center gap-1.5 text-[11px]">
                            <span className={`w-2 h-2 rounded-full ${payStatus === 'paid' ? 'bg-emerald-500' : payStatus === 'partial' ? 'bg-amber-500' : 'bg-gray-300'
                                }`} />
                            <span className={`font-medium ${payStatus === 'paid' ? 'text-emerald-600' : payStatus === 'partial' ? 'text-amber-600' : 'text-gray-400'
                                }`}>
                                {PaymentStatusLabels[payStatus as PaymentStatus]}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // ==================== COLUMN ====================
    const Column = ({ title, icon: Icon, orders: colOrders, color }: {
        title: string; icon: any; orders: Order[]; color: string;
    }) => (
        <div className="flex-shrink-0 w-[75vw] sm:w-auto sm:flex-1 min-w-0 sm:min-w-[240px]">
            <div className={`card mb-4 ${color}`}>
                <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5" />
                    <h3 className="font-semibold">{title}</h3>
                    <span className="ml-auto bg-white/50 rounded-full px-2 py-0.5 text-sm font-medium">
                        {colOrders.length}
                    </span>
                </div>
            </div>
            <div className="space-y-3">
                {colOrders.length === 0 ? (
                    <div className="card text-center py-8 text-gray-400">
                        <p className="text-sm">Нет заказов</p>
                    </div>
                ) : (
                    colOrders.map(order => <OrderCard key={order.order_id} order={order} />)
                )}
            </div>
        </div>
    );

    // ==================== ORDER DETAIL MODAL ====================
    const OrderModal = () => {
        if (!selectedOrder) return null;
        const order = selectedOrder;
        const od = order.config.eyes.od;
        const os = order.config.eyes.os;
        const canAddDefect = order.status === 'in_production' || order.status === 'ready' || order.status === 'rework';

        return (
            <div
                className="fixed inset-0 z-50 flex items-start justify-center p-2 sm:p-4 pt-[2vh] sm:pt-[5vh] overflow-y-auto"
                onClick={() => setSelectedOrderId(null)}
            >
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    onClick={e => e.stopPropagation()}
                    className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mb-[5vh] max-h-[90vh] sm:max-h-none overflow-y-auto"
                >
                    {/* Header */}
                    <div className="sticky top-0 bg-white border-b border-gray-100 px-4 sm:px-6 py-3 sm:py-4 rounded-t-2xl flex items-center justify-between z-10">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Заказ {order.order_id}</h2>
                            <p className="text-sm text-gray-500">
                                {OrderStatusLabels[order.status]} • {new Date(order.meta.created_at).toLocaleDateString('ru-RU')}
                            </p>
                        </div>
                        <button
                            onClick={() => setSelectedOrderId(null)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    <div className="px-4 sm:px-6 py-4 space-y-5">
                        {/* Patient & meta info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <h4 className="text-xs font-semibold text-gray-400 uppercase">Пациент</h4>
                                <p className="text-sm font-medium text-gray-900">{order.patient.name}</p>
                                <p className="text-xs text-gray-500">{order.patient.phone}</p>
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-xs font-semibold text-gray-400 uppercase">Ответственный</h4>
                                <p className="text-sm font-medium text-gray-900">{order.meta.doctor || order.meta.optic_name || '—'}</p>
                                {order.company && <p className="text-xs text-gray-500">{order.company}{order.inn ? ` | ИНН: ${order.inn}` : ''}</p>}
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

                        {/* Payment status toggle — only visible to roles with canViewPayments */}
                        {perms.canViewPayments && (
                            <div className="bg-gray-50 rounded-xl p-4">
                                <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Оплата</h4>
                                <div className="flex gap-2">
                                    {(['unpaid', 'partial', 'paid'] as PaymentStatus[]).map((ps) => {
                                        const current = (order as any).payment_status || 'unpaid';
                                        const isActive = current === ps;
                                        return (
                                            <button
                                                key={ps}
                                                onClick={() => perms.canChangePayments && updatePaymentStatus(order.order_id, ps)}
                                                disabled={!perms.canChangePayments}
                                                className={`
                                                flex-1 text-xs font-semibold py-2 px-3 rounded-lg transition-all
                                                ${!perms.canChangePayments ? 'cursor-default' : ''}
                                                ${isActive
                                                        ? `${PaymentStatusColors[ps]} ring-2 ring-offset-1 ${ps === 'paid' ? 'ring-emerald-300' : ps === 'partial' ? 'ring-amber-300' : 'ring-gray-300'
                                                        }`
                                                        : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
                                                    }
                                            `}
                                            >
                                                <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${ps === 'paid' ? 'bg-emerald-500' : ps === 'partial' ? 'bg-amber-500' : 'bg-gray-400'
                                                    }`} />
                                                {PaymentStatusLabels[ps]}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Production timer */}
                        {order.status === 'in_production' && order.production_started_at && (
                            <ProductionTimer startTime={order.production_started_at} />
                        )}

                        {/* Eye parameters — table format */}
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                <span className="text-xs font-semibold text-gray-700">Тип линз: Ортокератологическая</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200">
                                            <th className="text-left px-3 py-2 font-semibold text-gray-600 whitespace-nowrap">Глаз</th>
                                            <th className="text-left px-3 py-2 font-semibold text-gray-600 whitespace-nowrap">Характеристика</th>
                                            <th className="text-center px-2 py-2 font-semibold text-gray-600">Km</th>
                                            <th className="text-center px-2 py-2 font-semibold text-gray-600">TP</th>
                                            <th className="text-center px-2 py-2 font-semibold text-gray-600">DIA</th>
                                            <th className="text-center px-2 py-2 font-semibold text-gray-600">E</th>
                                            <th className="text-center px-2 py-2 font-semibold text-gray-600 whitespace-nowrap">Тор.</th>
                                            <th className="text-center px-2 py-2 font-semibold text-gray-600 whitespace-nowrap">Пробная</th>
                                            <th className="text-center px-2 py-2 font-semibold text-gray-600">Цвет</th>
                                            <th className="text-center px-2 py-2 font-semibold text-gray-600">Dk</th>

                                            <th className="text-center px-2 py-2 font-semibold text-gray-600 whitespace-nowrap">Кол-во</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[{ label: 'OD', eye: od }, { label: 'OS', eye: os }].map(({ label, eye }) => (
                                            <tr key={label} className="border-b border-gray-100 last:border-b-0 hover:bg-blue-50/30">
                                                <td className="px-3 py-2 font-bold text-gray-900">{label}</td>
                                                <td className="px-3 py-2 text-gray-700">{eye.characteristic ? CharacteristicLabels[eye.characteristic as Characteristic] : '—'}</td>
                                                <td className="px-2 py-2 text-center text-gray-700">{eye.km ?? '—'}</td>
                                                <td className="px-2 py-2 text-center text-gray-700">{eye.tp ?? '—'}</td>
                                                <td className="px-2 py-2 text-center text-gray-700">{eye.dia ?? '—'}</td>
                                                <td className="px-2 py-2 text-center text-gray-700">{eye.e1 != null ? `${eye.e1}${eye.e2 != null ? ' / ' + eye.e2 : ''}` : '—'}</td>
                                                <td className="px-2 py-2 text-center text-gray-700">{eye.tor ?? '—'}</td>
                                                <td className="px-2 py-2 text-center text-gray-700">{eye.trial ? 'Да' : '—'}</td>
                                                <td className="px-2 py-2 text-center text-gray-700">{eye.color ?? '—'}</td>
                                                <td className="px-2 py-2 text-center text-gray-700">{eye.dk ?? '—'}</td>

                                                <td className="px-2 py-2 text-center font-medium text-gray-900">{eye.qty ?? 1}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Existing defects */}
                        {order.defects && order.defects.length > 0 && (
                            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                                <h4 className="text-sm font-semibold text-red-700 flex items-center gap-1.5 mb-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    Браки ({order.defects.reduce((s: number, d: DefectRecord) => s + d.qty, 0)} шт.)
                                </h4>
                                <div className="space-y-1.5">
                                    {order.defects.map((d: DefectRecord) => (
                                        <div key={d.id} className="flex items-center justify-between text-xs text-red-600 bg-white rounded-lg px-3 py-2">
                                            <span>{new Date(d.date).toLocaleDateString('ru-RU')} — {d.qty} шт.</span>
                                            {d.note && <span className="text-red-400 ml-2">({d.note})</span>}
                                            {d.archived && <span className="text-green-600 ml-auto">✅ Архив</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Add defect form — only for roles with canAddDefects */}
                        {canAddDefect && perms.canAddDefects && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
                                <p className="text-sm font-medium text-red-700 flex items-center gap-1.5">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    Добавить брак
                                </p>
                                <div className="flex gap-2">
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Кол-во</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={defectQty}
                                            onChange={e => setDefectQty(e.target.value)}
                                            className="input w-24 text-sm"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs text-gray-600 mb-1">Причина (необяз.)</label>
                                        <input
                                            type="text"
                                            value={defectNote}
                                            onChange={e => setDefectNote(e.target.value)}
                                            className="input w-full text-sm"
                                            placeholder="Царапины, сколы..."
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={() => addDefect(order.order_id)}
                                    disabled={addingDefect}
                                    className="btn text-xs py-2 px-4 w-full bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
                                >
                                    {addingDefect ? 'Сохранение...' : 'Сохранить брак'}
                                </button>
                            </div>
                        )}

                        {/* Status actions — gated by permissions */}
                        <div className="flex gap-2 pt-2 border-t border-gray-100">
                            {perms.canPrint && (
                                <button
                                    onClick={() => handlePrint(order)}
                                    className="btn btn-secondary text-xs py-2 px-3 gap-1.5"
                                >
                                    <Printer className="w-3.5 h-3.5" />
                                    Печать
                                </button>
                            )}

                            {perms.canChangeStatus && order.status === 'new' && (() => {
                                const canStart = canStartProduction(order);
                                const remainMs = editWindowRemainingMs(order);
                                const h = Math.floor(remainMs / 3600_000);
                                const m = Math.floor((remainMs % 3600_000) / 60_000);
                                const countdownStr = h > 0 ? `${h}ч ${m}м` : `${m}м`;
                                return (
                                    <div className="flex-1">
                                        {!canStart && (
                                            <div className="text-xs text-amber-600 flex items-center gap-1 mb-1.5">
                                                <Clock className="w-3.5 h-3.5" />
                                                Доступно через {countdownStr} — врач редактирует
                                            </div>
                                        )}
                                        <button
                                            onClick={() => { if (canStart) { updateOrderStatus(order.order_id, 'in_production'); setSelectedOrderId(null); } }}
                                            disabled={!canStart}
                                            title={!canStart ? `Заказ можно взять в работу через ${countdownStr}` : undefined}
                                            className={`btn text-xs py-2 px-4 w-full ${canStart ? 'btn-primary' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                                        >
                                            {canStart ? 'В работу' : `Заблокировано (${countdownStr})`}
                                        </button>
                                    </div>
                                );
                            })()}

                            {perms.canMarkReady && order.status === 'in_production' && (
                                <button
                                    onClick={() => { updateOrderStatus(order.order_id, 'ready'); setSelectedOrderId(null); }}
                                    className="btn btn-primary text-xs py-2 px-4 flex-1"
                                >
                                    Готово
                                </button>
                            )}
                            {order.status === 'ready' && (
                                <>
                                    {perms.canMarkRework && (
                                        <button
                                            onClick={() => { updateOrderStatus(order.order_id, 'rework'); setSelectedOrderId(null); }}
                                            className="btn text-xs py-2 px-3 bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors gap-1.5"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5" />
                                            На доработку
                                        </button>
                                    )}
                                    {perms.canShip && (
                                        <button
                                            onClick={async () => {
                                                await generateTracking(order.order_id);
                                                await updateOrderStatus(order.order_id, 'shipped');
                                                setSelectedOrderId(null);
                                            }}
                                            className="btn btn-primary text-xs py-2 px-4 flex-1"
                                        >
                                            Отгрузить
                                        </button>
                                    )}
                                </>
                            )}
                            {perms.canChangeStatus && order.status === 'rework' && (
                                <button
                                    onClick={() => { updateOrderStatus(order.order_id, 'in_production'); setSelectedOrderId(null); }}
                                    className="btn btn-primary text-xs py-2 px-4 flex-1"
                                >
                                    Вернуть в работу
                                </button>
                            )}

                            {/* Logistician: take shipped order out for delivery */}
                            {perms.canDeliver && order.status === 'shipped' && (
                                <button
                                    onClick={() => { updateOrderStatus(order.order_id, 'out_for_delivery'); setSelectedOrderId(null); }}
                                    className="btn btn-primary text-xs py-2 px-4 flex-1 gap-1.5"
                                >
                                    <Truck className="w-3.5 h-3.5" />
                                    Передать в доставку
                                </button>
                            )}

                            {/* Delivered: show confirmation pending */}
                            {order.status === 'out_for_delivery' && (
                                <div className="flex-1 flex items-center gap-2 text-xs text-purple-700 bg-purple-50 rounded-lg px-3 py-2">
                                    <MapPin className="w-3.5 h-3.5" />
                                    Ждём подтверждения от врача
                                </div>
                            )}

                            {order.status === 'delivered' && (
                                <div className="flex-1 flex items-center gap-2 text-xs text-teal-700 bg-teal-50 rounded-lg px-3 py-2">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    Получение подтверждено
                                    {order.delivered_at && <span className="ml-auto text-teal-500">{new Date(order.delivered_at).toLocaleDateString('ru-RU')}</span>}
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    };

    // ==================== DEFECT DETAIL MODAL ====================
    const DefectModal = () => {
        if (!selectedDefect) return null;
        const { order, defect } = selectedDefect;

        return (
            <div
                className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh] overflow-y-auto"
                onClick={() => setSelectedDefectId(null)}
            >
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    onClick={e => e.stopPropagation()}
                    className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mb-[5vh]"
                >
                    <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 rounded-t-2xl flex items-center justify-between z-10">
                        <div>
                            <h2 className="text-lg font-bold text-red-700 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5" />
                                Акт брака
                            </h2>
                            <p className="text-sm text-gray-500">{defect.id}</p>
                        </div>
                        <button onClick={() => setSelectedDefectId(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    <div className="px-6 py-4 space-y-4">
                        {/* Defect info */}
                        <div className="bg-red-50 rounded-xl p-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Количество</span>
                                <span className="font-bold text-red-700">{defect.qty} шт.</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Дата</span>
                                <span className="font-medium">{new Date(defect.date).toLocaleString('ru-RU')}</span>
                            </div>
                            {defect.note && (
                                <div className="text-sm">
                                    <span className="text-gray-600">Причина: </span>
                                    <span className="font-medium">{defect.note}</span>
                                </div>
                            )}
                        </div>

                        {/* Order info */}
                        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                            <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Данные заказа</h4>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Заказ</span>
                                <span className="font-semibold">{order.order_id}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Пациент</span>
                                <span className="font-medium">{order.patient.name}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Телефон</span>
                                <span className="font-medium">{order.patient.phone}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Врач</span>
                                <span className="font-medium">{order.meta.doctor || '—'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Оптика</span>
                                <span className="font-medium">{order.meta.optic_name || '—'}</span>
                            </div>
                        </div>

                        {/* Lens params — table format */}
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                <span className="text-xs font-semibold text-gray-700">Параметры линз</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200">
                                            <th className="text-left px-3 py-2 font-semibold text-gray-600">Глаз</th>
                                            <th className="text-left px-3 py-2 font-semibold text-gray-600 whitespace-nowrap">Характеристика</th>
                                            <th className="text-center px-2 py-2 font-semibold text-gray-600">Km</th>
                                            <th className="text-center px-2 py-2 font-semibold text-gray-600">TP</th>
                                            <th className="text-center px-2 py-2 font-semibold text-gray-600">DIA</th>
                                            <th className="text-center px-2 py-2 font-semibold text-gray-600">E</th>
                                            <th className="text-center px-2 py-2 font-semibold text-gray-600">Тор.</th>
                                            <th className="text-center px-2 py-2 font-semibold text-gray-600">Пробная</th>
                                            <th className="text-center px-2 py-2 font-semibold text-gray-600">Цвет</th>
                                            <th className="text-center px-2 py-2 font-semibold text-gray-600">Dk</th>

                                            <th className="text-center px-2 py-2 font-semibold text-gray-600 whitespace-nowrap">Кол-во</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[{ label: 'OD', eye: order.config.eyes.od }, { label: 'OS', eye: order.config.eyes.os }].map(({ label, eye }) => (
                                            <tr key={label} className="border-b border-gray-100 last:border-b-0 hover:bg-blue-50/30">
                                                <td className="px-3 py-2 font-bold text-gray-900">{label}</td>
                                                <td className="px-3 py-2 text-gray-700">{eye.characteristic ? CharacteristicLabels[eye.characteristic as Characteristic] : '—'}</td>
                                                <td className="px-2 py-2 text-center text-gray-700">{eye.km ?? '—'}</td>
                                                <td className="px-2 py-2 text-center text-gray-700">{eye.tp ?? '—'}</td>
                                                <td className="px-2 py-2 text-center text-gray-700">{eye.dia ?? '—'}</td>
                                                <td className="px-2 py-2 text-center text-gray-700">{eye.e1 != null ? `${eye.e1}${eye.e2 != null ? ' / ' + eye.e2 : ''}` : '—'}</td>
                                                <td className="px-2 py-2 text-center text-gray-700">{eye.tor ?? '—'}</td>
                                                <td className="px-2 py-2 text-center text-gray-700">{eye.trial ? 'Да' : '—'}</td>
                                                <td className="px-2 py-2 text-center text-gray-700">{eye.color ?? '—'}</td>
                                                <td className="px-2 py-2 text-center text-gray-700">{eye.dk ?? '—'}</td>

                                                <td className="px-2 py-2 text-center font-medium text-gray-900">{eye.qty ?? 1}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Archive checkbox */}
                        <label className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${defect.archived ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                            }`}>
                            <input
                                type="checkbox"
                                checked={defect.archived || false}
                                onChange={(e) => toggleDefectArchive(order.order_id, defect.id, e.target.checked)}
                                className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                            <span className={`text-sm font-medium ${defect.archived ? 'text-green-700' : 'text-gray-600'}`}>
                                {defect.archived ? '✅ Принято в архив' : 'Принято в архив'}
                            </span>
                        </label>

                        {/* Actions */}
                        <div className="flex gap-2 pt-2 border-t border-gray-100">
                            <button
                                onClick={() => printDefect(order, defect)}
                                className="btn btn-secondary text-xs py-2 px-4 flex-1 gap-1.5"
                            >
                                <Printer className="w-3.5 h-3.5" />
                                Печать акта брака
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    };

    // ==================== LOADING STATE ====================
    if (isLoading) {
        return (
            <div className="min-h-screen bg-surface flex items-center justify-center">
                <div className="text-center">
                    <div className="skeleton w-12 h-12 rounded-full mx-auto mb-4" />
                    <p className="text-gray-600">Загрузка...</p>
                </div>
            </div>
        );
    }

    // ==================== RENDER ====================
    return (
        <div className="min-h-screen bg-surface">
            {/* Header */}
            <div className="bg-surface-elevated border-b border-border">
                <div className="max-w-[1800px] mx-auto px-4 sm:px-6 py-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Производственный хаб</h1>
                            <p className="text-sm text-gray-600 mt-0.5">Управление очередью заказов</p>
                        </div>
                        <div className="text-sm text-gray-500">
                            Всего {filteredOrders.length} {hasActiveFilters ? `из ${orders.length}` : ''} заказов
                        </div>
                    </div>

                    {/* Search + filters */}
                    <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
                        <div className="relative flex-1 min-w-[180px] max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Поиск по номеру, пациенту, врачу..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="input pl-10 w-full"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'} gap-2 whitespace-nowrap`}
                        >
                            <SlidersHorizontal className="w-4 h-4" />
                            Фильтры
                        </button>
                        {hasActiveFilters && (
                            <button
                                onClick={() => { setSearchQuery(''); setDateFrom(''); setDateTo(''); }}
                                className="btn btn-secondary gap-1 text-red-500 whitespace-nowrap"
                            >
                                <X className="w-4 h-4" />
                                Сбросить
                            </button>
                        )}
                        <button
                            onClick={exportToExcel}
                            className="btn btn-secondary gap-2 whitespace-nowrap ml-auto"
                        >
                            <Download className="w-4 h-4" />
                            Экспорт XLS
                        </button>
                    </div>

                    <AnimatePresence>
                        {showFilters && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                            <Calendar className="w-3.5 h-3.5 inline mr-1" />Дата от
                                        </label>
                                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input w-full" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                            <Calendar className="w-3.5 h-3.5 inline mr-1" />Дата до
                                        </label>
                                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input w-full" />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Main Content — Kanban for most roles, Payments list for lab_accountant */}
            {!perms.canViewKanban ? (
                /* Accountant view: simple payments list */
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
                    <div className="card mb-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                <DollarSign className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Статусы оплат</h2>
                                <p className="text-sm text-gray-500">{SubRoleLabels[subRole]}</p>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {filteredOrders.length === 0 ? (
                            <div className="card text-center py-12 text-gray-400">
                                <p>Нет заказов для отображения</p>
                            </div>
                        ) : (
                            filteredOrders.map(order => {
                                const ps = (order as any).payment_status || 'unpaid';
                                return (
                                    <div key={order.order_id} className="card hover:shadow-md transition-all cursor-pointer" onClick={() => setSelectedOrderId(order.order_id)}>
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div className="flex items-center gap-3">
                                                <div className="min-w-0">
                                                    <h4 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{order.order_id}</h4>
                                                    <p className="text-xs sm:text-sm text-gray-500 truncate">{order.patient.name}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                                                <span className={`text-xs sm:text-sm px-2 sm:px-3 py-1 rounded-lg ${OrderStatusLabels[order.status] ? 'bg-gray-100 text-gray-700' : ''}`}>
                                                    {OrderStatusLabels[order.status]}
                                                </span>
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${ps === 'paid' ? 'bg-emerald-500' : ps === 'partial' ? 'bg-amber-500' : 'bg-gray-300'}`} />
                                                    <span className={`text-xs sm:text-sm font-medium ${ps === 'paid' ? 'text-emerald-600' : ps === 'partial' ? 'text-amber-600' : 'text-gray-400'}`}>
                                                        {PaymentStatusLabels[ps as PaymentStatus]}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            ) : (
                /* Kanban Board */
                <div className="max-w-[1800px] mx-auto px-3 sm:px-6 py-4 sm:py-8">
                    <div className="flex gap-3 sm:gap-5 overflow-x-auto pb-4 snap-x snap-mandatory" style={{ WebkitOverflowScrolling: 'touch' }}>
                        <Column title="Новые" icon={Package} orders={ordersByStatus.new} color="bg-blue-50 text-blue-700" />
                        <Column title="В производстве" icon={Clock} orders={ordersByStatus.in_production} color="bg-yellow-50 text-yellow-700" />
                        <Column title="Готово" icon={CheckCircle} orders={ordersByStatus.ready} color="bg-green-50 text-green-700" />
                        <Column title="На доработку" icon={RotateCcw} orders={ordersByStatus.rework} color="bg-orange-50 text-orange-700" />
                        <Column title="Отгружено" icon={TruckIcon} orders={ordersByStatus.shipped} color="bg-gray-50 text-gray-700" />
                        <Column title="В доставке" icon={Truck} orders={ordersByStatus.out_for_delivery} color="bg-purple-50 text-purple-700" />
                        <Column title="Доставлено" icon={CheckCircle} orders={ordersByStatus.delivered} color="bg-teal-50 text-teal-700" />

                        {/* Defects Column */}
                        <div className="flex-shrink-0 w-[75vw] sm:w-auto sm:flex-1 min-w-0 sm:min-w-[240px]">
                            <div className="card mb-4 bg-red-50 text-red-700">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5" />
                                    <h3 className="font-semibold">Браки</h3>
                                    <span className="ml-auto bg-white/50 rounded-full px-2 py-0.5 text-sm font-medium">
                                        {allDefects.length}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {allDefects.length === 0 ? (
                                    <div className="card text-center py-8 text-gray-400">
                                        <p className="text-sm">Нет браков</p>
                                    </div>
                                ) : (
                                    allDefects.map(({ order, defect }) => (
                                        <div
                                            key={defect.id}
                                            onClick={() => setSelectedDefectId({ orderId: order.order_id, defectId: defect.id })}
                                            className={`card cursor-pointer hover:shadow-md transition-all border-l-4 ${defect.archived
                                                ? 'border-l-green-400 bg-green-50/30'
                                                : 'border-l-red-400 bg-red-50/50'
                                                }`}
                                        >
                                            <div className="space-y-1.5">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <h4 className="font-semibold text-gray-900 text-sm">{order.order_id}</h4>
                                                        <p className="text-xs text-gray-600">{order.patient.name}</p>
                                                    </div>
                                                    <span className="text-xs text-gray-500">
                                                        {new Date(defect.date).toLocaleDateString('ru-RU')}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-100 text-red-700 text-xs font-semibold">
                                                        <Ban className="w-3 h-3" />
                                                        {defect.qty} шт.
                                                    </span>
                                                    {defect.archived && (
                                                        <span className="text-xs text-green-600 font-medium">✅ Архив</span>
                                                    )}
                                                </div>
                                                {defect.note && (
                                                    <p className="text-xs text-gray-500 truncate">{defect.note}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modals — called as functions, NOT as <Component/>, to avoid
                React treating them as new component types each render which
                causes unmount/remount (= the "jump") on every keystroke */}
            {selectedOrder && OrderModal()}
            {selectedDefect && DefectModal()}
        </div>
    );
}
