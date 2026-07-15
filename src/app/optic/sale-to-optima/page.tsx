'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import QuickNav from '@/components/ui/QuickNav';
import { Send, Loader2, Check, Plus, Trash2, Package, AlertTriangle, Building2 } from 'lucide-react';

interface Dept { id: number | string; name: string; }
interface Product { id: string; name: string; category: string; barcode?: string | null; sku?: string | null; }
interface CartItem { productId: string; name: string; product: string; barcode: string; }

// our OpticProduct.category → Itigris remoteSale `product` type
const CAT_MAP: Record<string, string> = {
    frame: 'glasses', sun_glasses: 'sunglasses', contact_lens: 'contactlenses',
    spectacle_lens: 'lenses', solution: 'accessories', accessory: 'accessories',
};

export default function SaleToOptimaPage() {
    const [notConfigured, setNotConfigured] = useState(false);
    const [loading, setLoading] = useState(true);
    const [depts, setDepts] = useState<Dept[]>([]);
    const [products, setProducts] = useState<Product[]>([]);

    const [departmentId, setDepartmentId] = useState('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [pick, setPick] = useState('');
    const [clientId, setClientId] = useState('');
    const [clientInfo, setClientInfo] = useState('');
    const [paidSum, setPaidSum] = useState('');
    const [paymentType, setPaymentType] = useState('CASH');
    const [receiveType, setReceiveType] = useState('STORE');

    const [sending, setSending] = useState(false);
    const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
    const flash = (ok: boolean, text: string) => { setToast({ ok, text }); setTimeout(() => setToast(null), 4000); };

    useEffect(() => {
        Promise.all([
            fetch('/api/optic/itigris-sale?action=departments').then(r => r.json()),
            fetch('/api/optic/products').then(r => (r.ok ? r.json() : [])),
        ]).then(([d, p]) => {
            if (d?.notConfigured) { setNotConfigured(true); return; }
            setDepts(Array.isArray(d.items) ? d.items : []);
            setProducts(Array.isArray(p) ? p : []);
        }).catch(() => {}).finally(() => setLoading(false));
    }, []);

    // only products that map to an Itigris goods type AND have a barcode
    const eligible = products.filter(p => CAT_MAP[p.category] && (p.barcode || p.sku));

    const addItem = () => {
        const p = eligible.find(x => x.id === pick);
        if (!p || cart.some(c => c.productId === p.id)) return;
        setCart([...cart, { productId: p.id, name: p.name, product: CAT_MAP[p.category], barcode: p.barcode || p.sku || '' }]);
        setPick('');
    };

    const submit = async () => {
        if (cart.length === 0 || (!clientId && !clientInfo.trim())) return;
        setSending(true);
        try {
            const res = await fetch('/api/optic/itigris-sale', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    departmentId: departmentId || undefined,
                    goods: cart.map(c => ({ product: c.product, barcode: c.barcode })),
                    clientId: clientId || undefined,
                    clientInfo: clientInfo.trim() || undefined,
                    paidSum: paidSum ? Number(paidSum) : undefined,
                    paymentType, receiveType,
                }),
            });
            const d = await res.json();
            if (res.ok && d.ok) { flash(true, 'Заказ отправлен в Оптиму'); setCart([]); setClientId(''); setClientInfo(''); setPaidSum(''); }
            else flash(false, d.error || `Не отправлено${d.result ? ': ' + d.result : ''}`);
        } catch { flash(false, 'Ошибка отправки'); }
        setSending(false);
    };

    const inputCls = 'w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm';

    return (
        <div className="min-h-screen bg-gray-50">
            <QuickNav />
            <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-sm"><Send className="w-6 h-6 text-white" /></div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Заказ в Оптиму</h1>
                        <p className="text-sm text-gray-500">Отправка задания на заказ в магазин Оптимы (Itigris)</p>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-16"><Loader2 className="w-7 h-7 animate-spin text-gray-300 mx-auto" /></div>
                ) : notConfigured ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
                        <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-amber-400" />
                        <p className="font-semibold text-amber-800">Нужен RemoteAPI-ключ</p>
                        <p className="text-sm text-amber-700 mt-1">Отправка заказов в Оптиму работает через RemoteAPI. Добавьте ключ в настройках интеграции.</p>
                        <Link href="/clinic-manager/itigris" className="inline-block mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold">Настройки ITIGRIS →</Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
                            <div>
                                <label className="text-xs font-semibold text-gray-400 uppercase flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> Магазин Оптимы</label>
                                <select value={departmentId} onChange={e => setDepartmentId(e.target.value)} className={inputCls}>
                                    <option value="">— по умолчанию —</option>
                                    {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-400 uppercase flex items-center gap-1"><Package className="w-3.5 h-3.5" /> Товары (со штрих-кодом)</label>
                                <div className="flex gap-2 mt-1">
                                    <select value={pick} onChange={e => setPick(e.target.value)} className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm min-w-0">
                                        <option value="">— выбрать товар —</option>
                                        {eligible.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    <button onClick={addItem} disabled={!pick} className="px-3 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-medium disabled:opacity-50 flex items-center gap-1"><Plus className="w-4 h-4" /></button>
                                </div>
                                {eligible.length === 0 && <p className="text-xs text-gray-400 mt-1">Нет товаров со штрих-кодом — заполните каталог.</p>}
                                {cart.length > 0 && (
                                    <div className="mt-2 space-y-2">
                                        {cart.map((it, i) => (
                                            <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl p-2">
                                                <span className="flex-1 text-sm text-gray-800 truncate">{it.name} <span className="text-gray-400">· {it.barcode}</span></span>
                                                <button onClick={() => setCart(cart.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4 text-gray-400" /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
                            <label className="text-xs font-semibold text-gray-400 uppercase">Клиент</label>
                            <div className="grid grid-cols-2 gap-3">
                                <input value={clientId} onChange={e => setClientId(e.target.value)} placeholder="ID клиента (Itigris)" className={inputCls + ' mt-0'} />
                                <input value={clientInfo} onChange={e => setClientInfo(e.target.value)} placeholder="или текст (имя/тел)" className={inputCls + ' mt-0'} />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-gray-400 uppercase">Оплачено, ₸</label>
                                    <input type="number" min={0} value={paidSum} onChange={e => setPaidSum(e.target.value)} className={inputCls} />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-400 uppercase">Оплата</label>
                                    <select value={paymentType} onChange={e => setPaymentType(e.target.value)} className={inputCls}>
                                        <option value="CASH">Наличные</option>
                                        <option value="CARD">Карта</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-400 uppercase">Получение</label>
                                    <select value={receiveType} onChange={e => setReceiveType(e.target.value)} className={inputCls}>
                                        <option value="STORE">В магазине</option>
                                        <option value="DELIVERY">Доставка</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <button onClick={submit} disabled={sending || cart.length === 0 || (!clientId && !clientInfo.trim())} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Отправить заказ в Оптиму
                        </button>
                    </div>
                )}
            </main>

            {toast && <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${toast.ok ? 'bg-emerald-600' : 'bg-red-600'}`}>{toast.text}</div>}
        </div>
    );
}
