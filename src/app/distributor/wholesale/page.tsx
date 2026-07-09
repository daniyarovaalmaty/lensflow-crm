'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Order {
    id: string;
    orderNumber: string;
    counterparty: { name: string } | null;
    status: string;
    totalAmount: number;
    createdAt: string;
}

export default function WholesaleOrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const res = await fetch('/api/distributor/wholesale');
                if (res.ok) {
                    const data = await res.json();
                    setOrders(data.orders);
                }
            } catch (error) {
                console.error('Failed to fetch orders', error);
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, []);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'draft': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">Черновик</span>;
            case 'reserved': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">Резерв</span>;
            case 'completed': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-300">Отгружен</span>;
            case 'cancelled': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-300">Отменен</span>;
            default: return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Оптовые заказы (B2B)</h1>
                <Link href="/distributor/wholesale/create" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white shadow hover:bg-blue-700 h-9 px-4 py-2">
                    <Plus className="w-4 h-4 mr-2" />
                    Создать заказ
                </Link>
            </div>

            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-4 py-3 font-medium text-gray-500">Номер</th>
                            <th className="px-4 py-3 font-medium text-gray-500">Дата</th>
                            <th className="px-4 py-3 font-medium text-gray-500">Контрагент (Оптика)</th>
                            <th className="px-4 py-3 font-medium text-gray-500">Статус</th>
                            <th className="px-4 py-3 font-medium text-gray-500 text-right">Сумма</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="text-center py-8 text-gray-500">Загрузка...</td>
                            </tr>
                        ) : orders.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="text-center py-8 text-gray-500">Нет заказов</td>
                            </tr>
                        ) : (
                            orders.map((order) => (
                                <tr key={order.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        <Link href={`/distributor/wholesale/${order.id}`} className="text-blue-600 hover:underline font-medium">
                                            {order.orderNumber}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-3">{format(new Date(order.createdAt), 'dd.MM.yyyy HH:mm', { locale: ru })}</td>
                                    <td className="px-4 py-3">{order.counterparty?.name || '—'}</td>
                                    <td className="px-4 py-3">{getStatusBadge(order.status)}</td>
                                    <td className="px-4 py-3 text-right font-medium">
                                        {order.totalAmount.toLocaleString('ru-RU')} ₸
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
