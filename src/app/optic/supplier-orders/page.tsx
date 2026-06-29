'use client';

import { useState, useEffect } from 'react';
import QuickNav from '@/components/ui/QuickNav';
import { Truck, Plus, X, Check, Send, PackageCheck, Loader2, Trash2, Ban } from 'lucide-react';

interface Item { productId: string | null; name: string; sku?: string | null; qty: number; price: number; receivedQty?: number; }
interface SupplierOrder { id: string; number: string; status: string; supplierName?: string; items: Item[]; totalAmount: number; createdAt: string; }
interface Product { id: string; name: string; sku?: string; retailPrice: number; purchasePrice?: number; category: string; }

const STATUS: Record<string, { label: string; cls: string }> = {
    draft: { label: 'Черновик', cls: 'bg-gray-100 text-gray-600' },
    sent: { label: 'Отправлен', cls: 'bg-blue-100 text-blue-700' },
    received: { label: 'Получен', cls: 'bg-emerald-100 text-emerald-700' },
    cancelled: { label: 'Отменён', cls: 'bg-red-100 text-red-600' },
};

export default function SupplierOrdersPage() {
    const [orders, setOrders] = useState<SupplierOrder[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [supplierName, setSupplierName] = useState('');
    const [notes, setNotes] = useState('');
    const [cart, setCart] = useState<Item[]>([]);
    const [pick, setPick] = useState('');
    const [saving, setSaving] = useState(false);
    const [busy, setBusy] = useState<string | null>(null);
    const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

    const load = () => {
        setLoading(true);
        Promise.all([
            fetch('/api/optic/supplier-orders').then(r => (r.ok ? r.json() : [])),
            fetch('/api/optic/products').then(r => (r.ok ? r.json() : [])),
        ]).then(([o, p]) => {
            setOrders(Array.isArray(o) ? o : []);
            setProducts(Array.isArray(p) ? p : []);
        }).finally(() => setLoading(false));
    };
    useEffect(load, []);

    const flash = (ok: boolean, text: string) => { setToast({ ok, text }); setTimeout(() => setToast(null), 3000); };

    const addItem = () => {
        const p = products.find(x => x.id === pick);
        if (!p || cart.some(c => c.productId === p.id)) return;
        setCart([...cart, { productId: p.id, name: p.name, sku: p.sku, qty: 1, price: p.purchasePrice || 0 }]);
        setPick('');
    };
    const total = cart.reduce((s, i) => s + i.qty * i.price, 0);

    const submit = async () => {
        if (cart.length === 0) return;
        setSaving(true);
        const res = await fetch('/api/optic/supplier-orders', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ supplierName, notes, items: cart }),
        });
        if (res.ok) { setShowForm(false); setCart([]); setSupplierName(''); setNotes(''); flash(true, 'Заказ создан'); load(); }
        else { const d = await res.json().catch(() => ({})); flash(false, d.error || 'Ошибка'); }
        setSaving(false);
    };

    const act = async (id: string, action: string) => {
        setBusy(id);
        const res = await fetch(`/api/optic/supplier-orders/${id}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
        });
        if (res.ok) { const d = await res.json(); flash(true, action === 'receive' ? `Принято на склад (${d.receiptDoc || 'приход'})` : 'Готово'); load(); }
        else { const d = await res.json().catch(() => ({})); flash(false, d.error || 'Ошибка'); }
        setBusy(null);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <QuickNav />
            <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm"><Truck className="w-6 h-6 text-white" /></div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Заказы поставщикам</h1>
                            <p className="text-sm text-gray-500">Закупка товара — при получении добавляется на склад</p>
                        </div>
                    </div>
                    <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold"><Plus className="w-4 h-4" /> Новый заказ</button>
                </div>

                {loading ? (
                    <div className="text-center py-16"><Loader2 className="w-7 h-7 animate-spin text-gray-300 mx-auto" /></div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-16 text-gray-400"><Truck className="w-12 h-12 mx-auto mb-3 text-gray-300" /><p className="text-gray-500">Заказов поставщикам пока нет</p></div>
                ) : (
                    <div className="grid gap-3">
                        {orders.map(o => (
                            <div key={o.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-gray-900">{o.number}</span>
                                        <span className={`badge ${STATUS[o.status]?.cls || 'bg-gray-100 text-gray-600'}`}>{STATUS[o.status]?.label || o.status}</span>
                                        {o.supplierName && <span className="text-sm text-gray-500">· {o.supplierName}</span>}
                                    </div>
                                    <span className="font-semibold text-gray-900">{(o.totalAmount || 0).toLocaleString('ru-RU')} ₸</span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">{o.items?.length || 0} поз. · {new Date(o.createdAt).toLocaleDateString('ru-RU')}</div>
                                <div className="mt-2 text-sm text-gray-600 flex flex-wrap gap-x-3 gap-y-0.5">
                                    {(o.items || []).slice(0, 4).map((it, i) => (<span key={i}>{it.name} ×{it.qty}</span>))}
                                    {(o.items || []).length > 4 && <span className="text-gray-400">+{o.items.length - 4}</span>}
                                </div>
                                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50">
                                    {o.status === 'draft' && <button disabled={busy === o.id} onClick={() => act(o.id, 'send')} className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 disabled:opacity-50"><Send className="w-3.5 h-3.5" /> Отправить</button>}
                                    {(o.status === 'draft' || o.status === 'sent') && <button disabled={busy === o.id} onClick={() => act(o.id, 'receive')} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 disabled:opacity-50"><PackageCheck className="w-3.5 h-3.5" /> Получить (на склад)</button>}
                                    {o.status === 'received' && <span className="text-xs text-emerald-600 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Оприходован</span>}
                                    {o.status !== 'received' && o.status !== 'cancelled' && <button disabled={busy === o.id} onClick={() => act(o.id, 'cancel')} className="text-xs font-medium text-red-500 hover:text-red-600 flex items-center gap-1 disabled:opacity-50 ml-auto"><Ban className="w-3.5 h-3.5" /> Отменить</button>}
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
                            <h2 className="text-lg font-bold text-gray-900">Новый заказ поставщику</h2>
                            <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-gray-400 uppercase">Поставщик</label>
                                <input value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="Название поставщика" className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-400 uppercase">Позиции</label>
                                <div className="flex gap-2 mt-1">
                                    <select value={pick} onChange={e => setPick(e.target.value)} className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm min-w-0">
                                        <option value="">— выбрать товар из каталога —</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    <button onClick={addItem} disabled={!pick} className="px-3 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-medium disabled:opacity-50">Добавить</button>
                                </div>
                                {products.length === 0 && <p className="text-xs text-amber-600 mt-1">Каталог пуст — сначала добавьте товары.</p>}
                                {cart.length > 0 && (
                                    <div className="mt-2 space-y-2">
                                        {cart.map((it, i) => (
                                            <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl p-2">
                                                <span className="flex-1 text-sm text-gray-800 truncate">{it.name}</span>
                                                <input type="number" min={1} value={it.qty} onChange={e => setCart(cart.map((c, j) => j === i ? { ...c, qty: Number(e.target.value) || 0 } : c))} className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-sm text-center" />
                                                <input type="number" min={0} value={it.price} onChange={e => setCart(cart.map((c, j) => j === i ? { ...c, price: Number(e.target.value) || 0 } : c))} className="w-24 px-2 py-1 border border-gray-200 rounded-lg text-sm text-right" placeholder="цена" />
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
                            <span className="font-bold text-gray-900">Итого: {total.toLocaleString('ru-RU')} ₸</span>
                            <button onClick={submit} disabled={saving || cart.length === 0} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Создать заказ</button>
                        </div>
                    </div>
                </div>
            )}

            {toast && <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${toast.ok ? 'bg-emerald-600' : 'bg-red-600'}`}>{toast.text}</div>}
        </div>
    );
}
