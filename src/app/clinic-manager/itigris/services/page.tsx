'use client';

import { useState } from 'react';
import Link from 'next/link';
import QuickNav from '@/components/ui/QuickNav';
import { Link2, ArrowLeft, Loader2, Search, Glasses, Package, CreditCard } from 'lucide-react';

async function call(params: Record<string, string>) {
    const sp = new URLSearchParams(params);
    const res = await fetch(`/api/itigris/legacy?${sp}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Ошибка');
    return data;
}

function LensStock() {
    const [f, setF] = useState({ manufacturer: '', name: '', dioptre: '', cylinder: '', radiusOfCurvature: '' });
    const [rows, setRows] = useState<{ store: string; count: number }[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const go = async (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true); setError(null);
        try {
            const d = await call({ type: 'lens', ...f });
            setRows((d.rows || []).filter((r: any) => r.count > 0).sort((a: any, b: any) => b.count - a.count));
        } catch (e: any) { setError(e.message); setRows(null); }
        setLoading(false);
    };
    const total = rows?.reduce((s, r) => s + Number(r.count || 0), 0) || 0;

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-1"><Glasses className="w-4 h-4 text-orange-500" /> Остатки контактных линз</h2>
            <p className="text-sm text-gray-500 mb-4">Доступность по магазинам сети. Фильтры — точные значения из справочника Optima.</p>
            <form onSubmit={go} className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {([['manufacturer', 'Производитель'], ['name', 'Наименование'], ['dioptre', 'Сфера (dioptre)'], ['cylinder', 'Цилиндр'], ['radiusOfCurvature', 'Радиус кривизны']] as const).map(([k, label]) => (
                    <input key={k} value={(f as any)[k]} onChange={e => setF(s => ({ ...s, [k]: e.target.value }))} placeholder={label}
                        className="px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-400" />
                ))}
                <button type="submit" disabled={loading} className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Найти
                </button>
            </form>
            {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
            {rows && (
                rows.length === 0 ? <div className="text-gray-400 text-sm py-4 text-center">Нет в наличии по этому фильтру</div> : (
                    <div className="overflow-x-auto">
                        <div className="text-xs text-gray-500 mb-2">Всего в наличии: <b>{total}</b> · точек: {rows.length}</div>
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr><th className="text-left px-4 py-2">Магазин</th><th className="text-right px-4 py-2">Остаток</th></tr></thead>
                            <tbody>{rows.map(r => (
                                <tr key={r.store} className="border-t border-gray-100"><td className="px-4 py-2 text-gray-800">{r.store}</td><td className="px-4 py-2 text-right font-mono font-medium text-gray-900">{r.count}</td></tr>
                            ))}</tbody>
                        </table>
                    </div>
                )
            )}
        </div>
    );
}

function Lookup({ title, icon: Icon, type, paramKey, paramLabel }: { title: string; icon: any; type: string; paramKey: string; paramLabel: string }) {
    const [id, setId] = useState('');
    const [result, setResult] = useState<any>(undefined);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const go = async (e: React.FormEvent) => {
        e.preventDefault(); if (!id) return; setLoading(true); setError(null); setResult(undefined);
        try { const d = await call({ type, [paramKey]: id }); setResult(d.result); }
        catch (e: any) { setError(e.message); }
        setLoading(false);
    };
    const notFound = typeof result === 'string' && /notfound/i.test(result);

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-3"><Icon className="w-4 h-4 text-orange-500" /> {title}</h2>
            <form onSubmit={go} className="flex gap-2 mb-3">
                <input value={id} onChange={e => setId(e.target.value)} placeholder={paramLabel}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-400" />
                <button type="submit" disabled={loading || !id} className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Запрос
                </button>
            </form>
            {error && <div className="text-red-600 text-sm">{error}</div>}
            {result !== undefined && (
                notFound ? <div className="text-gray-400 text-sm">Не найдено</div> : (
                    <pre className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm text-gray-800 whitespace-pre-wrap break-all">{typeof result === 'string' ? result : JSON.stringify(result, null, 2)}</pre>
                )
            )}
        </div>
    );
}

export default function ItigrisServicesPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            <QuickNav />
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
                <Link href="/clinic-manager/itigris" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-orange-600">
                    <ArrowLeft className="w-4 h-4" /> К настройкам ITIGRIS
                </Link>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center"><Link2 className="w-5 h-5 text-orange-600" /></div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Сервисы ITIGRIS</h1>
                        <p className="text-sm text-gray-500">Внешнее (легаси) API: остатки линз, статус заказа, дисконтная карта</p>
                    </div>
                </div>

                <LensStock />
                <Lookup title="Статус заказа" icon={Package} type="order" paramKey="orderId" paramLabel="Номер заказа (orderId)" />
                <div className="grid sm:grid-cols-2 gap-5">
                    <Lookup title="Бонусы по карте" icon={CreditCard} type="bonus" paramKey="clientCardId" paramLabel="ID дисконтной карты" />
                    <Lookup title="Скидка по карте" icon={CreditCard} type="card" paramKey="clientCardId" paramLabel="ID дисконтной карты" />
                </div>
            </div>
        </div>
    );
}
