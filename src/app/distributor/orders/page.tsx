'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Filter, ArrowRight, Package, Clock, CheckCircle2, Truck } from 'lucide-react';

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

export default function DistributorOrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('');

    useEffect(() => {
        setLoading(true);
        const url = activeTab ? `/api/orders?status=${activeTab}` : '/api/orders';
        fetch(url)
            .then(r => r.json())
            .then(data => setOrders(Array.isArray(data) ? data : []))
            .finally(() => setLoading(false));
    }, [activeTab]);

    const filtered = orders.filter(o => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            o.order_id?.toLowerCase().includes(q) ||
            o.patient?.name?.toLowerCase().includes(q) ||
            o.meta?.optic_name?.toLowerCase().includes(q)
        );
    });

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Заказы</h1>
                <p className="text-gray-500 mt-1">Заказы оптик, назначенные вашей компании</p>
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
                                    <th className="text-left px-4 py-3 font-semibold">Статус</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map(order => {
                                    const statusInfo = STATUS_MAP[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-600' };
                                    return (
                                        <tr key={order.id} className="hover:bg-gray-50 transition-colors group">
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
                                                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusInfo.color}`}>
                                                    {statusInfo.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <Link
                                                    href={`/distributor/orders/${order.id}`}
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
        </div>
    );
}
