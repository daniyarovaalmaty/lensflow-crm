'use client';

import { useState, useEffect, useCallback } from 'react';
import QuickNav from '@/components/ui/QuickNav';
import { Wrench, Plus, X, Check, Loader2, Trash2, Play, PackageCheck, Ban, User, Phone } from 'lucide-react';

interface Repair {
    id: string;
    number: string;
    clientName?: string | null;
    clientPhone?: string | null;
    itemDescription: string;
    problem?: string | null;
    price: number;
    status: string;
    masterName?: string | null;
    notes?: string | null;
    readyAt?: string | null;
    issuedAt?: string | null;
    createdAt: string;
}

const STATUS: Record<string, { label: string; cls: string }> = {
    accepted: { label: 'Принят', cls: 'bg-blue-100 text-blue-700' },
    in_progress: { label: 'В работе', cls: 'bg-amber-100 text-amber-700' },
    ready: { label: 'Готов', cls: 'bg-emerald-100 text-emerald-700' },
    issued: { label: 'Выдан', cls: 'bg-purple-100 text-purple-700' },
    cancelled: { label: 'Отменён', cls: 'bg-red-100 text-red-600' },
};
const FILTERS: [string, string][] = [['all', 'Все'], ['accepted', 'Принятые'], ['in_progress', 'В работе'], ['ready', 'Готовые'], ['issued', 'Выданные']];

