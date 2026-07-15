'use client';

import { useState, useEffect } from 'react';
import QuickNav from '@/components/ui/QuickNav';
import { ArrowLeftRight, Plus, X, Check, Send, PackageCheck, Loader2, Trash2, Ban, ArrowRight } from 'lucide-react';

interface Item { productId: string | null; name: string; sku?: string | null; qty: number; }
interface Transfer { id: string; number: string; status: string; fromName?: string; toName?: string; direction?: string; items: Item[]; totalQty: number; createdAt: string; }
interface Product { id: string; name: string; sku?: string; currentStock?: number; category: string; }
interface Branch { id: string; name: string; }

const STATUS: Record<string, { label: string; cls: string }> = {
    draft: { label: 'Черновик', cls: 'bg-gray-100 text-gray-600' },
    sent: { label: 'В пути', cls: 'bg-amber-100 text-amber-700' },
    received: { label: 'Получен', cls: 'bg-emerald-100 text-emerald-700' },
    cancelled: { label: 'Отменён', cls: 'bg-red-100 text-red-600' },
};

export default function TransfersPage() {
    const [transfers, setTransfers] = useState<Transfer[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [toOrgId, setToOrgId] = useState('');
    const [notes, setNotes] = useState('');
    const [cart, setCart] = useState<Item[]>([]);
    const [pick, setPick] = useState('');
    const [saving, setSaving] = useState(false);
    const [busy, setBusy] = useState<string | null>(null);
    const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

    const load = () => {
        setLoading(true);
        Promise.all([
            fetch('/api/optic/transfers').then(r => (r.ok ? r.json() : [])),
            fetch('/api/branches').then(r => (r.ok ? r.json() : { branches: [] })).catch(() => ({ branches: [] })),
            fetch('/api/optic/products').then(r => (r.ok ? r.json() : [])),
        ]).then(([t, b, p]) => {
            setTransfers(Array.isArray(t) ? t : []);
            setBranches(b?.branches || []);
            setProducts(Array.isArray(p) ? p : []);
        }).finally(() => setLoading(false));
    };
    useEffect(load, []);

    const flash = (ok: boolean, text: string) => { setToast({ ok, text }); setTimeout(() => setToast(null), 3000); };
    const addItem = () => { const p = products.find(x => x.id === pick); if (!p || cart.some(c => c.productId === p.id)) return; setCart([...cart, { productId: p.id, name: p.name, sku: p.sku, qty: 1 }]); setPick(''); };
    const totalQty = cart.reduce((s, i) => s + i.qty, 0);

    const submit = async () => {
        if (!toOrgId || cart.length === 0) return;
        setSaving(true);
        const res = await fetch('/api/optic/transfers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ toOrgId, notes, items: cart }) });
        if (res.ok) { setShowForm(false); setCart([]); setToOrgId(''); setNotes(''); flash(true, 'Трансфер создан'); load(); }
        else { const d = await res.json().catch(() => ({})); flash(false, d.error || 'Ошибка'); }
        setSaving(false);
    };

    const act = async (id: string, action: string) => {
        setBusy(id);
        const res = await fetch(`/api/optic/transfers/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
        if (res.ok) { flash(true, action === 'send' ? 'Отправлен (списано у источника)' : action === 'receive' ? 'Получен (добавлено назначению)' : 'Готово'); load(); }
        else { const d = await res.json().catch(() => ({})); flash(false, d.error || 'Ошибка'); }
        setBusy(null);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <QuickNav />
            <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-sm"><ArrowLeftRight className="w-6 h-6 text-white" /></div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Трансферы</h1>
                            <p className="text-sm text-gray-500">Перемещение товара между филиалами</p>
                        </div>
                    </div>
                    <button onClick={() => setShowForm(true)} disabled={branches.length === 0} title={branches.length === 0 ? 'Нет филиалов' : ''} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50"><Plus className="w-4 h-4" /> Новый трансфер</button>
                </div>

                {branches.length === 0 && !loading && (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-800 mb-4">Нет филиалов для перемещения — создайте филиал в разделе «Филиалы».</div>
                )}

                {loading ? (
                    <div className="text-center py-16"><Loader2 className="w-7 h-7 animate-spin text-gray-300 mx-auto" /></div>
                ) : transfers.length === 0 ? (
                    <div className="text-center py-16 text-gray-400"><ArrowLeftRight className="w-12 h-12 mx-auto mb-3 text-gray-300" /><p className="text-gray-500">Трансферов пока нет</p></div>
                ) : (
                    <div className="grid gap-3">
                        {transfers.map(t => (
                            <div key={t.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-gray-900">{t.number}</span>
                                        <span className={`badge ${STATUS[t.status]?.cls || 'bg-gray-100 text-gray-600'}`}>{STATUS[t.status]?.label || t.status}</span>
                                        {t.direction === 'in' && <span className="badge bg-blue-50 text-blue-600">входящий</span>}
                                    </div>
                                    <span className="text-sm text-gray-500">{t.totalQty} шт</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-sm text-gray-700 mt-1.5 flex-wrap">
                                    <span className="font-medium">{t.fromName || '—'}</span>
                                    <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                                    <span className="font-medium">{t.toName || '—'}</span>
                                    <span className="text-xs text-gray-400 ml-2">{new Date(t.createdAt).toLocaleDateString('ru-RU')}</span>
                                </div>
                                <div className="mt-2 text-sm text-gray-600 flex flex-wrap gap-x-3 gap-y-0.5">
                                    {(t.items || []).slice(0, 4).map((it, i) => (<span key={i}>{it.name} ×{it.qty}</span>))}
                                    {(t.items || []).length > 4 && <span className="text-gray-400">+{t.items.length - 4}</span>}
                                </div>
                                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50">
                                    {t.status === 'draft' && t.direction === 'out' && <button disabled={busy === t.id} onClick={() => act(t.id, 'send')} className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 disabled:opacity-50"><Send className="w-3.5 h-3.5" /> Отправить</button>}
                                    {t.status === 'sent' && <button disabled={busy === t.id} onClick={() => act(t.id, 'receive')} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 disabled:opacity-50"><PackageCheck className="w-3.5 h-3.5" /> Получить</button>}
                                    {t.status === 'received' && <span className="text-xs text-emerald-600 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Завершён</span>}
                                    {t.status === 'draft' && t.direction === 'out' && <button disabled={busy === t.id} onClick={() => act(t.id, 'cancel')} className="text-xs font-medium text-red-500 hover:text-red-600 flex items-center gap-1 disabled:opacity-50 ml-auto"><Ban className="w-3.5 h-3.5" /> Отменить</button>}
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
                            <h2 className="text-lg font-bold text-gray-900">Новый трансфер</h2>
                            <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-gray-400 uppercase">Куда (филиал)</label>
                                <select value={toOrgId} onChange={e => setToOrgId(e.target.value)} className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm">
                                    <option value="">— выбрать филиал —</option>
                                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-400 uppercase">Позиции</label>
                                <div className="flex gap-2 mt-1">
                                    <select value={pick} onChange={e => setPick(e.target.value)} className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm min-w-0">
                                        <option value="">— выбрать товар —</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.name}{p.currentStock != null ? ` (ост. ${p.currentStock})` : ''}</option>)}
                                    </select>
                                    <button onClick={addItem} disabled={!pick} className="px-3 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-medium disabled:opacity-50">Добавить</button>
                                </div>
                                {cart.length > 0 && (
                                    <div className="mt-2 space-y-2">
                                        {cart.map((it, i) => (
                                            <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl p-2">
                                                <span className="flex-1 text-sm text-gray-800 truncate">{it.name}</span>
                                                <input type="number" min={1} value={it.qty} onChange={e => setCart(cart.map((c, j) => j === i ? { ...c, qty: Number(e.target.value) || 0 } : c))} className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-sm text-center" />
                                                <button onClick={() => setCart(cart.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4 text-gray-400" /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-400 uppercase">Комментарий</label>
                                <input value={notes} onChange={e => setNotes(e.target.value)} className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
                            </div>
                        </div>
                        <div className="p-5 border-t border-gray-100 flex items-center justify-between sticky bottom-0 bg-white">
                            <span className="font-bold text-gray-900">Всего: {totalQty} шт</span>
                            <button onClick={submit} disabled={saving || cart.length === 0 || !toOrgId} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Создать</button>
                        </div>
                    </div>
                </div>
            )}

            {toast && <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${toast.ok ? 'bg-emerald-600' : 'bg-red-600'}`}>{toast.text}</div>}
        </div>
    );
}
