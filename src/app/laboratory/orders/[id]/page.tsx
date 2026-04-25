'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
    ArrowLeft, Package, User, Building2, Stethoscope,
    Eye, Zap, Truck, FileText, CreditCard, AlertCircle, Clock, Download
} from 'lucide-react';
import { OrderStatusLabels, PaymentStatusLabels, PaymentStatusColors } from '@/types/order';
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
                if (!res.ok) { setError('Заказ не найден'); return; }
                setOrder(await res.json());
            } catch (e) { setError('Ошибка загрузки'); }
            finally { setLoading(false); }
        })();
    }, [orderId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50">
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

    const charLabel = (c: string) => c === 'toric' ? 'Торическая' : c === 'spherical' ? 'Сферическая' : c;

    const handleDownloadPdf = () => {
        import('@/lib/generateOrderApplicationPdf').then(({ generateOrderApplicationPdf }) => {
            generateOrderApplicationPdf({
                order_id: order.order_id,
                patient: order.patient,
                meta: order.meta,
                company: order.company,
                inn: order.inn,
                config: order.config,
                is_urgent: order.is_urgent,
                document_name_od: order.document_name_od,
                document_name_os: order.document_name_os,
                delivery_method: order.delivery_method,
                delivery_address: order.delivery_address,
                notes: order.notes,
            });
        });
    };

    /* ── Param row helper ── */
    const P = ({ label, val }: { label: string; val: any }) =>
        val != null && val !== '' ? (
            <div className="flex justify-between text-sm py-1.5">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium text-gray-900">{String(val)}</span>
            </div>
        ) : null;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
                {/* ── Back ── */}
                <button onClick={() => window.history.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Назад
                </button>

                {/* ══════════ SINGLE CARD ══════════ */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

                    {/* ── HEADER ── */}
                    <div className="px-6 py-5 border-b border-gray-100">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <Package className="w-5 h-5 text-blue-600" />
                                    {order.order_id}
                                </h1>
                                <p className="text-sm text-gray-500 mt-1">
                                    {createdAt.toLocaleDateString('ru-RU')} · {createdAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                    {order.config?.type && <span> · {order.config.type === 'medilens' ? 'MediLens' : order.config.type}</span>}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap justify-end">
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
                        </div>
                    </div>

                    {/* ── INFO GRID: Patient + Clinic ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                        {/* Patient */}
                        <div className="px-6 py-4">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5" /> Пациент
                            </h3>
                            <p className="text-sm font-semibold text-gray-900">{order.patient?.name || '—'}</p>
                            {order.patient?.phone && <p className="text-sm text-gray-500 mt-0.5">{order.patient.phone}</p>}
                            {order.patient?.email && <p className="text-sm text-gray-500 mt-0.5">{order.patient.email}</p>}
                        </div>
                        {/* Clinic */}
                        <div className="px-6 py-4">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5" /> Клиника / Врач
                            </h3>
                            {order.meta?.optic_name && <p className="text-sm font-semibold text-gray-900">{order.meta.optic_name}</p>}
                            {order.meta?.doctor && (
                                <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
                                    <Stethoscope className="w-3 h-3" /> {order.meta.doctor}
                                </p>
                            )}
                            {order.company && <p className="text-sm text-gray-500 mt-0.5">{order.company}{order.inn ? ` · ИИН ${order.inn}` : ''}</p>}
                        </div>
                    </div>

                    <div className="border-t border-gray-100" />

                    {/* ── LENS PARAMETERS ── */}
                    <div className="px-6 py-5">
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                            <Eye className="w-3.5 h-3.5" /> Параметры линз
                        </h3>

                        {/* Desktop: side-by-side table */}
                        <div className="overflow-x-auto -mx-6 px-6">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200 bg-gray-50/80">
                                        <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">Глаз</th>
                                        <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">Тип</th>
                                        <th className="text-center py-2.5 px-3 text-xs font-semibold text-gray-500">Km</th>
                                        <th className="text-center py-2.5 px-3 text-xs font-semibold text-gray-500">Tp</th>
                                        <th className="text-center py-2.5 px-3 text-xs font-semibold text-gray-500">DIA</th>
                                        <th className="text-center py-2.5 px-3 text-xs font-semibold text-gray-500">Dk</th>
                                        <th className="text-center py-2.5 px-3 text-xs font-semibold text-gray-500">e1</th>
                                        <th className="text-center py-2.5 px-3 text-xs font-semibold text-gray-500">e2</th>
                                        <th className="text-center py-2.5 px-3 text-xs font-semibold text-gray-500">Кол-во</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {odQty > 0 && (
                                        <tr className="border-b border-gray-100">
                                            <td className="py-2.5 px-3 font-semibold text-gray-900">OD</td>
                                            <td className="py-2.5 px-3">
                                                <span className="inline-flex px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded">
                                                    {od.characteristic ? charLabel(od.characteristic) : '—'}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-center text-gray-700">{od.km ?? '—'}</td>
                                            <td className="py-2.5 px-3 text-center text-gray-700">{od.tp ?? '—'}</td>
                                            <td className="py-2.5 px-3 text-center text-gray-700">{od.dia ?? '—'}</td>
                                            <td className="py-2.5 px-3 text-center text-gray-700">{od.dk ?? '—'}</td>
                                            <td className="py-2.5 px-3 text-center text-gray-700">{od.e1 ?? '—'}</td>
                                            <td className="py-2.5 px-3 text-center text-gray-700">{od.e2 ?? '—'}</td>
                                            <td className="py-2.5 px-3 text-center font-semibold text-gray-900">{odQty}</td>
                                        </tr>
                                    )}
                                    {osQty > 0 && (
                                        <tr className="border-b border-gray-100">
                                            <td className="py-2.5 px-3 font-semibold text-gray-900">OS</td>
                                            <td className="py-2.5 px-3">
                                                <span className="inline-flex px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded">
                                                    {os.characteristic ? charLabel(os.characteristic) : '—'}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-center text-gray-700">{os.km ?? '—'}</td>
                                            <td className="py-2.5 px-3 text-center text-gray-700">{os.tp ?? '—'}</td>
                                            <td className="py-2.5 px-3 text-center text-gray-700">{os.dia ?? '—'}</td>
                                            <td className="py-2.5 px-3 text-center text-gray-700">{os.dk ?? '—'}</td>
                                            <td className="py-2.5 px-3 text-center text-gray-700">{os.e1 ?? '—'}</td>
                                            <td className="py-2.5 px-3 text-center text-gray-700">{os.e2 ?? '—'}</td>
                                            <td className="py-2.5 px-3 text-center font-semibold text-gray-900">{osQty}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Toric params if applicable */}
                        {((od.characteristic === 'toric' && odQty > 0) || (os.characteristic === 'toric' && osQty > 0)) && (
                            <div className="mt-4">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Торические параметры</p>
                                <div className="overflow-x-auto -mx-6 px-6">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-gray-200 bg-gray-50/80">
                                                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Глаз</th>
                                                <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500">SPH</th>
                                                <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500">CYL</th>
                                                <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500">AX</th>
                                                <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500">TOR</th>
                                                <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500">Фактор сжатия</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {od.characteristic === 'toric' && odQty > 0 && (
                                                <tr className="border-b border-gray-100">
                                                    <td className="py-2 px-3 font-semibold text-gray-900">OD</td>
                                                    <td className="py-2 px-3 text-center text-gray-700">{od.sph ?? '—'}</td>
                                                    <td className="py-2 px-3 text-center text-gray-700">{od.cyl ?? '—'}</td>
                                                    <td className="py-2 px-3 text-center text-gray-700">{od.ax ?? '—'}</td>
                                                    <td className="py-2 px-3 text-center text-gray-700">{od.tor ?? '—'}</td>
                                                    <td className="py-2 px-3 text-center text-gray-700">{od.compression_factor ?? '—'}</td>
                                                </tr>
                                            )}
                                            {os.characteristic === 'toric' && osQty > 0 && (
                                                <tr className="border-b border-gray-100">
                                                    <td className="py-2 px-3 font-semibold text-gray-900">OS</td>
                                                    <td className="py-2 px-3 text-center text-gray-700">{os.sph ?? '—'}</td>
                                                    <td className="py-2 px-3 text-center text-gray-700">{os.cyl ?? '—'}</td>
                                                    <td className="py-2 px-3 text-center text-gray-700">{os.ax ?? '—'}</td>
                                                    <td className="py-2 px-3 text-center text-gray-700">{os.tor ?? '—'}</td>
                                                    <td className="py-2 px-3 text-center text-gray-700">{os.compression_factor ?? '—'}</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── 1С Document Names ── */}
                    {(order.document_name_od || order.document_name_os) && (
                        <>
                            <div className="border-t border-gray-100" />
                            <div className="px-6 py-4">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5" /> Наименование 1С
                                </h3>
                                {order.document_name_od && <P label="OD" val={order.document_name_od} />}
                                {order.document_name_os && <P label="OS" val={order.document_name_os} />}
                            </div>
                        </>
                    )}

                    {/* ── Additional Info ── */}
                    <div className="border-t border-gray-100" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                        {/* Payment / Price */}
                        <div className="px-6 py-4">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                <CreditCard className="w-3.5 h-3.5" /> Оплата
                            </h3>
                            <P label="Итого" val={order.total_price ? `${fmt(order.total_price)} ₸` : '—'} />
                            {order.discount_percent > 0 && <P label="Скидка" val={`${order.discount_percent}%`} />}
                            {order.tracking_number && <P label="Трек-номер" val={order.tracking_number} />}
                        </div>
                        {/* Delivery / Timeline */}
                        <div className="px-6 py-4">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" /> Хронология
                            </h3>
                            <P label="Создан" val={createdAt.toLocaleString('ru-RU')} />
                            {order.production_started_at && <P label="Производство" val={new Date(order.production_started_at).toLocaleString('ru-RU')} />}
                            {order.production_completed_at && <P label="Готов" val={new Date(order.production_completed_at).toLocaleString('ru-RU')} />}
                            {order.shipped_at && <P label="Отгружен" val={new Date(order.shipped_at).toLocaleString('ru-RU')} />}
                            {order.delivered_at && <P label="Доставлен" val={new Date(order.delivered_at).toLocaleString('ru-RU')} />}
                        </div>
                    </div>

                    {/* ── Delivery ── */}
                    {(order.delivery_method || order.delivery_address) && (
                        <>
                            <div className="border-t border-gray-100" />
                            <div className="px-6 py-4">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                    <Truck className="w-3.5 h-3.5" /> Доставка
                                </h3>
                                <P label="Способ" val={order.delivery_method === 'pickup' ? 'Самовывоз' : order.delivery_method === 'delivery' ? 'Доставка' : order.delivery_method} />
                                {order.delivery_address && <P label="Адрес" val={order.delivery_address} />}
                            </div>
                        </>
                    )}

                    {/* ── Notes ── */}
                    {order.notes && (
                        <>
                            <div className="border-t border-gray-100" />
                            <div className="px-6 py-4">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2"> Примечания</h3>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{order.notes}</p>
                            </div>
                        </>
                    )}

                    {/* ── Defects ── */}
                    {order.defects && order.defects.length > 0 && (
                        <>
                            <div className="border-t border-red-100" />
                            <div className="px-6 py-4 bg-red-50/30">
                                <h3 className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                    <AlertCircle className="w-3.5 h-3.5" /> Дефекты ({order.defects.length})
                                </h3>
                                <div className="space-y-2">
                                    {order.defects.map((d: any, i: number) => (
                                        <div key={i} className="p-3 bg-red-50 rounded-lg text-sm border border-red-100">
                                            <p className="font-medium text-red-800">{d.type || 'Дефект'}</p>
                                            {d.description && <p className="text-red-600 mt-1">{d.description}</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* ── Footer Actions ── */}
                    <div className="border-t border-gray-100 px-6 py-4 bg-gray-50/50 flex items-center gap-3">
                        <button
                            onClick={handleDownloadPdf}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <Download className="w-4 h-4" />
                            Скачать заявку PDF
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
