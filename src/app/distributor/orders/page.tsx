'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, ArrowRight, Package, FlaskConical, CheckCircle2,
    X, ChevronDown, Building2, Phone, AlertCircle
} from 'lucide-react';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    new: { label: 'Новый', color: 'bg-blue-100 text-blue-700' },
    in_production: { label: 'В работе', color: 'bg-amber-100 text-amber-700' },
    ready: { label: 'Готов', color: 'bg-green-100 text-green-700' },
    rework: { label: 'Доработка', color: 'bg-orange-100 text-orange-700' },
    shipped: { label: 'Отправлен', color: 'bg-indigo-100 text-indigo-700' },
    out_for_delivery: { label: 'Доставляется', color: 'bg-purple-100 text-purple-700' },
    delivered: { label: 'Выдан', color: 'bg-gray-100 text-gray-600' },
    cancelled: { label: 'Отменён', color: 'bg-red-100 text-red-500' },
};

const STATUS_TABS = [
    { key: '', label: 'Все' },
    { key: 'new', label: 'Новые' },
    { key: 'in_production', label: 'В работе' },
    { key: 'ready', label: 'Готовы' },
    { key: 'delivered', label: 'Выданы' },
];

interface Lab { id: string; name: string; phone: string | null; city: string | null; }

export default function DistributorOrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('');

    // Lab modal state
    const [labs, setLabs] = useState<Lab[]>([]);
    const [defaultLabId, setDefaultLabId] = useState<string | null>(null);
    const [sendingOrder, setSendingOrder] = useState<any | null>(null);
    const [selectedLabId, setSelectedLabId] = useState('');
    const [showLabDropdown, setShowLabDropdown] = useState(false);
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);
    const [sentOrders, setSentOrders] = useState<Set<string>>(new Set());

    const loadOrders = useCallback(() => {
        setLoading(true);
        const url = activeTab ? `/api/orders?status=${activeTab}` : '/api/orders';
        fetch(url)
            .then(r => r.json())
            .then(data => setOrders(Array.isArray(data) ? data : []))
            .finally(() => setLoading(false));
    }, [activeTab]);

    useEffect(() => { loadOrders(); }, [loadOrders]);

    useEffect(() => {
        // Load labs and default lab setting
        Promise.all([
            fetch('/api/labs').then(r => r.json()),
            fetch('/api/distributors/settings').then(r => r.json()),
        ]).then(([labsData, settings]) => {
            setLabs(Array.isArray(labsData) ? labsData : []);
            setDefaultLabId(settings?.defaultLabId || null);
        }).catch(() => {});
    }, []);

    const filtered = orders.filter(o => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            o.order_id?.toLowerCase().includes(q) ||
            o.patient?.name?.toLowerCase().includes(q) ||
            o.meta?.optic_name?.toLowerCase().includes(q)
        );
    });

    const openSendModal = (order: any) => {
        setSendingOrder(order);
        setSelectedLabId(defaultLabId || (labs[0]?.id || ''));
        setSendError(null);
        setShowLabDropdown(false);
    };

    const handleSendToLab = async () => {
        if (!sendingOrder || !selectedLabId) return;
        setSending(true);
        setSendError(null);
        try {
            const res = await fetch(`/api/orders/${sendingOrder.order_id}/send-to-lab`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ labOrgId: selectedLabId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Ошибка');
            setSentOrders(prev => new Set([...prev, sendingOrder.order_id]));
            setSendingOrder(null);
        } catch (e: any) {
            setSendError(e.message);
        } finally {
            setSending(false);
        }
    };

    const selectedLab = labs.find(l => l.id === selectedLabId);

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900">Заказы</h1>
                    <p className="text-gray-500 mt-0.5 text-sm">Заказы оптик, назначенные вашей компании</p>
                </div>
                {defaultLabId && labs.find(l => l.id === defaultLabId) && (
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-xl">
                        <FlaskConical className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="text-xs font-semibold text-indigo-700">
                            Лаб: {labs.find(l => l.id === defaultLabId)?.name}
                        </span>
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Поиск по номеру, пациенту, оптике..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                </div>
            </div>

            {/* Status tabs */}
            <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
                {STATUS_TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            activeTab === tab.key
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Orders table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-gray-400">
                        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
                        Загрузка...
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">
                        <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p>Заказы не найдены</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-xs text-gray-500 uppercase border-b border-gray-100">
                                    <th className="text-left px-5 py-3 font-semibold">№ Заказа</th>
                                    <th className="text-left px-4 py-3 font-semibold">Пациент</th>
                                    <th className="text-left px-4 py-3 font-semibold">Оптика</th>
                                    <th className="text-left px-4 py-3 font-semibold">Дата</th>
                                    <th className="text-left px-4 py-3 font-semibold">Сумма</th>
                                    <th className="text-left px-4 py-3 font-semibold">Лаборатория</th>
                                    <th className="text-left px-4 py-3 font-semibold">Статус</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map(order => {
                                    const statusInfo = STATUS_MAP[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-600' };
                                    const isSent = sentOrders.has(order.order_id) || !!order.lab_org_id;
                                    return (
                                        <tr key={order.id || order.order_id} className="hover:bg-gray-50 transition-colors group">
                                            <td className="px-5 py-3.5">
                                                <span className="font-mono text-sm font-semibold text-gray-800">{order.order_id}</span>
                                                {order.is_urgent && <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">Срочно</span>}
                                            </td>
                                            <td className="px-4 py-3.5 text-sm text-gray-700">{order.patient?.name || '—'}</td>
                                            <td className="px-4 py-3.5 text-sm text-gray-500">{order.meta?.optic_name || '—'}</td>
                                            <td className="px-4 py-3.5 text-sm text-gray-500">
                                                {new Date(order.meta?.created_at).toLocaleDateString('ru-RU')}
                                            </td>
                                            <td className="px-4 py-3.5 text-sm font-medium text-gray-700">
                                                {order.total_price > 0 ? `${order.total_price.toLocaleString('ru-RU')} ₸` : '—'}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                {isSent ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                                                        <CheckCircle2 className="w-3 h-3" /> Отправлен
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => openSendModal(order)}
                                                        className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                                                    >
                                                        <FlaskConical className="w-3 h-3" />
                                                        В лабораторию
                                                    </button>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusInfo.color}`}>
                                                    {statusInfo.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <Link
                                                    href={`/distributor/orders/${order.order_id}`}
                                                    className="flex items-center gap-1 text-sm text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity font-medium"
                                                >
                                                    Открыть <ArrowRight className="w-3.5 h-3.5" />
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="mt-4 text-sm text-gray-400 text-right">
                Найдено: {filtered.length} из {orders.length}
            </div>

            {/* Send to Lab Modal */}
            <AnimatePresence>
                {sendingOrder && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                        onClick={() => setSendingOrder(null)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
                        >
                            {/* Modal header */}
                            <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
                                        <FlaskConical className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-extrabold text-gray-900">Отправить в лабораторию</p>
                                        <p className="text-xs text-gray-500">Заказ {sendingOrder.order_id}</p>
                                    </div>
                                </div>
                                <button onClick={() => setSendingOrder(null)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/80 transition-colors">
                                    <X className="w-4 h-4 text-gray-500" />
                                </button>
                            </div>

                            <div className="p-6">
                                {labs.length === 0 ? (
                                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-700">
                                        ⚠️ Лаборатории не найдены. Добавьте лабораторию в систему или проверьте настройки.
                                    </div>
                                ) : (
                                    <>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Выберите лабораторию</label>

                                        {/* Lab dropdown */}
                                        <div className="relative mb-4">
                                            <button
                                                type="button"
                                                onClick={() => setShowLabDropdown(!showLabDropdown)}
                                                className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-2xl text-left hover:border-indigo-400 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                    <span className="text-sm font-medium text-gray-900">
                                                        {selectedLab?.name || '— Выберите —'}
                                                    </span>
                                                    {selectedLabId === defaultLabId && (
                                                        <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-semibold">по умолч.</span>
                                                    )}
                                                </div>
                                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showLabDropdown ? 'rotate-180' : ''}`} />
                                            </button>

                                            {showLabDropdown && (
                                                <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl z-20 overflow-hidden">
                                                    {labs.map(lab => (
                                                        <button
                                                            key={lab.id}
                                                            onClick={() => { setSelectedLabId(lab.id); setShowLabDropdown(false); }}
                                                            className={`w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors border-b border-gray-50 last:border-0 ${selectedLabId === lab.id ? 'bg-indigo-50' : ''}`}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <p className="text-sm font-bold text-gray-900">{lab.name}</p>
                                                                    <div className="flex items-center gap-2 mt-0.5">
                                                                        {lab.city && <span className="text-xs text-gray-400">{lab.city}</span>}
                                                                        {lab.phone && <span className="flex items-center gap-1 text-xs text-gray-400"><Phone className="w-3 h-3" />{lab.phone}</span>}
                                                                    </div>
                                                                </div>
                                                                {lab.id === defaultLabId && (
                                                                    <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-semibold flex-shrink-0">по умолч.</span>
                                                                )}
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {sendError && (
                                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
                                                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                                                <p className="text-sm text-red-700">{sendError}</p>
                                            </div>
                                        )}

                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setSendingOrder(null)}
                                                className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-2xl text-sm font-bold hover:bg-gray-50 transition-colors"
                                            >
                                                Отмена
                                            </button>
                                            <button
                                                onClick={handleSendToLab}
                                                disabled={!selectedLabId || sending}
                                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-2xl text-sm font-bold transition-all shadow-md shadow-indigo-100"
                                            >
                                                {sending ? (
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <FlaskConical className="w-4 h-4" />
                                                )}
                                                {sending ? 'Отправка...' : 'Отправить'}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
