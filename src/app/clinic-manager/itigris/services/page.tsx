'use client';

import { useState } from 'react';
import Link from 'next/link';
import QuickNav from '@/components/ui/QuickNav';
import { Link2, ArrowLeft, Loader2, Search, Glasses, Package, CreditCard, History, Send, Check, X } from 'lucide-react';

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

// ----- RemoteAPI (separate key) -----
function BonusHistory() {
    const [card, setCard] = useState('');
    const [rows, setRows] = useState<any[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);

    const go = async (e: React.FormEvent) => {
        e.preventDefault(); if (!card) return; setLoading(true); setMsg(null); setRows(null);
        try {
            const d = await fetch(`/api/optic/itigris-remote?action=bonus-history&clientCardId=${encodeURIComponent(card)}`).then(r => r.json());
            if (d.notConfigured) setMsg('Нужен RemoteAPI-ключ — добавьте его в настройках ITIGRIS.');
            else if (d.error) setMsg(d.error);
            else setRows(Array.isArray(d.items) ? d.items : []);
        } catch { setMsg('Ошибка запроса'); }
        setLoading(false);
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-3"><History className="w-4 h-4 text-orange-500" /> История бонусов</h2>
            <form onSubmit={go} className="flex gap-2 mb-3">
                <input value={card} onChange={e => setCard(e.target.value)} placeholder="ID дисконтной карты"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-400" />
                <button type="submit" disabled={loading || !card} className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} История
                </button>
            </form>
            {msg && <div className="text-sm text-gray-500">{msg}</div>}
            {rows && (rows.length === 0 ? <div className="text-gray-400 text-sm">Операций нет</div> : (
                <div className="divide-y divide-gray-50">
                    {rows.map((r, i) => {
                        const sum = Number(r.sum) || 0;
                        return (
                            <div key={i} className="flex items-center justify-between py-2 text-sm gap-3">
                                <div className="min-w-0">
                                    <div className="text-gray-800 truncate">{r.description || 'Операция'}</div>
                                    {r.operationDate && <div className="text-[11px] text-gray-400">{r.operationDate}</div>}
                                </div>
                                <span className={`font-mono font-semibold flex-shrink-0 ${sum < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{sum > 0 ? '+' : ''}{sum}</span>
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}

function SendSms() {
    const [clientId, setClientId] = useState('');
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

    const go = async (e: React.FormEvent) => {
        e.preventDefault(); if (!clientId || !text.trim()) return; setSending(true); setMsg(null);
        try {
            const res = await fetch('/api/optic/itigris-remote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'sms', clientId, content: text }) });
            const d = await res.json();
            if (d.notConfigured) setMsg({ ok: false, text: 'Нужен RemoteAPI-ключ' });
            else if (res.ok && d.ok) { setMsg({ ok: true, text: 'СМС отправлено' }); setText(''); }
            else setMsg({ ok: false, text: d.error || `Не отправлено${d.result ? ': ' + d.result : ''}` });
        } catch { setMsg({ ok: false, text: 'Ошибка отправки' }); }
        setSending(false);
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-3"><Send className="w-4 h-4 text-orange-500" /> СМС клиенту</h2>
            <form onSubmit={go} className="space-y-2">
                <input value={clientId} onChange={e => setClientId(e.target.value)} placeholder="ID клиента (Itigris)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-400" />
                <textarea value={text} onChange={e => setText(e.target.value)} rows={2} placeholder="Текст (без смешения кириллицы и латиницы)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
                <button type="submit" disabled={sending || !clientId || !text.trim()} className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Отправить
                </button>
            </form>
            {msg && <div className={`mt-2 text-sm flex items-center gap-1.5 ${msg.ok ? 'text-emerald-600' : 'text-red-600'}`}>{msg.ok ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />} {msg.text}</div>}
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

                <div className="flex items-center gap-3 pt-2">
                    <div className="h-px bg-gray-200 flex-1" />
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">RemoteAPI (отдельный ключ)</span>
                    <div className="h-px bg-gray-200 flex-1" />
                </div>
                <div className="grid sm:grid-cols-2 gap-5">
                    <BonusHistory />
                    <SendSms />
                </div>
            </div>
        </div>
    );
}
