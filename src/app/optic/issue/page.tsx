'use client';

import { useState, useEffect, useMemo } from 'react';
import QuickNav from '@/components/ui/QuickNav';
import { PackageCheck, Search, User, Phone, CheckCircle, AlertCircle, Loader2, X, Trash2, Boxes } from 'lucide-react';
import { OrderStatusLabels, OrderStatusColors, PaymentStatusLabels, PaymentStatusColors } from '@/types/order';

interface IssueOrder {
    order_id: string;
    patient: { name: string; phone?: string };
    status: string;
    payment_status?: string;
    total_price?: number;
    is_urgent?: boolean;
    config?: any;
    meta?: { created_at?: string };
}

const sLabel = (s: string) => (OrderStatusLabels as Record<string, string>)[s] || s;
const sColor = (s: string) => (OrderStatusColors as Record<string, string>)[s] || 'bg-gray-100 text-gray-600';

export default function IssueOrderPage() {
    const [orders, setOrders] = useState<IssueOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<IssueOrder | null>(null);
    const [issuing, setIssuing] = useState(false);
    const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
    const [products, setProducts] = useState<any[]>([]);
    const [writeOff, setWriteOff] = useState<{ productId: string; name: string; qty: number; stock: number }[]>([]);
    const [pick, setPick] = useState('');

    const load = () => {
        setLoading(true);
        fetch('/api/orders', { cache: 'no-store' })
            .then(r => (r.ok ? r.json() : []))
            .then((data: IssueOrder[]) => {
                const active = (Array.isArray(data) ? data : []).filter(
                    o => !['delivered', 'cancelled'].includes(o.status)
                );
                setOrders(active);
            })
            .catch(() => setOrders([]))
            .finally(() => setLoading(false));
    };
    useEffect(load, []);
    useEffect(() => { fetch('/api/optic/products').then(r => (r.ok ? r.json() : [])).then(p => setProducts(Array.isArray(p) ? p : [])).catch(() => {}); }, []);
    useEffect(() => { setWriteOff([]); setPick(''); }, [selected]);

    // No search → show only orders ready for pickup. Searching → search across all active orders.
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return orders.filter(o => o.status === 'ready');
        return orders.filter(
            o =>
                o.order_id.toLowerCase().includes(q) ||
                (o.patient?.name || '').toLowerCase().includes(q) ||
                (o.patient?.phone || '').toLowerCase().includes(q)
        );
    }, [orders, search]);

    const handleIssue = async (order: IssueOrder) => {
        setIssuing(true);
        try {
            const res = await fetch(`/api/orders/${encodeURIComponent(order.order_id)}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'delivered', writeOff: writeOff.map(w => ({ productId: w.productId, qty: w.qty })) }),
            });
            if (res.ok) {
                const wo = writeOff.reduce((s, w) => s + w.qty, 0);
                setToast({ ok: true, text: `Заказ ${order.order_id} выдан${wo > 0 ? ` · списано: ${wo} шт` : ''}` });
                setOrders(prev => prev.filter(o => o.order_id !== order.order_id));
                setSelected(null);
            } else {
                const d = await res.json().catch(() => ({}));
                setToast({ ok: false, text: d.error || 'Не удалось выдать заказ' });
            }
        } catch {
            setToast({ ok: false, text: 'Ошибка сети' });
        }
        setIssuing(false);
        setTimeout(() => setToast(null), 3500);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <QuickNav />
            <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-sm">
                        <PackageCheck className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Выдать заказ</h1>
                        <p className="text-sm text-gray-500">Найдите заказ и подтвердите выдачу клиенту</p>
                    </div>
                </div>

                {/* Search */}
                <div className="relative mb-5">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        autoFocus
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Номер заказа, имя пациента или телефон…"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
                    />
                </div>

                {/* List */}
                {loading ? (
                    <div className="text-center py-16">
                        <Loader2 className="w-7 h-7 animate-spin text-gray-300 mx-auto" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <PackageCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-gray-500">
                            {search ? 'Ничего не найдено' : 'Нет заказов, готовых к выдаче'}
                        </p>
                        {!search && (
                            <p className="text-sm mt-1">Найдите заказ по номеру, имени или телефону, чтобы выдать его.</p>
                        )}
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {!search && (
                            <p className="text-sm text-gray-500">Готовы к выдаче: {filtered.length}</p>
                        )}
                        {filtered.map(order => {
                            const paid = order.payment_status === 'paid';
                            return (
                                <button
                                    key={order.order_id}
                                    onClick={() => setSelected(order)}
                                    className="text-left bg-white rounded-2xl border border-gray-100 hover:border-teal-200 hover:shadow-md transition-all p-4 flex items-center justify-between gap-4"
                                >
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <span className="font-semibold text-gray-900">{order.order_id}</span>
                                            <span className={`badge ${sColor(order.status)}`}>{sLabel(order.status)}</span>
                                            {!paid && (
                                                <span className={`badge ${(PaymentStatusColors as Record<string, string>)[order.payment_status || 'unpaid']}`}>
                                                    {(PaymentStatusLabels as Record<string, string>)[order.payment_status || 'unpaid']}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-sm text-gray-600 flex items-center gap-3 flex-wrap">
                                            <span className="flex items-center gap-1">
                                                <User className="w-3.5 h-3.5 text-gray-400" />
                                                {order.patient?.name || '—'}
                                            </span>
                                            {order.patient?.phone && (
                                                <span className="flex items-center gap-1 text-gray-400">
                                                    <Phone className="w-3.5 h-3.5" />
                                                    {order.patient.phone}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <div className="font-semibold text-gray-900">
                                            {(order.total_price || 0).toLocaleString('ru-RU')} ₸
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Issue confirmation modal */}
            {selected && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4"
                    onClick={() => !issuing && setSelected(null)}
                >
                    <div
                        className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[90vh] overflow-y-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
                            <h2 className="text-lg font-bold text-gray-900">Выдача заказа {selected.order_id}</h2>
                            <button onClick={() => !issuing && setSelected(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div className="flex items-center gap-2 text-sm flex-wrap">
                                <span className={`badge ${sColor(selected.status)}`}>{sLabel(selected.status)}</span>
                                <span className="flex items-center gap-1 text-gray-700">
                                    <User className="w-4 h-4 text-gray-400" />
                                    <span className="font-medium">{selected.patient?.name || '—'}</span>
                                </span>
                                {selected.patient?.phone && <span className="text-gray-400">· {selected.patient.phone}</span>}
                            </div>

                            {Array.isArray(selected.config?.items) && selected.config.items.length > 0 && (
                                <div>
                                    <div className="text-xs font-semibold text-gray-400 uppercase mb-1.5">Состав</div>
                                    <div className="bg-gray-50 rounded-xl divide-y divide-gray-100">
                                        {selected.config.items.map((it: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                                                <span className="text-gray-800 truncate">
                                                    {it.name}
                                                    {it.eye ? ` (${it.eye})` : ''}
                                                    {it.qty > 1 ? ` × ${it.qty}` : ''}
                                                </span>
                                                {it.price > 0 && (
                                                    <span className="text-gray-500 font-mono flex-shrink-0 ml-3">
                                                        {Number(it.price).toLocaleString('ru-RU')} ₸
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">Сумма</span>
                                <span className="text-lg font-bold text-gray-900">
                                    {(selected.total_price || 0).toLocaleString('ru-RU')} ₸
                                </span>
                            </div>

                            {selected.payment_status !== 'paid' && (
                                <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm text-amber-800">
                                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <span>
                                        Заказ {selected.payment_status === 'partial' ? 'оплачен частично' : 'не оплачен'}. Убедитесь в оплате перед выдачей.
                                    </span>
                                </div>
                            )}

                            {/* Optional: write off stock that physically leaves on issue */}
                            <div className="border-t border-gray-100 pt-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Boxes className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm font-medium text-gray-700">Списать со склада (опционально)</span>
                                </div>
                                <select
                                    value={pick}
                                    onChange={e => {
                                        const p = products.find((x: any) => x.id === e.target.value);
                                        if (p && !writeOff.some(w => w.productId === p.id)) setWriteOff([...writeOff, { productId: p.id, name: p.name, qty: 1, stock: p.currentStock ?? 0 }]);
                                        setPick('');
                                    }}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                                >
                                    <option value="">— добавить товар к списанию —</option>
                                    {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}{p.currentStock != null ? ` (ост. ${p.currentStock})` : ''}</option>)}
                                </select>
                                {products.length === 0 && <p className="text-xs text-gray-400 mt-1">Каталог пуст — нечего списывать.</p>}
                                {writeOff.length > 0 && (
                                    <div className="mt-2 space-y-2">
                                        {writeOff.map((w, i) => (
                                            <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl p-2">
                                                <span className="flex-1 text-sm text-gray-800 truncate">{w.name}</span>
                                                <input type="number" min={1} value={w.qty} onChange={e => setWriteOff(writeOff.map((x, j) => (j === i ? { ...x, qty: Number(e.target.value) || 0 } : x)))} className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-sm text-center" />
                                                {w.qty > w.stock && <span className="text-[10px] text-amber-600 whitespace-nowrap">&gt; ост.</span>}
                                                <button onClick={() => setWriteOff(writeOff.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4 text-gray-400" /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-5 border-t border-gray-100 flex gap-3 sticky bottom-0 bg-white">
                            <button
                                onClick={() => setSelected(null)}
                                disabled={issuing}
                                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 disabled:opacity-50"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={() => handleIssue(selected)}
                                disabled={issuing}
                                className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {issuing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                Выдать заказ
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div
                    className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 ${
                        toast.ok ? 'bg-teal-600 text-white' : 'bg-red-600 text-white'
                    }`}
                >
                    {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {toast.text}
                </div>
            )}
        </div>
    );
}
