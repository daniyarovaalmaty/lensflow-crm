'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingCart, Clock, CheckCircle2, Truck, TrendingUp, ArrowRight, Package } from 'lucide-react';

interface Stats {
    total: number;
    new: number;
    inProgress: number;
    ready: number;
    delivered: number;
    totalRevenue: number;
}

const STATUS_LABELS: Record<string, string> = {
    new_order: 'Новый',
    in_production: 'В работе',
    ready: 'Готов',
    shipped: 'Отправлен',
    out_for_delivery: 'Доставляется',
    delivered: 'Выдан',
    cancelled: 'Отменён',
};

const STATUS_COLORS: Record<string, string> = {
    new_order: 'bg-blue-100 text-blue-700',
    in_production: 'bg-amber-100 text-amber-700',
    ready: 'bg-green-100 text-green-700',
    shipped: 'bg-indigo-100 text-indigo-700',
    out_for_delivery: 'bg-purple-100 text-purple-700',
    delivered: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-red-100 text-red-500',
};

export default function DistributorDashboard() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/orders')
            .then(r => r.json())
            .then(data => { setOrders(Array.isArray(data) ? data : []); })
            .finally(() => setLoading(false));
    }, []);

    const stats: Stats = {
        total: orders.length,
        new: orders.filter(o => o.status === 'new').length,
        inProgress: orders.filter(o => o.status === 'in_production').length,
        ready: orders.filter(o => o.status === 'ready').length,
        delivered: orders.filter(o => o.status === 'delivered').length,
        totalRevenue: orders.reduce((s, o) => s + (o.total_price || 0), 0),
    };

    const recentOrders = orders.slice(0, 8);

    const cards = [
        { label: 'Всего заказов', value: stats.total, icon: ShoppingCart, color: 'from-indigo-500 to-purple-600', bg: 'bg-indigo-50' },
        { label: 'Новые', value: stats.new, icon: Clock, color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50' },
        { label: 'Готовы', value: stats.ready, icon: CheckCircle2, color: 'from-green-500 to-emerald-600', bg: 'bg-green-50' },
        { label: 'Выдано', value: stats.delivered, icon: Truck, color: 'from-gray-500 to-gray-600', bg: 'bg-gray-50' },
    ];

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Дашборд дистрибьютора</h1>
                <p className="text-gray-500 mt-1">Обзор заказов, назначенных вашей компании</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {cards.map(card => {
                    const Icon = card.icon;
                    return (
                        <div key={card.label} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                            <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
                                <Icon className="w-5 h-5 text-gray-700" />
                            </div>
                            <div className="text-2xl font-bold text-gray-900">
                                {loading ? '—' : card.value}
                            </div>
                            <div className="text-sm text-gray-500 mt-0.5">{card.label}</div>
                        </div>
                    );
                })}
            </div>

            {/* Revenue */}
            {stats.totalRevenue > 0 && (
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 mb-8 text-white">
                    <div className="flex items-center gap-3 mb-2">
                        <TrendingUp className="w-5 h-5 opacity-80" />
                        <span className="text-sm opacity-80">Общая сумма заказов</span>
                    </div>
                    <div className="text-3xl font-bold">{stats.totalRevenue.toLocaleString('ru-RU')} ₸</div>
                </div>
            )}

            {/* Recent orders */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <h2 className="font-bold text-gray-900 flex items-center gap-2">
                        <Package className="w-5 h-5 text-indigo-500" />
                        Последние заказы
                    </h2>
                    <Link href="/distributor/orders" className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                        Все заказы <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-gray-400">Загрузка...</div>
                ) : recentOrders.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                        <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p>Заказов пока нет</p>
                        <p className="text-sm mt-1">Оптика ещё не назначила вам заказы</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {recentOrders.map(order => (
                            <Link
                                key={order.id}
                                href={`/distributor/orders/${order.id}`}
                                className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="font-mono text-sm font-semibold text-gray-700 group-hover:text-indigo-600 transition-colors">
                                        {order.order_id}
                                    </div>
                                    <div className="text-sm text-gray-500">{order.patient?.name}</div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {order.total_price > 0 && (
                                        <span className="text-sm font-medium text-gray-700">
                                            {order.total_price.toLocaleString('ru-RU')} ₸
                                        </span>
                                    )}
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                                        {STATUS_LABELS[order.status] || order.status}
                                    </span>
                                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 transition-colors" />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
