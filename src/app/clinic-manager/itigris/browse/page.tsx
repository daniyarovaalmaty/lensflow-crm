'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import QuickNav from '@/components/ui/QuickNav';
import { Link2, ArrowLeft, Loader2, AlertCircle, Search, Users, ClipboardList, Calendar, Building2 } from 'lucide-react';

type Tab = 'clients' | 'orders' | 'registry' | 'departments';
const TABS: { key: Tab; label: string; icon: any }[] = [
    { key: 'clients', label: 'Клиенты', icon: Users },
    { key: 'orders', label: 'Заказы', icon: ClipboardList },
    { key: 'registry', label: 'Записи на приём', icon: Calendar },
    { key: 'departments', label: 'Департаменты', icon: Building2 },
];

const fio = (c: any) => [c?.familyName, c?.firstName, c?.patronymicName].filter(Boolean).join(' ') || c?.fullName || '—';
const fmt = (s?: string | null) => (s ? new Date(s).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—');
const fmtD = (s?: string | null) => (s ? new Date(s).toLocaleDateString('ru-RU') : '—');

export default function ItigrisBrowsePage() {
    const [tab, setTab] = useState<Tab>('clients');
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [q, setQ] = useState('');
    const [departments, setDepartments] = useState<any[]>([]);
    const [dept, setDept] = useState('');
    const [page, setPage] = useState(0);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        fetch('/api/itigris/browse?entity=departments').then(r => r.json()).then(d => setDepartments(d.items || [])).catch(() => {});
    }, []);

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        const params = new URLSearchParams({ entity: tab });
        if (tab === 'clients' && q) params.set('q', q);
        if ((tab === 'orders' || tab === 'registry') && dept) params.set('departmentId', dept);
        if (tab === 'orders') params.set('page', String(page));
        try {
            const res = await fetch(`/api/itigris/browse?${params}`);
            const d = await res.json();
            if (!res.ok) { setError(d.error || 'Ошибка запроса'); setItems([]); }
            else { setItems(d.items || []); setTotal(d.total || 0); }
        } catch { setError('Ошибка сети'); setItems([]); }
        setLoading(false);
    }, [tab, q, dept, page]);

    useEffect(() => { load(); }, [tab, dept, page]); // eslint-disable-line react-hooks/exhaustive-deps

    const switchTab = (t: Tab) => { setTab(t); setItems([]); setError(null); setPage(0); };

    return (
        <div className="min-h-screen bg-gray-50">
            <QuickNav />
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
                <Link href="/clinic-manager/itigris" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-orange-600 mb-4">
                    <ArrowLeft className="w-4 h-4" /> К настройкам ITIGRIS
                </Link>

                <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                        <Link2 className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Данные из ITIGRIS</h1>
                        <p className="text-sm text-gray-500">Просмотр напрямую из Optima (только чтение)</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {TABS.map(t => (
                        <button key={t.key} onClick={() => switchTab(t.key)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${tab === t.key ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                            <t.icon className="w-4 h-4" /> {t.label}
                        </button>
                    ))}
                </div>

                {/* Controls */}
                <div className="flex flex-wrap gap-3 mb-4">
                    {tab === 'clients' && (
                        <form onSubmit={e => { e.preventDefault(); load(); }} className="relative flex-1 min-w-[220px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Поиск по ФИО (Enter)..."
                                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-400 outline-none" />
                        </form>
                    )}
                    {(tab === 'orders' || tab === 'registry') && departments.length > 0 && (
                        <select value={dept} onChange={e => { setDept(e.target.value); setPage(0); }}
                            className="px-3 py-2.5 border border-gray-300 rounded-xl text-sm bg-white outline-none">
                            <option value="">Департамент по умолчанию</option>
                            {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name} ({d.type})</option>)}
                        </select>
                    )}
                </div>

                {/* Content */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-16 text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
                    ) : error ? (
                        <div className="flex items-center gap-2 p-4 text-red-600 text-sm"><AlertCircle className="w-4 h-4" /> {error}</div>
                    ) : items.length === 0 ? (
                        <div className="text-center py-16 text-gray-400 text-sm">Нет данных</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                {tab === 'clients' && (
                                    <>
                                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>
                                            <th className="text-left px-4 py-2.5">ФИО</th><th className="text-left px-4 py-2.5">Телефон</th>
                                            <th className="text-left px-4 py-2.5">Регистрация</th><th className="text-left px-4 py-2.5">Комментарий</th>
                                        </tr></thead>
                                        <tbody>{items.map((c: any) => (
                                            <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                                                <td className="px-4 py-2.5 font-medium text-gray-900">{fio(c)}</td>
                                                <td className="px-4 py-2.5 text-gray-600">{c.phoneNumber || c.tel1 || '—'}</td>
                                                <td className="px-4 py-2.5 text-gray-500">{fmtD(c.registrationDate)}</td>
                                                <td className="px-4 py-2.5 text-gray-500 truncate max-w-[220px]">{c.comment || '—'}</td>
                                            </tr>
                                        ))}</tbody>
                                    </>
                                )}
                                {tab === 'orders' && (
                                    <>
                                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>
                                            <th className="text-left px-4 py-2.5">№</th><th className="text-left px-4 py-2.5">Клиент</th>
                                            <th className="text-left px-4 py-2.5">Тип</th><th className="text-left px-4 py-2.5">Статус</th>
                                            <th className="text-left px-4 py-2.5">Создан</th>
                                        </tr></thead>
                                        <tbody>{items.map((o: any) => (
                                            <tr key={o.id} className="border-t border-gray-100 hover:bg-gray-50">
                                                <td className="px-4 py-2.5 font-mono text-gray-700">{o.id}</td>
                                                <td className="px-4 py-2.5 text-gray-900">{fio(o.client)}</td>
                                                <td className="px-4 py-2.5 text-gray-600">{o.type?.name || (typeof o.type === 'string' ? o.type : '—')}</td>
                                                <td className="px-4 py-2.5"><span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{o.statusName || o.status?.name || (typeof o.status === 'string' ? o.status : '—')}</span></td>
                                                <td className="px-4 py-2.5 text-gray-500">{fmt(o.createdAt)}</td>
                                            </tr>
                                        ))}</tbody>
                                    </>
                                )}
                                {tab === 'registry' && (
                                    <>
                                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>
                                            <th className="text-left px-4 py-2.5">Дата приёма</th><th className="text-left px-4 py-2.5">Клиент</th>
                                            <th className="text-left px-4 py-2.5">Услуга</th><th className="text-left px-4 py-2.5">Статус</th>
                                        </tr></thead>
                                        <tbody>{items.map((r: any) => (
                                            <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                                                <td className="px-4 py-2.5 text-gray-900">{fmt(r.appointmentAt)}</td>
                                                <td className="px-4 py-2.5 text-gray-700">{r.client?.fullName || '—'}<span className="text-gray-400 ml-1">{r.client?.phone || ''}</span></td>
                                                <td className="px-4 py-2.5 text-gray-600">{r.serviceType?.name || (typeof r.serviceType === 'string' ? r.serviceType : '—')}</td>
                                                <td className="px-4 py-2.5"><span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{r.status?.name || (typeof r.status === 'string' ? r.status : '—')}</span></td>
                                            </tr>
                                        ))}</tbody>
                                    </>
                                )}
                                {tab === 'departments' && (
                                    <>
                                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>
                                            <th className="text-left px-4 py-2.5">ID</th><th className="text-left px-4 py-2.5">Название</th>
                                            <th className="text-left px-4 py-2.5">Тип</th><th className="text-left px-4 py-2.5">Город</th>
                                        </tr></thead>
                                        <tbody>{items.map((d: any) => (
                                            <tr key={d.id} className="border-t border-gray-100 hover:bg-gray-50">
                                                <td className="px-4 py-2.5 font-mono text-gray-600">{d.id}</td>
                                                <td className="px-4 py-2.5 font-medium text-gray-900">{d.name}</td>
                                                <td className="px-4 py-2.5 text-gray-600">{d.type}</td>
                                                <td className="px-4 py-2.5 text-gray-500">{d.city || '—'}</td>
                                            </tr>
                                        ))}</tbody>
                                    </>
                                )}
                            </table>
                        </div>
                    )}
                </div>

                {/* Orders pagination */}
                {tab === 'orders' && !loading && !error && total > 50 && (
                    <div className="flex items-center justify-between mt-3 text-sm">
                        <span className="text-gray-500">Всего: {total} · стр. {page + 1}</span>
                        <div className="flex gap-2">
                            <button disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))} className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg disabled:opacity-40">Назад</button>
                            <button disabled={(page + 1) * 50 >= total} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg disabled:opacity-40">Вперёд</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
