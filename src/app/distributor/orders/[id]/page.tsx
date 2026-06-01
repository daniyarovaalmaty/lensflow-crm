'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft, User, Building2, Package, Eye, Stethoscope,
    AlertCircle, CheckCircle2, Clock, MessageSquare, Send
} from 'lucide-react';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    new_order: { label: 'Новый', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    new: { label: 'Новый', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    in_production: { label: 'В работе', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    ready: { label: 'Готов', color: 'bg-green-100 text-green-700 border-green-200' },
    shipped: { label: 'Отправлен', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    out_for_delivery: { label: 'Доставляется', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    delivered: { label: 'Выдан', color: 'bg-gray-100 text-gray-600 border-gray-200' },
    cancelled: { label: 'Отменён', color: 'bg-red-100 text-red-500 border-red-200' },
};

function fmt(v: number | null | undefined): string {
    if (v == null) return '—';
    const n = Number(v);
    return (n > 0 ? '+' : '') + n.toFixed(2);
}

export default function DistributorOrderPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [comment, setComment] = useState('');
    const [sending, setSending] = useState(false);

    const loadOrder = async () => {
        const res = await fetch(`/api/orders/${id}`);
        if (res.ok) setOrder(await res.json());
        setLoading(false);
    };

    useEffect(() => { loadOrder(); }, [id]);

    const handleAddComment = async () => {
        if (!comment.trim()) return;
        setSending(true);
        try {
            await fetch(`/api/orders/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'add_comment', text: comment }),
            });
            setComment('');
            loadOrder();
        } finally { setSending(false); }
    };

    if (loading) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
        </div>
    );

    if (!order) return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
            <AlertCircle className="w-12 h-12 text-red-400" />
            <p className="text-gray-600">Заказ не найден</p>
            <button onClick={() => router.back()} className="text-sm text-indigo-600 hover:underline">← Назад</button>
        </div>
    );

    const statusInfo = STATUS_MAP[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-600 border-gray-200' };
    const lc = order.config || {};
    const rx = lc.prescription;
    const comments: any[] = order.comments || [];

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-3xl mx-auto px-4 py-8">
                <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Назад к заказам
                </button>

                {/* Header */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-xl font-bold text-gray-900">{order.order_id}</span>
                                {order.is_urgent && <span className="text-xs bg-red-100 text-red-600 border border-red-200 px-2.5 py-1 rounded-full font-semibold">Срочно</span>}
                            </div>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${statusInfo.color}`}>
                                {statusInfo.label}
                            </span>
                        </div>
                        <div className="text-right">
                            {order.total_price > 0 && (
                                <div className="text-2xl font-bold text-gray-900">{order.total_price.toLocaleString('ru-RU')} ₸</div>
                            )}
                            <div className="text-xs text-gray-400 mt-0.5">
                                {new Date(order.meta?.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 pt-5 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {order.patient?.name && (
                            <div>
                                <label className="text-xs font-semibold text-gray-400 uppercase mb-1 block">Пациент</label>
                                <p className="flex items-center gap-1.5 text-gray-700 text-sm font-medium">
                                    <User className="w-4 h-4 text-gray-400" />
                                    {order.patient.name}
                                </p>
                                {order.patient.phone && <p className="text-xs text-gray-500 mt-0.5">{order.patient.phone}</p>}
                            </div>
                        )}
                        {order.meta?.optic_name && (
                            <div>
                                <label className="text-xs font-semibold text-gray-400 uppercase mb-1 block">Оптика</label>
                                <p className="flex items-center gap-1.5 text-gray-700 text-sm font-medium">
                                    <Building2 className="w-4 h-4 text-gray-400" />
                                    {order.meta.optic_name}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Prescription */}
                {rx && (
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-5 shadow-sm">
                        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
                            <Stethoscope className="w-5 h-5 text-indigo-500" />
                            Рецепт
                        </h2>
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
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {[
                                        { label: 'OD', eye: rx.od },
                                        { label: 'OS', eye: rx.os },
                                    ].map(({ label, eye }) => (
                                        <tr key={label}>
                                            <td className="py-3 pr-4 text-xs font-bold text-gray-500">{label}</td>
                                            <td className="py-3 px-2 text-center font-mono font-medium text-gray-900">{fmt(eye?.sph)}</td>
                                            <td className="py-3 px-2 text-center font-mono font-medium text-gray-900">{fmt(eye?.cyl)}</td>
                                            <td className="py-3 px-2 text-center font-mono font-medium text-gray-900">{eye?.ax != null ? `${Math.round(eye.ax)}°` : '—'}</td>
                                            <td className="py-3 px-2 text-center font-mono font-medium text-gray-900">{fmt(eye?.add)}</td>
                                            <td className="py-3 px-2 text-center font-mono font-medium text-gray-900">{eye?.pd ?? '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Notes */}
                {order.notes && (
                    <div className="bg-amber-50 rounded-xl border border-amber-100 p-4 mb-5 text-sm text-amber-800">
                        {order.notes}
                    </div>
                )}

                {/* Comments */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
                    <div className="p-5 border-b border-gray-100">
                        <h2 className="font-bold text-gray-900 flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-indigo-500" />
                            Комментарии ({comments.length})
                        </h2>
                    </div>

                    <div className="divide-y divide-gray-50">
                        {comments.length === 0 ? (
                            <div className="p-6 text-center text-gray-400 text-sm">Комментариев пока нет</div>
                        ) : (
                            comments.map((c, i) => (
                                <div key={i} className="p-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-semibold text-gray-800">{c.authorName}</span>
                                        <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleString('ru-RU')}</span>
                                    </div>
                                    <p className="text-sm text-gray-700">{c.text}</p>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-4 border-t border-gray-100">
                        <div className="flex gap-2">
                            <input
                                value={comment}
                                onChange={e => setComment(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                                placeholder="Напишите комментарий..."
                                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                            />
                            <button
                                onClick={handleAddComment}
                                disabled={!comment.trim() || sending}
                                className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
