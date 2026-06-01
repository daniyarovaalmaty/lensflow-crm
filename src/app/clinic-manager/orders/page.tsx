'use client';

import { useState, useEffect, useCallback } from 'react';
import QuickNav from '@/components/ui/QuickNav';
import { ClipboardList, Search, RefreshCw, User, ExternalLink } from 'lucide-react';

interface Order {
    id: string;
    orderNumber: string;
    status: string;
    totalPrice: number | null;
    source: string | null;
    externalId: string | null;
    createdAt: string;
    patient: { id: string; name: string; phone: string } | null;
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
    new_order:     { label: 'Новый',          cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    in_production: { label: 'В производстве', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    ready:         { label: 'Готов',           cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    delivered:     { label: 'Выдан',           cls: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
    shipped:       { label: 'Отправлен',       cls: 'bg-violet-50 text-violet-700 border-violet-200' },
    cancelled:     { label: 'Отменён',         cls: 'bg-red-50 text-red-700 border-red-200' },
};

export default function ClinicManagerOrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [total, setTotal] = useState(0);
    const [pages, setPages] = useState(1);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [source, setSource] = useState('all');
    const [status, setStatus] = useState('all');
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ search, page: String(page), source, status });
            const res = await fetch(`/api/clinic-manager/orders?${params}`);
            if (res.ok) {
                const data = await res.json();
                setOrders(data.orders);
                setTotal(data.total);
                setPages(data.pages);
            }
        } finally {
            setLoading(false);
        }
    }, [search, page, source, status]);

    useEffect(() => { loadData(); }, [loadData]);

    const fmtDate = (s: string) => new Date(s).toLocaleDateString('ru-RU');
    const fmtMoney = (n: number | null) => n != null ? n.toLocaleString('ru-RU') + ' ₸' : '—';

    return (
        <div className="min-h-screen bg-gray-50">
            <QuickNav />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <ClipboardList className="w-6 h-6 text-violet-600" />
                            Заказы
                            <span className="text-base font-normal text-gray-400 ml-1">({total})</span>
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">Заказы клиники, включая синхронизированные из ITIGRIS</p>
                    </div>
                    <button onClick={loadData} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">
                        <RefreshCw className="w-4 h-4" /> Обновить
                    </button>
                </div>

                {/* Filters */}
                <div className="flex gap-3 mb-5 flex-wrap">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                            placeholder="Поиск по номеру или пациенту..."
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
                        />
                    </div>
                    {['all', 'itigris'].map(s => (
                        <button key={s} onClick={() => { setSource(s); setPage(1); }} className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${source === s ? 'bg-violet-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                            {s === 'all' ? 'Все' : '📥 Из ITIGRIS'}
                        </button>
                    ))}
                    <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-700 focus:ring-2 focus:ring-violet-500 outline-none cursor-pointer">
                        <option value="all">Все статусы</option>
                        {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                </div>

                {/* Orders table */}
                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="w-8 h-8 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
                    </div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <ClipboardList className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>Заказы не найдены</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                    <th className="px-5 py-3.5 text-left">Номер</th>
                                    <th className="px-5 py-3.5 text-left">Пациент</th>
                                    <th className="px-5 py-3.5 text-left">Статус</th>
                                    <th className="px-5 py-3.5 text-right">Сумма</th>
                                    <th className="px-5 py-3.5 text-center">Дата</th>
                                    <th className="px-5 py-3.5 text-center w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {orders.map(order => {
                                    const st = STATUS_LABELS[order.status] || { label: order.status, cls: 'bg-gray-50 text-gray-600 border-gray-200' };
                                    return (
                                        <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-5 py-3">
                                                <div className="font-semibold text-gray-900">{order.orderNumber}</div>
                                                {order.source === 'itigris' && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 border border-orange-200">ITIGRIS</span>}
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-2 text-gray-700">
                                                    <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                    {order.patient?.name || <span className="text-gray-400">—</span>}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${st.cls}`}>{st.label}</span>
                                            </td>
                                            <td className="px-5 py-3 text-right font-semibold text-gray-900">{fmtMoney(order.totalPrice)}</td>
                                            <td className="px-5 py-3 text-center text-xs text-gray-500">{fmtDate(order.createdAt)}</td>
                                            <td className="px-5 py-3 text-center">
                                                <a href={`/optic/orders/${order.id}`} className="text-gray-400 hover:text-violet-600 transition-colors">
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                </a>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {pages > 1 && (
                    <div className="flex justify-center gap-1.5 mt-6">
                        {Array.from({ length: Math.min(pages, 10) }, (_, i) => i + 1).map(p => (
                            <button key={p} onClick={() => setPage(p)} className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors ${page === p ? 'bg-violet-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{p}</button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