export default function RepairsPage() {
    const [repairs, setRepairs] = useState<Repair[]>([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

    const [showForm, setShowForm] = useState(false);
    const [f, setF] = useState({ clientName: '', clientPhone: '', itemDescription: '', problem: '', price: '', masterName: '', notes: '' });
    const [saving, setSaving] = useState(false);

    const flash = (ok: boolean, text: string) => { setToast({ ok, text }); setTimeout(() => setToast(null), 3000); };

    const load = useCallback(() => {
        setLoading(true);
        fetch('/api/optic/repairs')
            .then(r => (r.ok ? r.json() : []))
            .then(d => setRepairs(Array.isArray(d) ? d : []))
            .finally(() => setLoading(false));
    }, []);
    useEffect(() => { load(); }, [load]);

    const submit = async () => {
        if (!f.itemDescription.trim()) return;
        setSaving(true);
        const res = await fetch('/api/optic/repairs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
        if (res.ok) { setShowForm(false); setF({ clientName: '', clientPhone: '', itemDescription: '', problem: '', price: '', masterName: '', notes: '' }); flash(true, 'Принято в ремонт'); load(); }
        else { const e = await res.json().catch(() => ({})); flash(false, e.error || 'Ошибка'); }
        setSaving(false);
    };

    const setStatus = async (id: string, status: string, msg: string) => {
        setBusy(id);
        const res = await fetch('/api/optic/repairs', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
        if (res.ok) { flash(true, msg); load(); }
        else { const e = await res.json().catch(() => ({})); flash(false, e.error || 'Ошибка'); }
        setBusy(null);
    };
    const remove = async (id: string) => {
        setBusy(id);
        const res = await fetch(`/api/optic/repairs?id=${id}`, { method: 'DELETE' });
        if (res.ok) { flash(true, 'Удалено'); load(); }
        else { const e = await res.json().catch(() => ({})); flash(false, e.error || 'Ошибка'); }
        setBusy(null);
    };

    const shown = filter === 'all' ? repairs : repairs.filter(r => r.status === filter);
    const fmtDate = (s?: string | null) => s ? new Date(s).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : null;

    return (
        <div className="min-h-screen bg-gray-50">
            <QuickNav />
            <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center shadow-sm"><Wrench className="w-6 h-6 text-white" /></div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Ремонт</h1>
                            <p className="text-sm text-gray-500">Журнал ремонтов — приём, работа, выдача</p>
                        </div>
                    </div>
                    <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold"><Plus className="w-4 h-4" /> Принять в ремонт</button>
                </div>

                {/* Filter chips */}
                <div className="flex items-center gap-1.5 mb-5 flex-wrap">
                    {FILTERS.map(([k, label]) => {
                        const n = k === 'all' ? repairs.length : repairs.filter(r => r.status === k).length;
                        return <button key={k} onClick={() => setFilter(k)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === k ? 'bg-purple-600 text-white' : 'bg-white border border-gray-100 text-gray-600 hover:bg-gray-50'}`}>{label} {n > 0 && <span className={filter === k ? 'opacity-80' : 'text-gray-400'}>{n}</span>}</button>;
                    })}
                </div>

                {loading ? (
                    <div className="text-center py-16"><Loader2 className="w-7 h-7 animate-spin text-gray-300 mx-auto" /></div>
                ) : shown.length === 0 ? (
                    <div className="text-center py-16 text-gray-400"><Wrench className="w-12 h-12 mx-auto mb-3 text-gray-300" /><p className="text-gray-500">{filter === 'all' ? 'Ремонтов пока нет' : 'Нет ремонтов в этом статусе'}</p></div>
                ) : (
                    <div className="grid gap-3">
                        {shown.map(r => (
                            <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-gray-900">{r.number}</span>
                                            <span className={`badge ${STATUS[r.status]?.cls || 'bg-gray-100 text-gray-600'}`}>{STATUS[r.status]?.label || r.status}</span>
                                            {r.price > 0 && <span className="text-sm text-gray-500">{r.price.toLocaleString('ru-RU')} ₸</span>}
                                        </div>
                                        <p className="text-sm font-medium text-gray-800 mt-1.5">{r.itemDescription}</p>
                                        {r.problem && <p className="text-sm text-gray-600 mt-0.5">{r.problem}</p>}
                                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-2 flex-wrap">
                                            {r.clientName && <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {r.clientName}</span>}
                                            {r.clientPhone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {r.clientPhone}</span>}
                                            {r.masterName && <span>мастер: {r.masterName}</span>}
                                            <span>принят {fmtDate(r.createdAt)}</span>
                                            {r.readyAt && <span className="text-emerald-500">готов {fmtDate(r.readyAt)}</span>}
                                            {r.issuedAt && <span className="text-purple-500">выдан {fmtDate(r.issuedAt)}</span>}
                                        </div>
                                    </div>
                                    <button onClick={() => remove(r.id)} disabled={busy === r.id} className="text-gray-300 hover:text-red-500 flex-shrink-0" title="Удалить"><Trash2 className="w-4 h-4" /></button>
                                </div>
                                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50">
                                    {r.status === 'accepted' && <button disabled={busy === r.id} onClick={() => setStatus(r.id, 'in_progress', 'В работе')} className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1 disabled:opacity-50"><Play className="w-3.5 h-3.5" /> В работу</button>}
                                    {r.status === 'in_progress' && <button disabled={busy === r.id} onClick={() => setStatus(r.id, 'ready', 'Готов к выдаче')} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 disabled:opacity-50"><Check className="w-3.5 h-3.5" /> Готов</button>}
                                    {r.status === 'ready' && <button disabled={busy === r.id} onClick={() => setStatus(r.id, 'issued', 'Выдан клиенту')} className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1 disabled:opacity-50"><PackageCheck className="w-3.5 h-3.5" /> Выдать</button>}
                                    {r.status === 'issued' && <span className="text-xs text-purple-600 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Выдан</span>}
                                    {(r.status === 'accepted' || r.status === 'in_progress') && <button disabled={busy === r.id} onClick={() => setStatus(r.id, 'cancelled', 'Отменён')} className="text-xs font-medium text-gray-400 hover:text-red-500 flex items-center gap-1 disabled:opacity-50 ml-auto"><Ban className="w-3.5 h-3.5" /> Отменить</button>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {showForm && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4" onClick={() => !saving && setShowForm(false)}>
                    <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
                            <h2 className="text-lg font-bold text-gray-900">Приём в ремонт</h2>
                            <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-gray-400 uppercase">Что сдаётся в ремонт *</label>
                                <input value={f.itemDescription} onChange={e => setF({ ...f, itemDescription: e.target.value })} autoFocus placeholder="Напр. Оправа Ray-Ban RB2140" className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-400 uppercase">Неисправность</label>
                                <textarea value={f.problem} onChange={e => setF({ ...f, problem: e.target.value })} rows={2} placeholder="Напр. треснула дужка, заменить шарнир" className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-gray-400 uppercase">Клиент</label>
                                    <input value={f.clientName} onChange={e => setF({ ...f, clientName: e.target.value })} className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-400 uppercase">Телефон</label>
                                    <input value={f.clientPhone} onChange={e => setF({ ...f, clientPhone: e.target.value })} className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-400 uppercase">Стоимость, ₸</label>
                                    <input type="number" min={0} value={f.price} onChange={e => setF({ ...f, price: e.target.value })} className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-400 uppercase">Мастер</label>
                                    <input value={f.masterName} onChange={e => setF({ ...f, masterName: e.target.value })} className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
                                </div>
                            </div>
                        </div>
                        <div className="p-5 border-t border-gray-100 flex items-center justify-end sticky bottom-0 bg-white">
                            <button onClick={submit} disabled={saving || !f.itemDescription.trim()} className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Принять</button>
                        </div>
                    </div>
                </div>
            )}

            {toast && <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${toast.ok ? 'bg-emerald-600' : 'bg-red-600'}`}>{toast.text}</div>}
        </div>
    );
}
