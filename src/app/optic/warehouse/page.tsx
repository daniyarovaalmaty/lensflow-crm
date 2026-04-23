'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Package, Plus, Search, X, ArrowDownToLine, ArrowUpFromLine,
    FileText, Clock, AlertTriangle, Trash2, BarChart3,
    ChevronDown, Glasses, Eye, Droplets, ShoppingBag, Wrench, Hash
} from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

// ==================== Types ====================
interface Product {
    id: string; name: string; category: string; brand: string | null;
    sku: string | null; currentStock: number; minStock: number; unit: string;
    purchasePrice: number; retailPrice: number; trackSerials: boolean;
    _count?: { stockItems: number };
}

interface StockItem {
    id: string; serialNumber: string | null; status: string; color: string | null;
    size: string | null; batchNumber: string | null; purchasePrice: number | null;
    receivedAt: string; soldAt: string | null; notes: string | null;
    product: { name: string; category: string; sku: string | null };
}

interface Movement {
    id: string; type: string; quantity: number; serialNumbers: string[] | null;
    documentNumber: string | null; supplier: string | null; customerName: string | null;
    reason: string | null; performedByName: string | null; createdAt: string;
    product: { name: string; category: string };
}

interface StockDoc {
    id: string; documentNumber: string; type: string; status: string;
    counterpartyName: string | null; totalAmount: number; items: any[];
    performedByName: string | null; confirmedAt: string | null; createdAt: string;
    notes: string | null;
}

// ==================== Constants ====================
const MOVEMENT_TYPES: Record<string, { label: string; color: string; icon: string }> = {
    receipt: { label: 'Приход', color: 'text-green-700 bg-green-50', icon: '📥' },
    sale: { label: 'Продажа', color: 'text-blue-700 bg-blue-50', icon: '💰' },
    write_off: { label: 'Списание', color: 'text-red-700 bg-red-50', icon: '🗑' },
    return_in: { label: 'Возврат (от покупателя)', color: 'text-amber-700 bg-amber-50', icon: '↩️' },
    return_out: { label: 'Возврат поставщику', color: 'text-orange-700 bg-orange-50', icon: '📤' },
    adjustment: { label: 'Корректировка', color: 'text-purple-700 bg-purple-50', icon: '🔧' },
};

const DOC_TYPES: Record<string, string> = {
    receipt: 'Приходная накладная',
    write_off: 'Акт списания',
    return_out: 'Акт возврата',
    adjustment: 'Акт инвентаризации',
};

const fmt = (n: number) => n.toLocaleString('ru-RU');

type Tab = 'stock' | 'receive' | 'movements' | 'documents';

