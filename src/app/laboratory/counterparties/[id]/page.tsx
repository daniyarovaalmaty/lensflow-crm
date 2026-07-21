'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
    ArrowLeft, Building2, Stethoscope, Package, DollarSign,
    Phone, Mail, MapPin, Percent, Users, Zap, Pencil, Save, X
} from 'lucide-react';
import { OrderStatusLabels, PaymentStatusLabels, PaymentStatusColors } from '@/types/order';
import type { OrderStatus, PaymentStatus } from '@/types/order';
import { AnimatePresence, motion } from 'framer-motion';

const fmt = (n: number) => n.toLocaleString('ru-RU');

interface PriceList {
    lenses: {
        probe?: Record<string, number | string>;
        spherical?: Record<string, number | string>;
        toric?: Record<string, number | string>;
    };
}

const DEFAULT_PRICES: PriceList = {
    lenses: {
        probe: { '50': 12000 },
        spherical: { '100': 25000, '125': 28000, '180': 31000 },
        toric: { '100': 30000, '125': 33000, '180': 36000 },
    }
};

export default function CounterpartyDetailPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const { data: session } = useSession();
    const id = params.id as string;
    const type = searchParams.get('type') || 'clinic';

    const [data, setData] = useState<any>(null);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const canEditPricing = session?.user?.subRole === 'lab_head' || session?.user?.subRole === 'lab_admin';
    const [showPricingModal, setShowPricingModal] = useState(false);
    const [pricingMode, setPricingMode] = useState<'discount' | 'individual'>('discount');
    const [editDiscount, setEditDiscount] = useState('0');
    const [editPriceList, setEditPriceList] = useState<PriceList>(DEFAULT_PRICES);
    const [isSavingPricing, setIsSavingPricing] = useState(false);

    const [showEditInfoModal, setShowEditInfoModal] = useState(false);
    const [editInfoForm, setEditInfoForm] = useState<any>({});
    const [isSavingInfo, setIsSavingInfo] = useState(false);
    const [isTogglingApproval, setIsTogglingApproval] = useState(false);

    const fetchCounterparty = async () => {
        try {
            const res = await fetch(`/api/counterparties/${id}?type=${type}`);
            if (res.ok) {
                const json = await res.json();
                setData(json.data);
                setOrders(json.orders);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        fetchCounterparty();
    }, [id, type]);

    const openPricingModal = () => {
        const discount = data.discountPercent || 0;
        const priceList = data.metadata?.priceList;
        
        if (priceList && Object.keys(priceList).length > 0) {
            setPricingMode('individual');
            setEditPriceList(priceList);
            setEditDiscount('0');
        } else {
            setPricingMode('discount');
            setEditDiscount(String(discount));
            setEditPriceList(DEFAULT_PRICES);
        }
        setShowPricingModal(true);
    };

    const handleSavePricing = async () => {
        setIsSavingPricing(true);
        try {
            const body = {
                discountPercent: pricingMode === 'discount' ? Number(editDiscount) : 0,
                priceList: pricingMode === 'individual' ? editPriceList : null,
            };

            const res = await fetch(`/api/counterparties/${id}/pricing`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                setShowPricingModal(false);
                fetchCounterparty();
            } else {
                const err = await res.json();
                alert(err.error || 'Ошибка сохранения');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSavingPricing(false);
        }
    };

    const handleSaveInfo = async () => {
        setIsSavingInfo(true);
        try {
            const res = await fetch(`/api/counterparties/${id}/info`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, ...editInfoForm }),
            });
            if (res.ok) {
                setShowEditInfoModal(false);
                fetchCounterparty();
            } else {
                const err = await res.json();
                alert(err.error || 'Ошибка сохранения');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSavingInfo(false);
        }
    };

    const [isTogglingStatus, setIsTogglingStatus] = useState(false);
    const handleToggleStatus = async () => {
        if (!confirm(`Вы уверены, что хотите ${data.status === 'blocked' ? 'восстановить' : 'заблокировать'} этого контрагента?`)) return;
        setIsTogglingStatus(true);
        try {
            const res = await fetch(`/api/counterparties/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, status: data.status === 'blocked' ? 'active' : 'blocked' }),
            });
            if (res.ok) {
                fetchCounterparty();
            } else {
                const err = await res.json();
                alert(err.error || 'Ошибка изменения статуса');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsTogglingStatus(false);
        }
    };

    const handleToggleApproval = async () => {
        setIsTogglingApproval(true);
        try {
            const res = await fetch(`/api/counterparties/${id}/approval`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requiresApproval: !data.requiresApproval }),
            });
            if (res.ok) {
                setData((prev: any) => ({ ...prev, requiresApproval: !prev.requiresApproval }));
            } else {
                alert('Не удалось обновить настройки');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsTogglingApproval(false);
        }
    };

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
                            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                {name}
                                {data.status === 'blocked' && (
                                    <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-md">Заблокирован</span>
                                )}
                            </h1>
                            <p className="text-sm text-gray-500">
                                {isClinic ? 'Клиника' : 'Врач'}
                                {!isClinic && data.organization?.name && (
                                    <span> · <Link href={`/laboratory/counterparties/${data.organization.id}?type=clinic`} className="text-blue-600 hover:underline">{data.organization.name}</Link></span>
                                )}
                            </p>
                        </div>
                    </div>
                    
                    {canEditPricing && (
                        <div className="ml-auto">
                            <button 
                                onClick={handleToggleStatus}
                                disabled={isTogglingStatus}
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors border ${
                                    data.status === 'blocked' 
                                        ? 'bg-white border-gray-200 text-emerald-600 hover:bg-gray-50' 
                                        : 'bg-white border-red-200 text-red-600 hover:bg-red-50'
                                }`}
                            >
                                {isTogglingStatus ? 'Загрузка...' : (data.status === 'blocked' ? 'Восстановить' : 'Заблокировать')}
                            </button>
                        </div>
                    )}
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
                    {isClinic && (
                        <div className="bg-white rounded-xl border border-gray-200 p-4 col-span-1 sm:col-span-2 lg:col-span-4 flex items-center justify-between">
                            <div>
                                <div className="text-sm font-semibold text-gray-900">Подтверждение заказов бухгалтером</div>
                                <div className="text-xs text-gray-500 mt-1">
                                    {data.requiresApproval ? 'Включено: Заказы врачей этой клиники падают в Черновик и требуют подтверждения бухгалтером.' : 'Выключено: Заказы врачей этой клиники сразу уходят в лабораторию.'}
                                </div>
                            </div>
                            {canEditPricing && (
                                <button
                                    onClick={handleToggleApproval}
                                    disabled={isTogglingApproval}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                        data.requiresApproval ? 'bg-blue-600' : 'bg-gray-200'
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                            data.requiresApproval ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Details */}
                    <div className="space-y-4">
                        {isClinic && (
                            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
                                <h3 className="font-semibold text-gray-900 flex items-center justify-between">
                                    <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-indigo-600" /> Реквизиты</div>
                                    <button onClick={() => { setEditInfoForm(data); setShowEditInfoModal(true); }} className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
                                        <Pencil className="w-3 h-3" /> Изменить
                                    </button>
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
                                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-500">Ценообразование</span>
                                            {data.metadata?.priceList ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg">
                                                    Индивидуальный прайс
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg">
                                                    <Percent className="w-3 h-3" /> Скидка {data.discountPercent}%
                                                </span>
                                            )}
                                        </div>
                                        {canEditPricing && (
                                            <button onClick={openPricingModal} className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
                                                <Pencil className="w-3 h-3" /> Изменить
                                            </button>
                                        )}
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
                                <h3 className="font-semibold text-gray-900 flex items-center justify-between">
                                    <div className="flex items-center gap-2"><Stethoscope className="w-4 h-4 text-blue-600" /> Информация</div>
                                    <button onClick={() => { setEditInfoForm(data); setShowEditInfoModal(true); }} className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
                                        <Pencil className="w-3 h-3" /> Изменить
                                    </button>
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
                                                    <Link href={`/laboratory/orders/${order.order_id}`} className="text-blue-600 hover:underline font-medium text-xs">
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

            {/* Pricing Modal */}
            <AnimatePresence>
                {showPricingModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowPricingModal(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
                        >
                            <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Настройка цен</h2>
                                    <p className="text-xs text-gray-500 mt-0.5">{name}</p>
                                </div>
                                <button onClick={() => setShowPricingModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-5 border-b border-gray-100 bg-gray-50 flex-shrink-0">
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="pricingMode"
                                            checked={pricingMode === 'discount'}
                                            onChange={() => setPricingMode('discount')}
                                            className="text-blue-600"
                                        />
                                        <span className="text-sm font-medium">Общая скидка на все товары</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="pricingMode"
                                            checked={pricingMode === 'individual'}
                                            onChange={() => setPricingMode('individual')}
                                            className="text-blue-600"
                                        />
                                        <span className="text-sm font-medium">Индивидуальный прайс-лист</span>
                                    </label>
                                </div>
                            </div>

                            <div className="p-5 overflow-y-auto">
                                {pricingMode === 'discount' ? (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Размер скидки (%)</label>
                                        <input
                                            type="number"
                                            value={editDiscount}
                                            onChange={e => setEditDiscount(e.target.value)}
                                            className="input w-32"
                                            min="0"
                                            max="100"
                                        />
                                        <p className="text-xs text-gray-500 mt-2">
                                            Эта скидка будет автоматически применяться ко всем базовым ценам каталога при оформлении заказа данным контрагентом.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <p className="text-sm text-gray-600">
                                            Здесь вы можете задать индивидуальные цены на линзы (для разных DK) специально для этой оптики.
                                            Базовая скидка при этом будет равна 0%.
                                        </p>
                                        
                                        {/* Сферические */}
                                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                                            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 font-medium text-sm">Сферические линзы</div>
                                            <div className="p-4 grid grid-cols-3 gap-4">
                                                {['100', '125', '180'].map(dk => (
                                                    <div key={dk}>
                                                        <label className="block text-xs font-medium text-gray-500 mb-1">DK {dk}</label>
                                                        <div className="relative">
                                                            <input
                                                                type="number"
                                                                value={editPriceList.lenses?.spherical?.[dk] ?? ''}
                                                                onChange={e => {
                                                                    const val = e.target.value;
                                                                    setEditPriceList(prev => ({
                                                                        ...prev,
                                                                        lenses: { ...prev.lenses, spherical: { ...(prev.lenses?.spherical || {}), [dk]: val === '' ? '' : Number(val) } }
                                                                    }))
                                                                }}
                                                                className="input w-full pr-8"
                                                                min="0"
                                                            />
                                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₸</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Торические */}
                                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                                            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 font-medium text-sm">Торические линзы</div>
                                            <div className="p-4 grid grid-cols-3 gap-4">
                                                {['100', '125', '180'].map(dk => (
                                                    <div key={dk}>
                                                        <label className="block text-xs font-medium text-gray-500 mb-1">DK {dk}</label>
                                                        <div className="relative">
                                                            <input
                                                                type="number"
                                                                value={editPriceList.lenses?.toric?.[dk] ?? ''}
                                                                onChange={e => {
                                                                    const val = e.target.value;
                                                                    setEditPriceList(prev => ({
                                                                        ...prev,
                                                                        lenses: { ...prev.lenses, toric: { ...(prev.lenses?.toric || {}), [dk]: val === '' ? '' : Number(val) } }
                                                                    }))
                                                                }}
                                                                className="input w-full pr-8"
                                                                min="0"
                                                            />
                                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₸</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Пробные */}
                                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                                            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 font-medium text-sm">Пробные линзы</div>
                                            <div className="p-4 grid grid-cols-3 gap-4">
                                                <div key="50">
                                                    <label className="block text-xs font-medium text-gray-500 mb-1">DK 50</label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            value={editPriceList.lenses?.probe?.['50'] ?? ''}
                                                            onChange={e => {
                                                                const val = e.target.value;
                                                                setEditPriceList(prev => ({
                                                                    ...prev,
                                                                    lenses: { ...prev.lenses, probe: { ...(prev.lenses?.probe || {}), ['50']: val === '' ? '' : Number(val) } }
                                                                }))
                                                            }}
                                                            className="input w-full pr-8"
                                                            min="0"
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₸</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 p-5 border-t border-gray-100 bg-gray-50 flex-shrink-0">
                                <button onClick={() => setShowPricingModal(false)} className="btn btn-secondary">Отмена</button>
                                <button
                                    onClick={handleSavePricing}
                                    disabled={isSavingPricing}
                                    className="btn btn-primary gap-2"
                                >
                                    {isSavingPricing ? (
                                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Сохранение...</>
                                    ) : (
                                        <><Save className="w-4 h-4" /> Сохранить цены</>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Edit Info Modal */}
            <AnimatePresence>
                {showEditInfoModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowEditInfoModal(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
                        >
                            <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
                                <h2 className="text-lg font-bold text-gray-900">Редактирование {isClinic ? 'клиники' : 'врача'}</h2>
                                <button onClick={() => setShowEditInfoModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-5 overflow-y-auto space-y-4">
                                {isClinic ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Название</label>
                                            <input type="text" value={editInfoForm.name || ''} onChange={e => setEditInfoForm({...editInfoForm, name: e.target.value})} className="input w-full" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">ИИН/БИН</label>
                                            <input type="text" value={editInfoForm.inn || ''} onChange={e => setEditInfoForm({...editInfoForm, inn: e.target.value})} className="input w-full" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Телефон</label>
                                            <input type="text" value={editInfoForm.phone || ''} onChange={e => setEditInfoForm({...editInfoForm, phone: e.target.value})} className="input w-full" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                                            <input type="email" value={editInfoForm.email || ''} onChange={e => setEditInfoForm({...editInfoForm, email: e.target.value})} className="input w-full" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Город</label>
                                            <input type="text" value={editInfoForm.city || ''} onChange={e => setEditInfoForm({...editInfoForm, city: e.target.value})} className="input w-full" />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Юр. адрес</label>
                                            <input type="text" value={editInfoForm.address || ''} onChange={e => setEditInfoForm({...editInfoForm, address: e.target.value})} className="input w-full" />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Адрес доставки</label>
                                            <input type="text" value={editInfoForm.deliveryAddress || ''} onChange={e => setEditInfoForm({...editInfoForm, deliveryAddress: e.target.value})} className="input w-full" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Руководитель</label>
                                            <input type="text" value={editInfoForm.directorName || ''} onChange={e => setEditInfoForm({...editInfoForm, directorName: e.target.value})} className="input w-full" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Контактное лицо</label>
                                            <input type="text" value={editInfoForm.contactPerson || ''} onChange={e => setEditInfoForm({...editInfoForm, contactPerson: e.target.value})} className="input w-full" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Банк</label>
                                            <input type="text" value={editInfoForm.bankName || ''} onChange={e => setEditInfoForm({...editInfoForm, bankName: e.target.value})} className="input w-full" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">IBAN</label>
                                            <input type="text" value={editInfoForm.iban || ''} onChange={e => setEditInfoForm({...editInfoForm, iban: e.target.value})} className="input w-full" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">ФИО</label>
                                            <input type="text" value={editInfoForm.fullName || ''} onChange={e => setEditInfoForm({...editInfoForm, fullName: e.target.value})} className="input w-full" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Телефон</label>
                                            <input type="text" value={editInfoForm.phone || ''} onChange={e => setEditInfoForm({...editInfoForm, phone: e.target.value})} className="input w-full" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                                            <input type="email" value={editInfoForm.email || ''} onChange={e => setEditInfoForm({...editInfoForm, email: e.target.value})} className="input w-full" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 p-5 border-t border-gray-100 bg-gray-50 flex-shrink-0">
                                <button onClick={() => setShowEditInfoModal(false)} className="btn btn-secondary">Отмена</button>
                                <button
                                    onClick={handleSaveInfo}
                                    disabled={isSavingInfo}
                                    className="btn btn-primary gap-2"
                                >
                                    {isSavingInfo ? (
                                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Сохранение...</>
                                    ) : (
                                        <><Save className="w-4 h-4" /> Сохранить</>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
