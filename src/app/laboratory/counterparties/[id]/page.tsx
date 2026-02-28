'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
    ArrowLeft, Building2, Stethoscope, Package, DollarSign,
    Phone, Mail, MapPin, Percent, Users, Zap
} from 'lucide-react';
import { OrderStatusLabels, PaymentStatusLabels, PaymentStatusColors } from '@/types/order';
import type { OrderStatus, PaymentStatus } from '@/types/order';

const fmt = (n: number) => n.toLocaleString('ru-RU');

export default function CounterpartyDetailPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const { data: session } = useSession();
    const id = params.id as string;
    const type = searchParams.get('type') || 'clinic';

    const [data, setData] = useState<any>(null);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`/api/counterparties/${id}?type=${type}`);
                if (res.ok) {
                    const json = await res.json();
                    setData(json.data);
                    setOrders(json.orders);
                }
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        })();
    }, [id, type]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <p className="text-red-500 text-lg">Контрагент не найден</p>
                <Link href="/laboratory/counterparties" className="text-blue-600 hover:underline flex items-center gap-1">
                    <ArrowLeft className="w-4 h-4" /> Назад
                </Link>
            </div>
        );
    }

    const totalRevenue = orders.reduce((s: number, o: any) => s + (o.total_price || 0), 0);
    const totalUnpaid = orders.filter((o: any) => o.payment_status !== 'paid').reduce((s: number, o: any) => s + (o.total_price || 0), 0);
    const totalPaid = totalRevenue - totalUnpaid;

    const isClinic = type === 'clinic';
    const name = isClinic ? data.name : (data.fullName || data.name);

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <Link href="/laboratory/counterparties" className="text-gray-400 hover:text-gray-600 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold ${isClinic ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}`}>
                            {name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">{name}</h1>
                            <p className="text-sm text-gray-500">
                                {isClinic ? 'Клиника' : 'Врач'}
                                {!isClinic && data.organization?.name && (
                                    <span> · <Link href={`/laboratory/counterparties/${data.organization.id}?type=clinic`} className="text-blue-600 hover:underline">{data.organization.name}</Link></span>
                                )}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Info cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-2">
                            <Package className="w-3.5 h-3.5" /> Заказов
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-2">
                            <DollarSign className="w-3.5 h-3.5" /> Выручка
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{fmt(totalRevenue)} ₸</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-2 text-emerald-500 text-xs font-medium mb-2">
                            <DollarSign className="w-3.5 h-3.5" /> Оплачено
                        </div>
                        <p className="text-2xl font-bold text-emerald-600">{fmt(totalPaid)} ₸</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-2 text-red-500 text-xs font-medium mb-2">
                            <DollarSign className="w-3.5 h-3.5" /> Неоплачено
                        </div>
                        <p className="text-2xl font-bold text-red-600">{fmt(totalUnpaid)} ₸</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Details */}
                    <div className="space-y-4">
                        {isClinic && (
                            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
                                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-indigo-600" /> Реквизиты
                                </h3>
                                <div className="space-y-2 text-sm">
                                    {data.inn && <div className="flex justify-between"><span className="text-gray-500">ИИН/БИН</span><span className="font-medium">{data.inn}</span></div>}
                                    {data.phone && <div className="flex justify-between"><span className="text-gray-500">Телефон</span><span className="font-medium">{data.phone}</span></div>}
                                    {data.email && <div className="flex justify-between"><span className="text-gray-500">Email</span><span className="font-medium">{data.email}</span></div>}
                                    {data.city && <div className="flex justify-between"><span className="text-gray-500">Город</span><span className="font-medium">{data.city}</span></div>}
                                    {data.address && <div className="flex justify-between"><span className="text-gray-500">Юр. адрес</span><span className="font-medium text-right max-w-[200px]">{data.address}</span></div>}
                                    {data.deliveryAddress && <div className="flex justify-between"><span className="text-gray-500">Адрес доставки</span><span className="font-medium text-right max-w-[200px]">{data.deliveryAddress}</span></div>}
                                    {data.directorName && <div className="flex justify-between"><span className="text-gray-500">Руководитель</span><span className="font-medium">{data.directorName}</span></div>}
                                    {data.contactPerson && <div className="flex justify-between"><span className="text-gray-500">Контакт</span><span className="font-medium">{data.contactPerson}</span></div>}
                                    {data.bankName && <div className="flex justify-between"><span className="text-gray-500">Банк</span><span className="font-medium">{data.bankName}</span></div>}
                                    {data.iban && <div className="flex justify-between"><span className="text-gray-500">IBAN</span><span className="font-medium">{data.iban}</span></div>}
                                    <div className="flex justify-between pt-2 border-t border-gray-100">
                                        <span className="text-gray-500">Скидка</span>
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg">
                                            <Percent className="w-3 h-3" />{data.discountPercent}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {isClinic && data.users && data.users.length > 0 && (
                            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
                                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                    <Users className="w-4 h-4 text-blue-600" /> Сотрудники ({data.users.length})
                                </h3>
                                <div className="space-y-2">
                                    {data.users.map((u: any) => (
                                        <div key={u.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                                            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
                                                {u.fullName?.charAt(0)?.toUpperCase() || '?'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">{u.fullName}</p>
                                                <p className="text-xs text-gray-400">{u.email}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {!isClinic && (
                            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
                                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                    <Stethoscope className="w-4 h-4 text-blue-600" /> Информация
                                </h3>
                                <div className="space-y-2 text-sm">
                                    {data.email && <div className="flex justify-between"><span className="text-gray-500">Email</span><span className="font-medium">{data.email}</span></div>}
                                    {data.phone && <div className="flex justify-between"><span className="text-gray-500">Телефон</span><span className="font-medium">{data.phone}</span></div>}
                                    {data.organization?.name && <div className="flex justify-between"><span className="text-gray-500">Клиника</span><span className="font-medium">{data.organization.name}</span></div>}
                                    {data.discountPercent != null && (
                                        <div className="flex justify-between pt-2 border-t border-gray-100">
                                            <span className="text-gray-500">Персональная скидка</span>
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg">
                                                <Percent className="w-3 h-3" />{data.discountPercent}%
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Orders table */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-200">
                                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                    <Package className="w-4 h-4 text-gray-600" />
                                    Заказы ({orders.length})
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-200 bg-gray-50/50">
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">№ Заказа</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Пациент</th>
                                            {!isClinic && <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Клиника</th>}
                                            <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Статус</th>
                                            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Сумма</th>
                                            <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Оплата</th>
                                            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Дата</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orders.map((order: any) => (
                                            <tr key={order.order_id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                                <td className="py-3 px-4">
                                                    <Link href={`/laboratory/production`} className="text-blue-600 hover:underline font-medium text-xs">
                                                        {order.order_id}
                                                    </Link>
                                                    {order.is_urgent && (
                                                        <Zap className="w-3 h-3 text-orange-500 inline ml-1" />
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-gray-700">{order.patient || '—'}</td>
                                                {!isClinic && <td className="py-3 px-4 text-gray-500 text-xs">{order.clinic || '—'}</td>}
                                                <td className="py-3 px-4 text-center">
                                                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                                                        {OrderStatusLabels[order.status as OrderStatus] || order.status}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-right font-medium text-gray-900">
                                                    {order.total_price ? `${fmt(order.total_price)} ₸` : '—'}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${PaymentStatusColors[order.payment_status as PaymentStatus] || 'bg-gray-100 text-gray-600'}`}>
                                                        {PaymentStatusLabels[order.payment_status as PaymentStatus] || order.payment_status}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-right text-gray-500 text-xs">
                                                    {new Date(order.created_at).toLocaleDateString('ru-RU')}
                                                </td>
                                            </tr>
                                        ))}
                                        {orders.length === 0 && (
                                            <tr><td colSpan={isClinic ? 6 : 7} className="py-12 text-center text-gray-400">Нет заказов</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
