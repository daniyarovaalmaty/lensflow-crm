'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Box, CheckCircle2, FileText, Printer, Trash2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function WholesaleOrderDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const res = await fetch(`/api/distributor/wholesale/${params.id}`);
                if (res.ok) {
                    const data = await res.json();
                    setOrder(data);
                } else {
                    toast.error('Заказ не найден');
                    router.push('/distributor/wholesale');
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [params.id, router]);

    const handleReserve = async () => {
        setActionLoading(true);
        try {
            const res = await fetch(`/api/distributor/wholesale/${params.id}/reserve`, { method: 'POST' });
            if (res.ok) {
                const updated = await res.json();
                setOrder(updated);
                toast.success('Товар успешно зарезервирован');
            } else {
                const err = await res.text();
                toast.error(err || 'Ошибка резервирования');
            }
        } catch (error) {
            toast.error('Ошибка сети');
        } finally {
            setActionLoading(false);
        }
    };

    const handleComplete = async () => {
        setActionLoading(true);
        try {
            const res = await fetch(`/api/distributor/wholesale/${params.id}/complete`, { method: 'POST' });
            if (res.ok) {
                const updated = await res.json();
                setOrder(updated);
                toast.success('Заказ успешно отгружен');
            } else {
                const err = await res.text();
                toast.error(err || 'Ошибка отгрузки');
            }
        } catch (error) {
            toast.error('Ошибка сети');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteDraft = async () => {
        if (!confirm('Вы уверены, что хотите безвозвратно удалить этот черновик?')) return;
        setActionLoading(true);
        try {
            const res = await fetch(`/api/distributor/wholesale/${params.id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Черновик удален');
                router.push('/distributor/wholesale');
            } else {
                const err = await res.text();
                toast.error(err || 'Ошибка удаления');
            }
        } catch (error) {
            toast.error('Ошибка сети');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancelReservation = async () => {
        if (!confirm('Вы уверены, что хотите снять заказ с резерва? Товары вернутся на склад в свободную продажу.')) return;
        setActionLoading(true);
        try {
            const res = await fetch(`/api/distributor/wholesale/${params.id}/cancel`, { method: 'POST' });
            if (res.ok) {
                const updated = await res.json();
                setOrder(updated);
                toast.success('Резерв снят, заказ отменен');
            } else {
                const err = await res.text();
                toast.error(err || 'Ошибка отмены резерва');
            }
        } catch (error) {
            toast.error('Ошибка сети');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Загрузка...</div>;
    if (!order) return null;

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/distributor/wholesale" className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white hover:bg-gray-100 p-2">
                    <ArrowLeft className="w-4 h-4" />
                </Link>
                <h1 className="text-2xl font-bold">Заказ {order.orderNumber}</h1>
                
                {order.status === 'draft' && <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 border border-gray-200">Черновик</span>}
                {order.status === 'reserved' && <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">В резерве</span>}
                {order.status === 'completed' && <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-300">Отгружен</span>}
                {order.status === 'cancelled' && <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-300">Отменен</span>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white border rounded-lg p-6 shadow-sm overflow-hidden">
                        <h2 className="text-lg font-semibold mb-4">Состав заказа</h2>
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 font-medium text-gray-500">Наименование</th>
                                    <th className="px-4 py-3 font-medium text-gray-500">Кол-во</th>
                                    <th className="px-4 py-3 font-medium text-gray-500">Цена</th>
                                    <th className="px-4 py-3 font-medium text-gray-500">Сумма</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {order.items.map((item: any) => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium">{item.product?.name || 'Неизвестный товар'}</td>
                                        <td className="px-4 py-3">{item.quantity} шт</td>
                                        <td className="px-4 py-3">{item.price.toLocaleString('ru-RU')} ₸</td>
                                        <td className="px-4 py-3 font-semibold">{item.total.toLocaleString('ru-RU')} ₸</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="flex justify-end mt-4 text-xl font-bold border-t pt-4">
                            Итого: {order.totalAmount.toLocaleString('ru-RU')} ₸
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white border rounded-lg p-6 shadow-sm space-y-4">
                        <h2 className="text-lg font-semibold">Информация</h2>
                        <div className="space-y-1">
                            <p className="text-sm text-gray-500">Контрагент</p>
                            <p className="font-medium">{order.counterparty?.name || 'Не указан'}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm text-gray-500">Комментарий</p>
                            <p>{order.notes || '—'}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm text-gray-500">Дата создания</p>
                            <p>{new Date(order.createdAt).toLocaleString('ru-RU')}</p>
                        </div>
                    </div>

                    <div className="bg-white border rounded-lg p-6 shadow-sm space-y-4">
                        <h2 className="text-lg font-semibold">Действия</h2>
                        
                        {order.status === 'draft' && (
                            <>
                                <button 
                                    className="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white py-3 rounded-md font-medium disabled:opacity-50" 
                                    onClick={handleReserve}
                                    disabled={actionLoading}
                                >
                                    <Box className="w-5 h-5" />
                                    Зарезервировать на складе
                                </button>
                                <button 
                                    className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 py-3 rounded-md font-medium disabled:opacity-50" 
                                    onClick={handleDeleteDraft}
                                    disabled={actionLoading}
                                >
                                    <Trash2 className="w-5 h-5" />
                                    Удалить черновик
                                </button>
                            </>
                        )}

                        {order.status === 'reserved' && (
                            <>
                                <button 
                                    className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-md font-medium disabled:opacity-50" 
                                    onClick={handleComplete}
                                    disabled={actionLoading}
                                >
                                    <CheckCircle2 className="w-5 h-5" />
                                    Отгрузить (Продать)
                                </button>
                                <button 
                                    className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 py-3 rounded-md font-medium disabled:opacity-50 mt-2" 
                                    onClick={handleCancelReservation}
                                    disabled={actionLoading}
                                >
                                    <XCircle className="w-5 h-5" />
                                    Снять с резерва
                                </button>
                            </>
                        )}

                        {order.status === 'completed' && (
                            <button className="w-full flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-700 py-3 rounded-md font-medium">
                                <Printer className="w-5 h-5" />
                                Печать накладной
                            </button>
                        )}
                        
                        <Link href={`/distributor/wholesale/${order.id}/invoice`} target="_blank" className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-md font-medium">
                            <FileText className="w-5 h-5" />
                            Скачать счет на оплату
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
