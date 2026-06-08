'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Package, User, Phone, Mail, Building2,
    Clock, CheckCircle, Truck, Edit2, AlertCircle, Eye,
    MapPin, FileText, Zap, Calendar, ChevronRight, MessageSquare
} from 'lucide-react';
import { ReadOnlyEyeCard } from '@/components/order/ReadOnlyEyeCard';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any; bg: string }> = {
    new:          { label: 'Новый',          color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',   icon: Clock },
    in_production:{ label: 'В производстве', color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200', icon: Package },
    ready:        { label: 'Готов',          color: 'text-green-700',  bg: 'bg-green-50 border-green-200', icon: CheckCircle },
    shipped:      { label: 'Отгружен',       color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200',icon: Truck },
    delivered:    { label: 'Доставлен',      color: 'text-emerald-700',bg: 'bg-emerald-50 border-emerald-200',icon: CheckCircle },
    cancelled:    { label: 'Отменён',        color: 'text-red-700',    bg: 'bg-red-50 border-red-200',     icon: AlertCircle },
    rework:       { label: 'Переделка',      color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200',icon: AlertCircle },
};

function EyeRow({ label, data }: { label: string; data: any }) {
    if (!data) return null;
    const fields = [
        ['Km', data.Km || data.km],
        ['Dia', data.Dia || data.dia],
        ['Dk', data.Dk || data.dk],
        ['Sph', data.sph],
        ['Cyl', data.cyl],
        ['Ax', data.ax],
        ['Add', data.add],
        ['BC', data.bc],
        ['Qty', data.qty],
    ].filter(([, v]) => v != null && v !== '' && v !== 0);

    if (fields.length === 0) return null;
    return (
        <div className="flex items-start gap-4 py-2">
            <div className="w-8 flex-shrink-0">
                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{label}</span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
                {fields.map(([key, val]) => (
                    <span key={key as string} className="text-sm">
                        <span className="text-gray-400 text-xs">{key}: </span>
                        <span className="font-mono font-semibold text-gray-800">{String(val)}</span>
                    </span>
                ))}
            </div>
        </div>
    );
}

export default function OrderViewPage() {
    const params = useParams();
    const router = useRouter();
    const orderId = params.id as string;

    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [sendingComment, setSendingComment] = useState(false);

    useEffect(() => {
        fetch(`/api/orders/${orderId}`)
            .then(r => {
                if (!r.ok) throw new Error(r.status === 404 ? 'Заказ не найден' : 'Ошибка загрузки');
                return r.json();
            })
            .then(data => { setOrder(data); })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));

        fetch(`/api/orders/${orderId}/comments`)
            .then(r => r.ok ? r.json() : [])
            .then(data => setComments(Array.isArray(data) ? data : []));
    }, [orderId]);

    const sendComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        setSendingComment(true);
        try {
            const res = await fetch(`/api/orders/${orderId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: newComment }),
            });
            if (res.ok) {
                const c = await res.json();
                setComments(prev => [...prev, c]);
                setNewComment('');
            }
        } finally {
            setSendingComment(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-surface flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
    );

    if (error || !order) return (
        <div className="min-h-screen bg-surface flex items-center justify-center">
            <div className="text-center">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                <p className="text-gray-700 font-semibold">{error || 'Заказ не найден'}</p>
                <button onClick={() => router.back()} className="btn btn-primary mt-4">← Назад</button>
            </div>
        </div>
    );

    const statusCfg = STATUS_CONFIG[order.status] || { label: order.status, color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200', icon: Package };
    const StatusIcon = statusCfg.icon;
    const lensConfig = order.config || {};
    const od = lensConfig?.eyes?.od || lensConfig?.od;
    const os = lensConfig?.eyes?.os || lensConfig?.os;

    const canEdit = order.status === 'new';

    return (
        <div className="min-h-screen bg-surface">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">

                {/* Back + Actions */}
                <div className="flex items-center justify-between mb-6">
                    <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Назад
                    </button>
                    {canEdit && (
                        <Link href={`/optic/orders/${orderId}/edit`} className="btn btn-primary flex items-center gap-2 text-sm">
                            <Edit2 className="w-4 h-4" /> Редактировать
                        </Link>
                    )}
                </div>

                {/* Order Header Card */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-4">
                    <div className="flex items-start justify-between flex-wrap gap-3">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-2xl font-bold text-gray-900">{order.order_id}</h1>
                                {order.is_urgent && (
                                    <span className="flex items-center gap-1 text-xs font-bold bg-red-100 text-red-700 px-2 py-1 rounded-full">
                                        <Zap className="w-3 h-3" /> СРОЧНО
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-gray-500">
                                Создан: {new Date(order.meta?.created_at || order.createdAt).toLocaleDateString('ru-RU', {
                                    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                })}
                            </p>
                        </div>
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold ${statusCfg.bg} ${statusCfg.color}`}>
                            <StatusIcon className="w-4 h-4" />
                            {statusCfg.label}
                        </div>
                    </div>

                    {/* Status timeline */}
                    <div className="mt-5 flex items-center gap-1 overflow-x-auto pb-1">
                        {['new', 'in_production', 'ready', 'shipped', 'delivered'].map((s, i, arr) => {
                            const statuses = ['new', 'in_production', 'ready', 'shipped', 'delivered'];
                            const currentIdx = statuses.indexOf(order.status);
                            const isDone = statuses.indexOf(s) <= currentIdx;
                            const cfg = STATUS_CONFIG[s];
                            return (
                                <div key={s} className="flex items-center gap-1 flex-shrink-0">
                                    <div className={`text-xs px-2 py-1 rounded-full font-medium transition-all ${isDone ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-400'}`}>
                                        {cfg.label}
                                    </div>
                                    {i < arr.length - 1 && <ChevronRight className={`w-3 h-3 flex-shrink-0 ${isDone ? 'text-primary-400' : 'text-gray-300'}`} />}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* LEFT: Lens Config */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Lens Parameters */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                                <Eye className="w-4 h-4" /> Параметры линз
                            </h2>
                            {lensConfig?.lens_type && (
                                <div className="mb-3 text-sm">
                                    <span className="text-gray-500">Тип: </span>
                                    <span className="font-semibold text-gray-800">{lensConfig.lens_type}</span>
                                </div>
                            )}
                            {(od || os) ? (
                                <div className="space-y-4">
                                    {od && <ReadOnlyEyeCard eye="od" label="OD (Правый глаз)" config={od} qty={Number(od.qty || 1)} />}
                                    {os && <ReadOnlyEyeCard eye="os" label="OS (Левый глаз)" config={os} qty={Number(os.qty || 1)} />}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400 italic">Параметры не указаны</p>
                            )}
                            {lensConfig && typeof lensConfig === 'object' && (
                                <details className="mt-3">
                                    <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">Полная конфигурация (JSON)</summary>
                                    <pre className="mt-2 text-xs bg-gray-50 rounded-lg p-3 overflow-auto max-h-40 text-gray-600">
                                        {JSON.stringify(lensConfig, null, 2)}
                                    </pre>
                                </details>
                            )}
                        </div>

                        {/* Notes */}
                        {order.notes && (
                            <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5">
                                <h2 className="text-sm font-bold text-amber-700 mb-2 flex items-center gap-2">
                                    <FileText className="w-4 h-4" /> Примечания
                                </h2>
                                <p className="text-sm text-amber-900">{order.notes}</p>
                            </div>
                        )}

                        {/* Comments */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                                <MessageSquare className="w-4 h-4" /> Комментарии
                            </h2>
                            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                                {comments.length === 0 ? (
                                    <p className="text-sm text-gray-400 italic">Комментариев пока нет</p>
                                ) : comments.map((c: any) => (
                                    <div key={c.id} className="flex gap-3">
                                        <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-700 flex-shrink-0">
                                            {(c.author?.fullName || c.authorName || '?')[0]}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="text-xs font-semibold text-gray-700">{c.author?.fullName || c.authorName || 'Пользователь'}</span>
                                                <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <p className="text-sm text-gray-700">{c.text || c.content}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <form onSubmit={sendComment} className="flex gap-2">
                                <input
                                    type="text"
                                    value={newComment}
                                    onChange={e => setNewComment(e.target.value)}
                                    placeholder="Добавить комментарий..."
                                    className="input flex-1 text-sm"
                                />
                                <button type="submit" disabled={sendingComment || !newComment.trim()} className="btn btn-primary text-sm px-4">
                                    {sendingComment ? '...' : 'Отправить'}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* RIGHT: Sidebar */}
                    <div className="space-y-4">
                        {/* Patient */}
                        {order.patient && (
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                                    <User className="w-3.5 h-3.5" /> Пациент
                                </h2>
                                <p className="font-semibold text-gray-900 mb-2">{order.patient.name}</p>
                                {order.patient.phone && (
                                    <a href={`tel:${order.patient.phone}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600 mb-1 transition-colors">
                                        <Phone className="w-3.5 h-3.5 text-gray-400" /> {order.patient.phone}
                                    </a>
                                )}
                                {order.patient.email && (
                                    <a href={`mailto:${order.patient.email}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600 transition-colors">
                                        <Mail className="w-3.5 h-3.5 text-gray-400" /> {order.patient.email}
                                    </a>
                                )}
                                {order.patient.id && (
                                    <Link href={`/optic/patients/${order.patient.id}`}
                                        className="mt-3 flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium">
                                        Карточка пациента <ChevronRight className="w-3 h-3" />
                                    </Link>
                                )}
                            </div>
                        )}

                        {/* Clinic info */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                                <Building2 className="w-3.5 h-3.5" /> Клиника / Врач
                            </h2>
                            {order.meta?.optic_name && <p className="text-sm font-semibold text-gray-900 mb-1">{order.meta.optic_name}</p>}
                            {order.meta?.doctor && <p className="text-sm text-gray-600">{order.meta.doctor}</p>}
                            {order.doctor_email && (
                                <a href={`mailto:${order.doctor_email}`} className="flex items-center gap-2 text-xs text-gray-500 hover:text-primary-600 mt-1 transition-colors">
                                    <Mail className="w-3 h-3" /> {order.doctor_email}
                                </a>
                            )}
                        </div>

                        {/* Delivery */}
                        {(order.delivery_method || order.delivery_address || order.tracking_number) && (
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                                    <Truck className="w-3.5 h-3.5" /> Доставка
                                </h2>
                                {order.delivery_method && <p className="text-sm text-gray-700 mb-1">{order.delivery_method}</p>}
                                {order.delivery_address && (
                                    <p className="flex items-start gap-1.5 text-sm text-gray-600">
                                        <MapPin className="w-3.5 h-3.5 mt-0.5 text-gray-400 flex-shrink-0" /> {order.delivery_address}
                                    </p>
                                )}
                                {order.tracking_number && (
                                    <p className="mt-2 text-xs font-mono bg-gray-50 px-2 py-1 rounded border">
                                        Трек: {order.tracking_number}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Price */}
                        {order.totalPrice != null && (
                            <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl p-5 text-white">
                                <p className="text-xs font-semibold text-primary-200 uppercase mb-1">Сумма заказа</p>
                                <p className="text-2xl font-bold">{(order.totalPrice / 100 || order.totalPrice).toLocaleString('ru-RU')} ₸</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