export default function WarehousePage() {
    const { data: session } = useSession();
    const [tab, setTab] = useState<Tab>('stock');
    const [products, setProducts] = useState<Product[]>([]);
    const [movements, setMovements] = useState<Movement[]>([]);
    const [documents, setDocuments] = useState<StockDoc[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Receive form
    const [receiveItems, setReceiveItems] = useState<Array<{
        productId: string; quantity: string; serialMode: 'auto' | 'manual';
        manualSerials: string; purchasePrice: string; color: string; size: string;
    }>>([]);
    const [supplier, setSupplier] = useState('');
    const [receiveNotes, setReceiveNotes] = useState('');
    const [saving, setSaving] = useState(false);

    // Write-off modal
    const [showWriteOff, setShowWriteOff] = useState(false);
    const [woProduct, setWoProduct] = useState('');
    const [woQty, setWoQty] = useState('1');
    const [woReason, setWoReason] = useState('');

    useEffect(() => { loadData(); }, [tab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (tab === 'stock' || tab === 'receive') {
                const res = await fetch('/api/optic/stock');
                if (res.ok) setProducts(await res.json());
            }
            if (tab === 'movements') {
                const res = await fetch('/api/optic/stock?view=movements');
                if (res.ok) setMovements(await res.json());
            }
            if (tab === 'documents') {
                const res = await fetch('/api/optic/stock?view=documents');
                if (res.ok) setDocuments(await res.json());
            }
        } finally { setLoading(false); }
    };

    // ---- Stats ----
    const stats = useMemo(() => {
        const total = products.reduce((s, p) => s + (p._count?.stockItems ?? p.currentStock), 0);
        const value = products.reduce((s, p) => s + (p._count?.stockItems ?? p.currentStock) * p.retailPrice, 0);
        const low = products.filter(p => p.minStock > 0 && (p._count?.stockItems ?? p.currentStock) <= p.minStock).length;
        return { total, value, low, categories: products.length };
    }, [products]);

    // ---- Receive helpers ----
    const addReceiveItem = () => {
        setReceiveItems([...receiveItems, {
            productId: products[0]?.id || '', quantity: '1', serialMode: 'auto',
            manualSerials: '', purchasePrice: '', color: '', size: '',
        }]);
    };

    const updateReceiveItem = (idx: number, field: string, value: any) => {
        const updated = [...receiveItems];
        (updated[idx] as any)[field] = value;
        setReceiveItems(updated);
    };

    const removeReceiveItem = (idx: number) => {
        setReceiveItems(receiveItems.filter((_, i) => i !== idx));
    };

    const handleReceive = async () => {
        if (!receiveItems.length) return;
        setSaving(true);
        try {
            const items = receiveItems.map(ri => ({
                productId: ri.productId,
                quantity: Number(ri.quantity) || 1,
                serialNumbers: ri.serialMode === 'manual' && ri.manualSerials
                    ? ri.manualSerials.split('\n').map(s => s.trim()).filter(Boolean)
                    : undefined,
                purchasePrice: ri.purchasePrice ? Number(ri.purchasePrice) : undefined,
                color: ri.color || undefined,
                size: ri.size || undefined,
            }));

            const res = await fetch('/api/optic/stock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'receive', items, supplier, notes: receiveNotes }),
            });

            if (res.ok) {
                const result = await res.json();
                alert(`✅ Приход оформлен: ${result.document.documentNumber}\n${result.serialNumbers?.length ? `Серийные номера: ${result.serialNumbers.join(', ')}` : ''}`);
                setReceiveItems([]);
                setSupplier('');
                setReceiveNotes('');
                setTab('stock');
                loadData();
            }
        } finally { setSaving(false); }
    };

    const handleWriteOff = async () => {
        if (!woProduct) return;
        setSaving(true);
        try {
            const res = await fetch('/api/optic/stock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'write_off',
                    items: [{ productId: woProduct, quantity: Number(woQty) || 1 }],
                    reason: woReason,
                }),
            });
            if (res.ok) {
                alert('✅ Списание оформлено');
                setShowWriteOff(false);
                setWoProduct(''); setWoQty('1'); setWoReason('');
                loadData();
            }
        } finally { setSaving(false); }
    };

    const filteredProducts = useMemo(() => {
        if (!search) return products;
        const s = search.toLowerCase();
        return products.filter(p => p.name.toLowerCase().includes(s) || p.sku?.toLowerCase().includes(s));
    }, [products, search]);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Склад</h1>
                            <p className="text-sm text-gray-500 mt-1">Управление товарными запасами</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setShowWriteOff(true)}
                                className="flex items-center gap-2 px-3 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-sm font-medium transition-colors">
                                <Trash2 className="w-4 h-4" /> Списать
                            </button>
                            <button onClick={() => { setTab('receive'); if (!receiveItems.length) addReceiveItem(); }}
                                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm">
                                <ArrowDownToLine className="w-4 h-4" /> Приход
                            </button>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        <div className="bg-blue-50 rounded-xl p-3">
                            <div className="text-2xl font-bold text-blue-700">{stats.total}</div>
                            <div className="text-xs text-blue-600">Единиц на складе</div>
                        </div>
                        <div className="bg-purple-50 rounded-xl p-3">
                            <div className="text-2xl font-bold text-purple-700">{fmt(stats.value)} ₸</div>
                            <div className="text-xs text-purple-600">Стоимость (розн.)</div>
                        </div>
                        <div className="bg-emerald-50 rounded-xl p-3">
                            <div className="text-2xl font-bold text-emerald-700">{stats.categories}</div>
                            <div className="text-xs text-emerald-600">Наименований</div>
                        </div>
                        <div className={`rounded-xl p-3 ${stats.low > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                            <div className={`text-2xl font-bold ${stats.low > 0 ? 'text-red-700' : 'text-gray-400'}`}>{stats.low}</div>
                            <div className={`text-xs ${stats.low > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                {stats.low > 0 ? '⚠️ Мало на складе' : 'Всё в норме'}
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                        {([
                            { key: 'stock', label: 'Остатки', icon: Package },
                            { key: 'receive', label: 'Приход', icon: ArrowDownToLine },
                            { key: 'movements', label: 'История', icon: Clock },
                            { key: 'documents', label: 'Документы', icon: FileText },
                        ] as const).map(t => (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                    tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                <t.icon className="w-4 h-4" />
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                {/* ==================== TAB: STOCK ==================== */}
                {tab === 'stock' && (
                    <div>
                        <div className="mb-4 relative max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input type="text" placeholder="Поиск по названию, артикулу..."
                                value={search} onChange={e => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500" />
                        </div>

                        {loading ? (
                            <div className="text-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto" /></div>
                        ) : filteredProducts.length === 0 ? (
                            <div className="text-center py-20">
                                <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500">Нет товаров на складе</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100 bg-gray-50/50">
                                            <th className="text-left px-4 py-3 font-medium text-gray-500">Товар</th>
                                            <th className="text-center px-4 py-3 font-medium text-gray-500">Остаток</th>
                                            <th className="text-center px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Мин.</th>
                                            <th className="text-right px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Закуп.</th>
                                            <th className="text-right px-4 py-3 font-medium text-gray-500">Розн.</th>
                                            <th className="text-center px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Серийный</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredProducts.map(p => {
                                            const stock = p._count?.stockItems ?? p.currentStock;
                                            const isLow = p.minStock > 0 && stock <= p.minStock;
                                            return (
                                                <tr key={p.id} className={`border-b border-gray-50 hover:bg-gray-50/50 ${isLow ? 'bg-red-50/30' : ''}`}>
                                                    <td className="px-4 py-3">
                                                        <div className="font-medium text-gray-900">{p.name}</div>
                                                        {p.brand && <div className="text-xs text-gray-400">{p.brand} {p.sku ? `• ${p.sku}` : ''}</div>}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                                                            isLow ? 'bg-red-100 text-red-700' : stock > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                                        }`}>
                                                            {isLow && <AlertTriangle className="w-3 h-3" />}
                                                            {stock} {p.unit}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-gray-400 hidden sm:table-cell">{p.minStock || '—'}</td>
                                                    <td className="px-4 py-3 text-right text-gray-500 hidden sm:table-cell">{fmt(p.purchasePrice)} ₸</td>
                                                    <td className="px-4 py-3 text-right font-medium text-gray-900">{fmt(p.retailPrice)} ₸</td>
                                                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                                                        {p.trackSerials ? <Hash className="w-4 h-4 text-blue-500 mx-auto" /> : <span className="text-gray-300">—</span>}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* ==================== TAB: RECEIVE ==================== */}
                {tab === 'receive' && (
                    <div className="max-w-2xl">
                        <div className="bg-white rounded-2xl border border-gray-100 p-6">
                            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <ArrowDownToLine className="w-5 h-5 text-green-600" /> Приходная накладная
                            </h2>

                            {/* Supplier */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Поставщик</label>
                                <input type="text" value={supplier} onChange={e => setSupplier(e.target.value)}
                                    placeholder="Название поставщика" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500" />
                            </div>

                            {/* Items */}
                            <div className="space-y-4 mb-4">
                                {receiveItems.map((item, idx) => (
                                    <div key={idx} className="border border-gray-100 rounded-xl p-4 relative">
                                        <button onClick={() => removeReceiveItem(idx)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500">
                                            <X className="w-4 h-4" />
                                        </button>

                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                            <div className="col-span-2">
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Товар *</label>
                                                <select value={item.productId} onChange={e => updateReceiveItem(idx, 'productId', e.target.value)}
                                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                                                    {products.map(p => (
                                                        <option key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ''}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Количество</label>
                                                <input type="number" min="1" value={item.quantity} onChange={e => updateReceiveItem(idx, 'quantity', e.target.value)}
                                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Закупочная цена (₸)</label>
                                                <input type="number" value={item.purchasePrice} onChange={e => updateReceiveItem(idx, 'purchasePrice', e.target.value)}
                                                    placeholder="Из каталога" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                                            </div>
                                        </div>

                                        {/* Serial mode */}
                                        {products.find(p => p.id === item.productId)?.trackSerials && (
                                            <div className="mt-3">
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Серийные номера</label>
                                                <div className="flex gap-2 mb-2">
                                                    <button onClick={() => updateReceiveItem(idx, 'serialMode', 'auto')}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium ${item.serialMode === 'auto' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'}`}>
                                                        Авто
                                                    </button>
                                                    <button onClick={() => updateReceiveItem(idx, 'serialMode', 'manual')}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium ${item.serialMode === 'manual' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'}`}>
                                                        Ручной ввод
                                                    </button>
                                                </div>
                                                {item.serialMode === 'manual' && (
                                                    <textarea value={item.manualSerials} onChange={e => updateReceiveItem(idx, 'manualSerials', e.target.value)}
                                                        placeholder="По одному на строку:&#10;SN-001&#10;SN-002" rows={3}
                                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
                                                )}
                                            </div>
                                        )}

                                        {/* Extra fields */}
                                        <div className="grid grid-cols-2 gap-3 mt-3">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Цвет</label>
                                                <input type="text" value={item.color} onChange={e => updateReceiveItem(idx, 'color', e.target.value)}
                                                    placeholder="Чёрный" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Размер</label>
                                                <input type="text" value={item.size} onChange={e => updateReceiveItem(idx, 'size', e.target.value)}
                                                    placeholder="52-18-140" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button onClick={addReceiveItem} className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-primary-300 hover:text-primary-600 transition-colors mb-4">
                                + Добавить товар
                            </button>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Примечания</label>
                                <textarea value={receiveNotes} onChange={e => setReceiveNotes(e.target.value)}
                                    placeholder="Комментарий к накладной..." rows={2}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none" />
                            </div>

                            <button onClick={handleReceive} disabled={!receiveItems.length || saving}
                                className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors">
                                {saving ? 'Оформление...' : '✅ Оформить приход'}
                            </button>
                        </div>
                    </div>
                )}

                {/* ==================== TAB: MOVEMENTS ==================== */}
                {tab === 'movements' && (
                    <div>
                        {loading ? (
                            <div className="text-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto" /></div>
                        ) : movements.length === 0 ? (
                            <div className="text-center py-20">
                                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500">Нет движений</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {movements.map(m => {
                                    const mt = MOVEMENT_TYPES[m.type] || { label: m.type, color: 'text-gray-700 bg-gray-50', icon: '📦' };
                                    return (
                                        <div key={m.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-4">
                                            <div className="text-2xl">{mt.icon}</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${mt.color}`}>{mt.label}</span>
                                                    <span className="font-medium text-gray-900 text-sm truncate">{m.product.name}</span>
                                                </div>
                                                <div className="text-xs text-gray-400 mt-0.5">
                                                    {m.documentNumber && <span className="mr-2">📄 {m.documentNumber}</span>}
                                                    {m.supplier && <span className="mr-2">🏢 {m.supplier}</span>}
                                                    {m.reason && <span className="mr-2">💬 {m.reason}</span>}
                                                    {m.performedByName && <span>👤 {m.performedByName}</span>}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`text-sm font-bold ${m.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {m.quantity > 0 ? '+' : ''}{m.quantity}
                                                </div>
                                                <div className="text-[10px] text-gray-400">{formatDateTime(m.createdAt)}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ==================== TAB: DOCUMENTS ==================== */}
                {tab === 'documents' && (
                    <div>
                        {loading ? (
                            <div className="text-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto" /></div>
                        ) : documents.length === 0 ? (
                            <div className="text-center py-20">
                                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500">Нет документов</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {documents.map(doc => (
                                    <div key={doc.id} className="bg-white rounded-xl border border-gray-100 p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-gray-400" />
                                                <span className="font-bold text-gray-900">{doc.documentNumber}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                                    doc.status === 'confirmed' ? 'bg-green-50 text-green-700' :
                                                    doc.status === 'draft' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'
                                                }`}>
                                                    {doc.status === 'confirmed' ? 'Проведён' : doc.status === 'draft' ? 'Черновик' : 'Отменён'}
                                                </span>
                                            </div>
                                            <span className="text-xs text-gray-400">{formatDateTime(doc.createdAt)}</span>
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            <span className="font-medium">{DOC_TYPES[doc.type] || doc.type}</span>
                                            {doc.counterpartyName && <span className="ml-2 text-gray-400">• {doc.counterpartyName}</span>}
                                            {doc.totalAmount > 0 && <span className="ml-2 font-semibold text-gray-900">{fmt(doc.totalAmount)} ₸</span>}
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1">
                                            {(doc.items as any[])?.map((it: any, i: number) => (
                                                <span key={i} className="mr-3">{it.name} ×{it.qty}</span>
                                            ))}
                                        </div>
                                        {doc.performedByName && (
                                            <div className="text-xs text-gray-400 mt-1">👤 {doc.performedByName}</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ==================== WRITE-OFF MODAL ==================== */}
            <AnimatePresence>
                {showWriteOff && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowWriteOff(false)}>
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={e => e.stopPropagation()}
                            className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
                        >
                            <h2 className="text-lg font-bold text-gray-900 mb-4">Списание товара</h2>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Товар</label>
                                    <select value={woProduct} onChange={e => setWoProduct(e.target.value)}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
                                        <option value="">Выберите товар</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} ({p._count?.stockItems ?? p.currentStock} {p.unit})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Количество</label>
                                    <input type="number" min="1" value={woQty} onChange={e => setWoQty(e.target.value)}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Причина</label>
                                    <textarea value={woReason} onChange={e => setWoReason(e.target.value)}
                                        placeholder="Брак, истёк срок годности..." rows={2}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none" />
                                </div>
                            </div>
                            <div className="flex gap-3 mt-4">
                                <button onClick={() => setShowWriteOff(false)}
                                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                                    Отмена
                                </button>
                                <button onClick={handleWriteOff} disabled={!woProduct || saving}
                                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium">
                                    {saving ? 'Оформление...' : 'Списать'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
