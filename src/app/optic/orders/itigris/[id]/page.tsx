'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft, Eye, Package, User,
    Building2, Stethoscope, AlertCircle, CheckCircle2, Clock,
    ShoppingBag, Wrench, Glasses
} from 'lucide-react';

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
    new_order: { label: 'Новый', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Clock },
    in_production: { label: 'В производстве', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Package },
    ready: { label: 'Готов', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
    delivered: { label: 'Выдан', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: CheckCircle2 },
    shipped: { label: 'Отправлен', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: Package },
    cancelled: { label: 'Отменён', color: 'bg-red-100 text-red-700 border-red-200', icon: AlertCircle },
};

function fmt(v: number | null | undefined, plus = true): string {
    if (v == null) return '—';
    const n = Number(v);
    return (plus && n > 0 ? '+' : '') + n.toFixed(2);
}

export default function ItigrisOrderPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch(`/api/orders/itigris/${id}`)
            .then(r => r.json())
            .then(data => {
                if (data.error) setError(data.error);
                else setOrder(data);
            })
            .catch(() => setError('Ошибка загрузки'))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
        </div>
    );

    if (error || !order) return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
            <AlertCircle className="w-12 h-12 text-red-400" />
            <p className="text-gray-600">{error || 'Заказ не найден'}</p>
            <button onClick={() => router.back()} className="text-sm text-orange-600 hover:underline">← Назад</button>
        </div>
    );

    const lc = order.lensConfig || {};
    const rx = lc.prescription;
    const lens = lc.lens;
    const frame = lc.frame;
    const items = Array.isArray(lc.items) ? lc.items : [];
    const orderType = lc.orderType || '';
    const statusInfo = STATUS_MAP[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-700 border-gray-200', icon: Clock };
    const StatusIcon = statusInfo.icon;

    const ORDER_TYPE_LABELS: Record<string, { label: string; badge: string }> = {
        GLASSES: { label: 'Изготовление очков', badge: 'bg-blue-50 text-blue-600 border-blue-200' },
        SALE:    { label: 'Продажа', badge: 'bg-green-50 text-green-600 border-green-200' },
        REPAIR:  { label: 'Ремонт', badge: 'bg-purple-50 text-purple-600 border-purple-200' },
        REPAIR_GLASSES_ORDER: { label: 'Ремонт очков', badge: 'bg-purple-50 text-purple-600 border-purple-200' },
        CONTACT_LENS: { label: 'Контактные линзы', badge: 'bg-teal-50 text-teal-600 border-teal-200' },
        CHECK_VISION: { label: 'Проверка зрения', badge: 'bg-amber-50 text-amber-600 border-amber-200' },
    };
    const typeInfo = ORDER_TYPE_LABELS[orderType] || null;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-3xl mx-auto px-4 py-8">
                {/* Back */}
                <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-orange-600 mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Назад
                </button>

                {/* Header */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                                <span className="text-xl font-bold text-gray-900">{order.orderNumber}</span>
                                <span className="text-xs bg-orange-50 text-orange-600 border border-orange-200 px-2.5 py-1 rounded-full font-semibold">ITIGRIS</span>
                                {typeInfo && (
                                    <span className={`text-xs border px-2.5 py-1 rounded-full font-medium ${typeInfo.badge}`}>{typeInfo.label}</span>
                                )}
                            </div>
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${statusInfo.color}`}>
                                <StatusIcon className="w-3.5 h-3.5" />
                                {statusInfo.label}
                            </div>
                        </div>
                        <div className="text-right">
                            {order.totalPrice > 0 && (
                                <div className="text-2xl font-bold text-gray-900">
                                    {order.totalPrice.toLocaleString('ru-RU')} ₸
                                </div>
                            )}
                            <div className="text-xs text-gray-400 mt-0.5">
                                {new Date(order.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                        </div>
                    </div>

                    {/* Patient & org */}
                    <div className="mt-5 pt-5 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {order.patient && (
                            <div>
                                <label className="text-xs font-semibold text-gray-400 uppercase mb-1 block">Пациент</label>
                                <button
                                    onClick={() => router.push(`/optic/patients/${order.patient.id}`)}
                                    className="flex items-center gap-1.5 text-orange-600 hover:text-orange-700 font-medium text-sm transition-colors"
                                >
                                    <User className="w-4 h-4" />
                                    {order.patient.name}
                                </button>
                                {order.patient.phone && <p className="text-xs text-gray-500 mt-0.5">{order.patient.phone}</p>}
                            </div>
                        )}
                        {lc.department && (
                            <div>
                                <label className="text-xs font-semibold text-gray-400 uppercase mb-1 block">Филиал</label>
                                <p className="flex items-center gap-1.5 text-gray-700 text-sm font-medium">
                                    <Building2 className="w-4 h-4 text-gray-400" />
                                    {lc.department}
                                </p>
                            </div>
                        )}
                        {lc.seller && (
                            <div>
                                <label className="text-xs font-semibold text-gray-400 uppercase mb-1 block">Продавец</label>
                                <p className="text-gray-700 text-sm">{lc.seller}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Prescription */}
                {rx && (
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-5 shadow-sm">
                        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
                            <Stethoscope className="w-5 h-5 text-orange-500" />
                            Рецепт на очки
                        </h2>

                        {/* Rx table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-xs text-gray-400 uppercase">
                                        <th className="text-left py-2 pr-4 font-semibold w-12"></th>
                                        <th className="text-center py-2 px-2 font-semibold">Sph</th>
                                        <th className="text-center py-2 px-2 font-semibold">Cyl</th>
                                        <th className="text-center py-2 px-2 font-semibold">Ax°</th>
                                        <th className="text-center py-2 px-2 font-semibold">Add</th>
                                        <th className="text-center py-2 px-2 font-semibold">PD</th>
                                        {(rx.od?.visus != null || rx.os?.visus != null) && <th className="text-center py-2 px-2 font-semibold">Visus</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {[
                                        { label: 'OD (правый)', eye: rx.od },
                                        { label: 'OS (левый)', eye: rx.os },
                                    ].map(({ label, eye }) => (
                                        <tr key={label}>
                                            <td className="py-3 pr-4 text-xs font-bold text-gray-500">{label}</td>
                                            <td className="py-3 px-2 text-center font-mono font-medium text-gray-900">{fmt(eye?.sph)}</td>
                                            <td className="py-3 px-2 text-center font-mono font-medium text-gray-900">{fmt(eye?.cyl)}</td>
                                            <td className="py-3 px-2 text-center font-mono font-medium text-gray-900">{eye?.ax != null ? `${Math.round(eye.ax)}°` : '—'}</td>
                                            <td className="py-3 px-2 text-center font-mono font-medium text-gray-900">{fmt(eye?.add)}</td>
                                            <td className="py-3 px-2 text-center font-mono font-medium text-gray-900">{eye?.pd != null ? `${eye.pd}` : '—'}</td>
                                            {(rx.od?.visus != null || rx.os?.visus != null) && (
                                                <td className="py-3 px-2 text-center font-mono font-medium text-gray-900">{eye?.visus != null ? eye.visus : '—'}</td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {rx.totalPd && (
                            <div className="mt-3 flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                                <span className="font-semibold text-gray-500">PD общий:</span>
                                <span className="font-mono font-bold">{rx.totalPd} мм</span>
                            </div>
                        )}

                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            {rx.doctor && (
                                <div className="flex items-start gap-2">
                                    <Stethoscope className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <span className="text-gray-400 text-xs block">Врач</span>
                                        <span className="text-gray-800 font-medium">{rx.doctor}</span>
                                    </div>
                                </div>
                            )}
                            {rx.purpose && (
                                <div className="flex items-start gap-2">
                                    <Eye className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <span className="text-gray-400 text-xs block">Назначение</span>
                                        <span className="text-gray-800">{rx.purpose}</span>
                                    </div>
                                </div>
                            )}
                            {rx.recommendedLenses && (
                                <div className="sm:col-span-2 bg-blue-50 rounded-lg p-3 text-blue-800 text-xs">
                                    <span className="font-semibold">Рекомендованные линзы:</span> {rx.recommendedLenses}
                                </div>
                            )}
                            {rx.notes && (
                                <div className="sm:col-span-2 bg-amber-50 rounded-lg p-3 text-amber-800 text-xs italic">
                                    {rx.notes}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Lenses */}
                {(lens?.od || lens?.os) && (
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-5 shadow-sm">
                        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
                            <Eye className="w-5 h-5 text-blue-500" />
                            Линзы
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[{ label: 'OD (правый)', data: lens.od }, { label: 'OS (левый)', data: lens.os }].map(({ label, data }) => (
                                data && (
                                    <div key={label} className="bg-blue-50/50 rounded-xl border border-blue-100 p-4">
                                        <div className="text-xs font-bold text-blue-600 mb-3">{label}</div>
                                        <div className="space-y-1.5 text-sm">
                                            {data.manufacturer && <div className="flex justify-between"><span className="text-gray-500">Производитель</span><span className="font-medium">{data.manufacturer}</span></div>}
                                            {data.brand && <div className="flex justify-between"><span className="text-gray-500">Бренд</span><span className="font-medium">{data.brand}</span></div>}
                                            {data.cover && <div className="flex justify-between"><span className="text-gray-500">Покрытие</span><span className="font-medium">{data.cover}</span></div>}
                                            {data.index && <div className="flex justify-between"><span className="text-gray-500">Индекс</span><span className="font-mono font-medium">{data.index}</span></div>}
                                            {data.diameter && <div className="flex justify-between"><span className="text-gray-500">Диаметр</span><span className="font-mono font-medium">{data.diameter} мм</span></div>}
                                            {data.geometry && <div className="flex justify-between"><span className="text-gray-500">Геометрия</span><span className="font-medium">{data.geometry}</span></div>}
                                            {data.material && <div className="flex justify-between"><span className="text-gray-500">Материал</span><span className="font-medium">{data.material}</span></div>}
                                            {data.dioptre != null && <div className="flex justify-between"><span className="text-gray-500">Диоптрия</span><span className="font-mono font-medium">{fmt(data.dioptre)}</span></div>}
                                            {data.price > 0 && <div className="flex justify-between border-t border-blue-100 pt-1.5 mt-1.5"><span className="text-gray-500">Цена</span><span className="font-semibold">{data.price.toLocaleString('ru-RU')} ₸</span></div>}
                                        </div>
                                    </div>
                                )
                            ))}
                        </div>
                    </div>
                )}

                {/* Frame */}
                {frame && (frame.type || frame.material) && (
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-5 shadow-sm">
                        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
                            <Package className="w-5 h-5 text-purple-500" />
                            Оправа
                        </h2>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            {frame.type && <div><span className="text-gray-400 text-xs block mb-0.5">Тип крепления</span><span className="font-medium">{frame.type}</span></div>}
                            {frame.material && <div><span className="text-gray-400 text-xs block mb-0.5">Материал</span><span className="font-medium">{frame.material}</span></div>}
                            {frame.description && <div className="col-span-2"><span className="text-gray-400 text-xs block mb-0.5">Описание</span><span className="text-gray-700">{frame.description}</span></div>}
                        </div>
                    </div>
                )}

                {/* Order line items (goods / frame / services) */}
                {items.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-5 shadow-sm">
                        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
                            <ShoppingBag className="w-5 h-5 text-green-500" />
                            Состав заказа
                        </h2>
                        <div className="divide-y divide-gray-50">
                            {items.map((it: any, i: number) => (
                                <div key={i} className="flex items-center justify-between py-2.5 text-sm">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="font-medium text-gray-800 truncate">{it.name}</span>
                                        {it.eye && <span className="text-xs text-gray-400 flex-shrink-0">({it.eye})</span>}
                                        {it.qty > 1 && <span className="text-gray-400 flex-shrink-0">× {it.qty}</span>}
                                    </div>
                                    {it.price > 0 && (
                                        <span className="font-mono text-gray-600 flex-shrink-0 ml-3">{Number(it.price).toLocaleString('ru-RU')} ₸</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* No details */}
                {!rx && !lens?.od && !lens?.os && !frame && items.length === 0 && (
                    orderType === 'SALE' ? (
                        <div className="bg-green-50 rounded-2xl border border-green-100 p-8 text-center">
                            <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-green-400" />
                            <p className="font-semibold text-green-800">Это заказ-продажа</p>
                            <p className="text-sm mt-1 text-green-600">Параметры рецепта не предусмотрены — товар продан через кассу</p>
                        </div>
                    ) : orderType === 'REPAIR' ? (
                        <div className="bg-purple-50 rounded-2xl border border-purple-100 p-8 text-center">
                            <Wrench className="w-10 h-10 mx-auto mb-3 text-purple-400" />
                            <p className="font-semibold text-purple-800">Это заказ на ремонт</p>
                            <p className="text-sm mt-1 text-purple-600">Параметры очков для ремонтных заказов не хранятся</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400">
                            <AlertCircle className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                            <p className="font-medium">Параметры не загружены</p>
                            <p className="text-sm mt-1">Запустите синхронизацию с ITIGRIS — нажмите «Полная» на странице интеграции</p>
                        </div>
                    )
                )}

                {/* Notes */}
                {order.notes && (
                    <div className="bg-amber-50 rounded-xl border border-amber-100 p-4 text-sm text-amber-800">
                        {order.notes}
                    </div>
                )}
            </div>
        </div>
    );
}
