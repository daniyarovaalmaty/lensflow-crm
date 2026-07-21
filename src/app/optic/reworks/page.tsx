'use client';

import { useState, useEffect, useCallback } from 'react';
import QuickNav from '@/components/ui/QuickNav';
import { AlertTriangle, Plus, X, Check, Loader2, Trash2, RotateCcw, Users } from 'lucide-react';

interface Rework {
    id: string;
    orderNumber?: string | null;
    description: string;
    responsibleType: string;
    responsibleName?: string | null;
    cost: number;
    status: string;
    createdByName?: string | null;
    createdAt: string;
}
interface Colleague { id: string; fullName: string; }

const TYPE: Record<string, { label: string; cls: string }> = {
    master: { label: 'Ошибка мастера', cls: 'bg-orange-100 text-orange-700' },
    diagnosis: { label: 'Ошибка диагностики', cls: 'bg-purple-100 text-purple-700' },
    seller: { label: 'Ошибка продавца', cls: 'bg-blue-100 text-blue-700' },
    other: { label: 'Прочее', cls: 'bg-gray-100 text-gray-600' },
};
const FILTERS: [string, string][] = [['all', 'Все'], ['open', 'Открытые'], ['resolved', 'Решённые']];

export default function ReworksPage() {
    const [items, setItems] = useState<Rework[]>([]);
    const [users, setUsers] = useState<Colleague[]>([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

    const [showForm, setShowForm] = useState(false);
    const [f, setF] = useState({ orderNumber: '', description: '', responsibleType: 'master', responsibleName: '', cost: '' });
    const [saving, setSaving] = useState(false);

    const flash = (ok: boolean, text: string) => { setToast({ ok, text }); setTimeout(() => setToast(null), 3000); };

    const load = useCallback(() => {
        setLoading(true);
        fetch('/api/optic/reworks').then(r => (r.ok ? r.json() : [])).then(d => setItems(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
    }, []);
    useEffect(() => { load(); }, [load]);
    useEffect(() => { fetch('/api/optic/users').then(r => (r.ok ? r.json() : [])).then(d => setUsers(Array.isArray(d) ? d : [])); }, []);

    const submit = async () => {
        if (!f.description.trim()) return;
        setSaving(true);
        const res = await fetch('/api/optic/reworks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
        if (res.ok) { setShowForm(false); setF({ orderNumber: '', description: '', responsibleType: 'master', responsibleName: '', cost: '' }); flash(true, 'Записано'); load(); }
        else { const e = await res.json().catch(() => ({})); flash(false, e.error || 'Ошибка'); }
        setSaving(false);
    };
    const patch = async (id: string, payload: any, msg: string) => {
        setBusy(id);
        const res = await fetch('/api/optic/reworks', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...payload }) });
        if (res.ok) { flash(true, msg); load(); } else { const e = await res.json().catch(() => ({})); flash(false, e.error || 'Ошибка'); }
        setBusy(null);
    };
    const remove = async (id: string) => {
        setBusy(id);
        const res = await fetch(`/api/optic/reworks?id=${id}`, { method: 'DELETE' });
        if (res.ok) { flash(true, 'Удалено'); load(); } else { const e = await res.json().catch(() => ({})); flash(false, e.error || 'Ошибка'); }
        setBusy(null);
    };

    const shown = filter === 'all' ? items : items.filter(i => i.status === filter);

    // Per-employee error accounting (aggregate over ALL items).
    const byEmployee = (() => {
        const m = new Map<string, { count: number; cost: number; open: number }>();
        for (const i of items) {
            const k = i.responsibleName || '— не указан —';
            const e = m.get(k) || { count: 0, cost: 0, open: 0 };
            e.count++; e.cost += i.cost || 0; if (i.status === 'open') e.open++;
            m.set(k, e);
        }
        return [...m.entries()].sort((a, b) => b[1].count - a[1].count);
    })();

    return (
        <div className="min-h-screen bg-gray-50">
            <QuickNav />
            <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-sm"><AlertTriangle className="w-6 h-6 text-white" /></div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Переделки и брак</h1>
                            <p className="text-sm text-gray-500">Учёт переделок по заказам и ошибок по сотрудникам</p>
                        </div>
                    </div>
                    <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-semibold"><Plus className="w-4 h-4" /> Записать переделку</button>
                </div>

                {/* Per-employee summary */}
                {byEmployee.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-5">
                        <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-3"><Users className="w-4 h-4 text-gray-400" /> По сотрудникам</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {byEmployee.map(([name, s]) => (
                                <div key={name} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                                    <span className="text-sm font-medium text-gray-800 truncate">{name}</span>
                                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">{s.count} шт{s.open > 0 ? ` · ${s.open} откр.` : ''}{s.cost > 0 ? ` · ${s.cost.toLocaleString('ru-RU')} ₸` : ''}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Filter chips */}
                <div className="flex items-center gap-1.5 mb-5 flex-wrap">
                    {FILTERS.map(([k, label]) => {
                        const n = k === 'all' ? items.length : items.filter(i => i.status === k).length;
                        return <button key={k} onClick={() => setFilter(k)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === k ? 'bg-orange-600 text-white' : 'bg-white border border-gray-100 text-gray-600 hover:bg-gray-50'}`}>{label} {n > 0 && <span className={filter === k ? 'opacity-80' : 'text-gray-400'}>{n}</span>}</button>;
                    })}
                </div>

                {loading ? (
                    <div className="text-center py-16"><Loader2 className="w-7 h-7 animate-spin text-gray-300 mx-auto" /></div>
                ) : shown.length === 0 ? (
                    <div className="text-center py-16 text-gray-400"><AlertTriangle className="w-12 h-12 mx-auto mb-3 text-gray-300" /><p className="text-gray-500">Записей нет</p></div>
                ) : (
                    <div className="grid gap-3">
                        {shown.map(r => (
                            <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`badge ${TYPE[r.responsibleType]?.cls || TYPE.other.cls}`}>{TYPE[r.responsibleType]?.label || r.responsibleType}</span>
                                            {r.orderNumber && <span className="text-sm font-semibold text-gray-700">{r.orderNumber}</span>}
                                            {r.status === 'resolved' ? <span className="badge bg-emerald-100 text-emerald-700">Решён</span> : <span className="badge bg-amber-100 text-amber-700">Открыт</span>}
                                            {r.cost > 0 && <span className="text-sm text-gray-500">{r.cost.toLocaleString('ru-RU')} ₸</span>}
                                        </div>
                                        <p className="text-sm text-gray-800 mt-1.5 whitespace-pre-line">{r.description}</p>
                                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-2 flex-wrap">
                                            {r.responsibleName && <span>ответственный: <span className="text-gray-600 font-medium">{r.responsibleName}</span></span>}
                                            {r.createdByName && <span>записал: {r.createdByName}</span>}
                                            <span>{new Date(r.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => remove(r.id)} disabled={busy === r.id} className="text-gray-300 hover:text-red-500 flex-shrink-0" title="Удалить"><Trash2 className="w-4 h-4" /></button>
                                </div>
                                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50">
                                    {r.status === 'open'
                                        ? <button disabled={busy === r.id} onClick={() => patch(r.id, { status: 'resolved' }, 'Отмечено решённым')} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 disabled:opacity-50"><Check className="w-3.5 h-3.5" /> Решено</button>
                                        : <button disabled={busy === r.id} onClick={() => patch(r.id, { status: 'open' }, 'Возвращено в открытые')} className="text-xs font-medium text-gray-500 hover:text-gray-700 flex items-center gap-1 disabled:opacity-50"><RotateCcw className="w-3.5 h-3.5" /> Вернуть</button>}
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
                            <h2 className="text-lg font-bold text-gray-900">Переделка / брак</h2>
                            <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-gray-400 uppercase">Заказ</label>
                                    <input value={f.orderNumber} onChange={e => setF({ ...f, orderNumber: e.target.value })} placeholder="Напр. ITG-1000000180" className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-400 uppercase">Стоимость, ₸</label>
                                    <input type="number" min={0} value={f.cost} onChange={e => setF({ ...f, cost: e.target.value })} className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-400 uppercase">Что переделываем / в чём брак *</label>
                                <textarea value={f.description} onChange={e => setF({ ...f, description: e.target.value })} autoFocus rows={3} className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-gray-400 uppercase">Причина</label>
                                    <select value={f.responsibleType} onChange={e => setF({ ...f, responsibleType: e.target.value })} className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm">
                                        <option value="master">Ошибка мастера</option>
                                        <option value="diagnosis">Ошибка диагностики</option>
                                        <option value="seller">Ошибка продавца</option>
                                        <option value="other">Прочее</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-400 uppercase">Ответственный</label>
                                    <input list="rework-users" value={f.responsibleName} onChange={e => setF({ ...f, responsibleName: e.target.value })} className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
                                    <datalist id="rework-users">{users.map(u => <option key={u.id} value={u.fullName} />)}</datalist>
                                </div>
                            </div>
                        </div>
                        <div className="p-5 border-t border-gray-100 flex items-center justify-end sticky bottom-0 bg-white">
                            <button onClick={submit} disabled={saving || !f.description.trim()} className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Записать</button>
                        </div>
                    </div>
                </div>
            )}

            {toast && <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${toast.ok ? 'bg-emerald-600' : 'bg-red-600'}`}>{toast.text}</div>}
        </div>
    );
}
