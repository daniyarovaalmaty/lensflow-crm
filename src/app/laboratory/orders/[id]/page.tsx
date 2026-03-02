'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
    ArrowLeft, Package, User, Calendar, Building2, Stethoscope,
    Eye, Zap, Truck, FileText, CreditCard, AlertCircle, Clock
} from 'lucide-react';
import { OrderStatusLabels, OrderStatusColors, PaymentStatusLabels, PaymentStatusColors } from '@/types/order';
import type { OrderStatus, PaymentStatus } from '@/types/order';

const fmt = (n: number) => n.toLocaleString('ru-RU');

export default function LabOrderDetailPage() {
    const params = useParams();
    const { data: session } = useSession();
    const orderId = params.id as string;

    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`/api/orders/${orderId}`);
                if (!res.ok) {
                    setError('Заказ не найден');
                    return;
                }
                setOrder(await res.json());
            } catch (e) {
                setError('Ошибка загрузки');
            } finally {
                setLoading(false);
            }
        })();
    }, [orderId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <AlertCircle className="w-12 h-12 text-red-400" />
                <p className="text-red-500 text-lg">{error || 'Заказ не найден'}</p>
                <Link href="/laboratory/dashboard" className="text-blue-600 hover:underline flex items-center gap-1">
                    <ArrowLeft className="w-4 h-4" /> Назад
                </Link>
            </div>
        );
    }

    const od = order.config?.eyes?.od || {};
    const os = order.config?.eyes?.os || {};
    const odQty = Number(od.qty) || 0;
    const osQty = Number(os.qty) || 0;
    const createdAt = new Date(order.meta.created_at);
    const status = order.status as OrderStatus;
    const paymentStatus = order.payment_status as PaymentStatus;

    const InfoRow = ({ label, value, icon: Icon }: { label: string; value: any; icon?: any }) => (
        value != null && value !== '' ? (
            <div className="flex items-start justify-between py-2.5 border-b border-gray-100 last:border-0">
                <span className="text-gray-500 text-sm flex items-center gap-2">
                    {Icon && <Icon className="w-3.5 h-3.5" />}
                    {label}
                </span>
                <span className="font-medium text-gray-900 text-sm text-right max-w-[60%]">{String(value)}</span>
            </div>
        ) : null
    );

    const EyeCard = ({ side, data, qty }: { side: string; data: any; qty: number }) => (
        qty > 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                    <Eye className="w-4 h-4 text-blue-600" />
                    {side} ({qty} шт.)
                </h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {data.characteristic && (
                        <div className="col-span-2 mb-2">
                            <span className="inline-flex items-center px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg">
                                {data.characteristic === 'toric' ? 'Торическая' :
                                    data.characteristic === 'spherical' ? 'Сферическая' : data.characteristic}
                            </span>
                        </div>
                    )}
                    {data.km != null && <InfoRow label="Km" value={data.km} />}
                    {data.tp != null && <InfoRow label="Tp" value={data.tp} />}
                    {data.dia != null && <InfoRow label="DIA" value={data.dia} />}
                    {data.dk != null && <InfoRow label="Dk" value={data.dk} />}
                    {data.e1 != null && <InfoRow label="e1" value={data.e1} />}
                    {data.e2 != null && <InfoRow label="e2" value={data.e2} />}
                    {data.sph != null && <InfoRow label="SPH" value={data.sph} />}
                    {data.cyl != null && <InfoRow label="CYL" value={data.cyl} />}
                    {data.ax != null && <InfoRow label="AX" value={data.ax} />}
                    {data.tor != null && <InfoRow label="TOR" value={data.tor} />}
                    {data.compression_factor != null && <InfoRow label="Фактор сжатия" value={data.compression_factor} />}
                </div>
            </div>
        ) : null
    );

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">
                {/* Back + Header */}
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => window.history.back()} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-xl font-bold text-gray-900">Заказ {order.order_id}</h1>
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${status === 'new' ? 'bg-blue-100 text-blue-700' :
                                    status === 'in_production' ? 'bg-yellow-100 text-yellow-700' :
                                        status === 'ready' ? 'bg-green-100 text-green-700' :
                                            status === 'shipped' ? 'bg-purple-100 text-purple-700' :
                                                'bg-gray-100 text-gray-700'
                                }`}>
                                {OrderStatusLabels[status] || status}
                            </span>
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${PaymentStatusColors[paymentStatus] || 'bg-gray-100 text-gray-600'}`}>
                                {PaymentStatusLabels[paymentStatus] || paymentStatus}
                            </span>
                            {order.is_urgent && (
                                <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-orange-100 text-orange-700">
                                    <Zap className="w-3 h-3" /> Срочный
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                            Создан: {createdAt.toLocaleDateString('ru-RU')} в {createdAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left column: Info cards */}
                    <div className="space-y-4">
                        {/* Order info */}
                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                                <Package className="w-4 h-4 text-indigo-600" /> Информация о заказе
                            </h3>
                            <InfoRow label="Номер" value={order.order_id} icon={FileText} />
                            <InfoRow label="Тип" value={order.config?.type === 'medilens' ? 'MediLens' : order.config?.type} />
                            <InfoRow label="Итого" value={order.total_price ? `${fmt(order.total_price)} ₸` : '—'} icon={CreditCard} />
                            {order.discount_percent != null && order.discount_percent > 0 && (
                                <InfoRow label="Скидка" value={`${order.discount_percent}%`} />
                            )}
                            {order.tracking_number && (
                                <InfoRow label="Трек-номер" value={order.tracking_number} icon={Truck} />
                            )}
                        </div>

                        {/* Patient */}
                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                                <User className="w-4 h-4 text-emerald-600" /> Пациент
                            </h3>
                            <InfoRow label="ФИО" value={order.patient?.name} />
                            <InfoRow label="Телефон" value={order.patient?.phone} />
                            {order.patient?.email && <InfoRow label="Email" value={order.patient.email} />}
                            {order.patient?.notes && <InfoRow label="Примечания" value={order.patient.notes} />}
                        </div>

                        {/* Clinic & Doctor */}
                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                                <Building2 className="w-4 h-4 text-blue-600" /> Клиника / Врач
                            </h3>
                            <InfoRow label="Клиника" value={order.meta?.optic_name} icon={Building2} />
                            <InfoRow label="Врач" value={order.meta?.doctor} icon={Stethoscope} />
                            {order.company && <InfoRow label="Компания" value={order.company} />}
                            {order.inn && <InfoRow label="ИИН/БИН" value={order.inn} />}
                            {order.doctor_email && <InfoRow label="Email врача" value={order.doctor_email} />}
                        </div>

                        {/* Delivery */}
                        {(order.delivery_method || order.delivery_address) && (
                            <div className="bg-white rounded-xl border border-gray-200 p-5">
                                <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                                    <Truck className="w-4 h-4 text-purple-600" /> Доставка
                                </h3>
                                <InfoRow label="Способ" value={order.delivery_method === 'pickup' ? 'Самовывоз' : order.delivery_method === 'delivery' ? 'Доставка' : order.delivery_method} />
                                {order.delivery_address && <InfoRow label="Адрес" value={order.delivery_address} />}
                            </div>
                        )}

                        {/* Timeline */}
                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                                <Clock className="w-4 h-4 text-gray-600" /> Хронология
                            </h3>
                            <InfoRow label="Создан" value={createdAt.toLocaleString('ru-RU')} />
                            {order.production_started_at && (
                                <InfoRow label="Начало производства" value={new Date(order.production_started_at).toLocaleString('ru-RU')} />
                            )}
                            {order.production_completed_at && (
                                <InfoRow label="Готов" value={new Date(order.production_completed_at).toLocaleString('ru-RU')} />
                            )}
                            {order.shipped_at && (
                                <InfoRow label="Отгружен" value={new Date(order.shipped_at).toLocaleString('ru-RU')} />
                            )}
                            {order.delivered_at && (
                                <InfoRow label="Доставлен" value={new Date(order.delivered_at).toLocaleString('ru-RU')} />
                            )}
                        </div>
                    </div>

                    {/* Right column: Eye parameters */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <EyeCard side="OD (правый глаз)" data={od} qty={odQty} />
                            <EyeCard side="OS (левый глаз)" data={os} qty={osQty} />
                        </div>

                        {/* Document names */}
                        {(order.document_name_od || order.document_name_os) && (
                            <div className="bg-white rounded-xl border border-gray-200 p-5">
                                <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                                    <FileText className="w-4 h-4 text-gray-600" /> Наименование в документах (1С)
                                </h3>
                                {order.document_name_od && <InfoRow label="OD" value={order.document_name_od} />}
                                {order.document_name_os && <InfoRow label="OS" value={order.document_name_os} />}
                            </div>
                        )}

                        {/* Notes */}
                        {order.notes && (
                            <div className="bg-white rounded-xl border border-gray-200 p-5">
                                <h3 className="font-semibold text-gray-900 mb-3">📝 Примечания</h3>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{order.notes}</p>
                            </div>
                        )}

                        {/* Defects */}
                        {order.defects && order.defects.length > 0 && (
                            <div className="bg-white rounded-xl border border-red-200 p-5">
                                <h3 className="font-semibold text-red-700 flex items-center gap-2 mb-3">
                                    <AlertCircle className="w-4 h-4" /> Дефекты ({order.defects.length})
                                </h3>
                                <div className="space-y-2">
                                    {order.defects.map((d: any, i: number) => (
                                        <div key={i} className="p-3 bg-red-50 rounded-lg text-sm">
                                            <p className="font-medium text-red-800">{d.type || 'Дефект'}</p>
                                            {d.description && <p className="text-red-600 mt-1">{d.description}</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
