'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShoppingCart, Plus, Minus, X, Search, CreditCard, Banknote, ArrowRightLeft,
    Trash2, CheckCircle, Package, Wrench, Receipt, Camera, ChevronDown
} from 'lucide-react';
import { BarcodeScanner } from '@/components/scanner/BarcodeScanner';
import { formatDateTime } from '@/lib/dateUtils';

interface Product {
    id: string; name: string; category: string; type: string;
    brand: string | null; sku: string | null; barcode: string | null;
    retailPrice: number; currentStock: number; unit: string;
    images: string[] | null; isActive: boolean;
    _count?: { stockItems: number };
}

interface CartItem {
    productId: string; name: string; category: string; type: string;
    unitPrice: number; quantity: number; maxStock: number;
}

interface Sale {
    id: string; saleNumber: string; customerName: string | null; total: number;
    paymentMethod: string; createdAt: string;
    items: Array<{ name: string; quantity: number; unitPrice: number; total: number }>;
}

const fmt = (n: number) => n.toLocaleString('ru-RU');

const PAYMENT_METHODS = [
    { key: 'cash', label: 'Наличные', icon: Banknote, color: 'bg-green-50 text-green-700 border-green-200' },
    { key: 'card', label: 'Карта', icon: CreditCard, color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { key: 'transfer', label: 'Перевод', icon: ArrowRightLeft, color: 'bg-purple-50 text-purple-700 border-purple-200' },
];

export default function POSPage() {
    const { data: session } = useSession();
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [showScanner, setShowScanner] = useState(false);
    const [showCheckout, setShowCheckout] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [sales, setSales] = useState<Sale[]>([]);
    const [lastSale, setLastSale] = useState<Sale | null>(null);

    // Checkout form
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [discount, setDiscount] = useState('0');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [saving, setSaving] = useState(false);

    useEffect(() => { loadProducts(); }, []);

    const loadProducts = async () => {
        try {
            const res = await fetch('/api/optic/products');
            if (res.ok) {
                const data = await res.json();
                setProducts(data.filter((p: Product) => p.isActive !== false));
            }
        } finally { setLoading(false); }
    };

    const loadSales = async () => {
        const res = await fetch('/api/optic/sales');
        if (res.ok) setSales(await res.json());
    };

    // Filter products
    const filteredProducts = useMemo(() => {
        let result = products;
        if (categoryFilter === 'products') result = result.filter(p => p.type === 'product');
        else if (categoryFilter === 'services') result = result.filter(p => p.type === 'service');
        if (search) {
            const s = search.toLowerCase();
            result = result.filter(p =>
                p.name.toLowerCase().includes(s) ||
                p.brand?.toLowerCase().includes(s) ||
                p.sku?.toLowerCase().includes(s) ||
                p.barcode?.includes(s)
            );
        }
        return result;
    }, [products, categoryFilter, search]);

    // Cart operations
    const addToCart = (product: Product) => {
        const existing = cart.find(c => c.productId === product.id);
        const stock = product.type === 'service' ? 999 : (product._count?.stockItems ?? product.currentStock);
        if (existing) {
            if (product.type === 'product' && existing.quantity >= stock) return;
            setCart(cart.map(c => c.productId === product.id ? { ...c, quantity: c.quantity + 1 } : c));
        } else {
            setCart([...cart, {
                productId: product.id, name: product.name, category: product.category,
                type: product.type, unitPrice: product.retailPrice, quantity: 1, maxStock: stock,
            }]);
        }
    };

    const updateQty = (productId: string, delta: number) => {
        setCart(cart.map(c => {
            if (c.productId !== productId) return c;
            const newQty = c.quantity + delta;
            if (newQty <= 0) return c;
            if (c.type === 'product' && newQty > c.maxStock) return c;
            return { ...c, quantity: newQty };
        }));
    };

    const removeFromCart = (productId: string) => {
        setCart(cart.filter(c => c.productId !== productId));
    };

    const handleScanResult = (code: string) => {
        const product = products.find(p => p.barcode === code || p.sku === code);
        if (product) {
            addToCart(product);
        } else {
            alert(`Товар с кодом "${code}" не найден`);
        }
    };

    // Totals
    const subtotal = cart.reduce((s, c) => s + c.unitPrice * c.quantity, 0);
    const discountPct = Number(discount) || 0;
    const discountAmount = Math.round(subtotal * discountPct / 100);
    const total = subtotal - discountAmount;
    const itemCount = cart.reduce((s, c) => s + c.quantity, 0);

    // Checkout
    const handleCheckout = async () => {
        if (!cart.length) return;
        setSaving(true);
        try {
            const res = await fetch('/api/optic/sales', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: cart.map(c => ({ productId: c.productId, quantity: c.quantity, unitPrice: c.unitPrice })),
                    customerName: customerName || undefined,
                    customerPhone: customerPhone || undefined,
                    discountPercent: discountPct,
                    paymentMethod,
                }),
            });
            if (res.ok) {
                const sale = await res.json();
                setLastSale(sale);
                setCart([]);
                setCustomerName('');
                setCustomerPhone('');
                setDiscount('0');
                setShowCheckout(false);
                loadProducts(); // refresh stock
            }
        } finally { setSaving(false); }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5 text-primary-600" /> Касса
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowScanner(!showScanner)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                                showScanner ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}>
                            <Camera className="w-4 h-4" /> Сканер
                        </button>
                        <button onClick={() => { setShowHistory(true); loadSales(); }}
                            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl text-sm font-medium transition-colors">
                            <Receipt className="w-4 h-4" /> История
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
                {/* Scanner */}
                {showScanner && (
                    <div className="mb-4">
                        <BarcodeScanner onScan={handleScanResult} onClose={() => setShowScanner(false)} />
                    </div>
                )}

                <div className="flex flex-col lg:flex-row gap-4">
                    {/* LEFT: Product list */}
                    <div className="flex-1">
                        {/* Search */}
                        <div className="flex gap-2 mb-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input type="text" placeholder="Поиск товара или услуги..."
                                    value={search} onChange={e => setSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500" />
                            </div>
                            <div className="flex gap-1">
                                {[{ key: 'all', label: 'Все' }, { key: 'products', label: 'Товары' }, { key: 'services', label: 'Услуги' }].map(f => (
                                    <button key={f.key} onClick={() => setCategoryFilter(f.key)}
                                        className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap ${
                                            categoryFilter === f.key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Products grid */}
                        {loading ? (
                            <div className="text-center py-12"><div className="animate-spin w-6 h-6 border-3 border-primary-500 border-t-transparent rounded-full mx-auto" /></div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {filteredProducts.map(p => {
                                    const stock = p.type === 'service' ? null : (p._count?.stockItems ?? p.currentStock);
                                    const inCart = cart.find(c => c.productId === p.id);
                                    const outOfStock = p.type === 'product' && (stock === 0);

                                    return (
                                        <button key={p.id} onClick={() => !outOfStock && addToCart(p)}
                                            disabled={outOfStock}
                                            className={`text-left p-3 rounded-xl border transition-all ${
                                                inCart ? 'border-primary-300 bg-primary-50 shadow-sm' :
                                                outOfStock ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed' :
                                                'border-gray-100 bg-white hover:border-primary-200 hover:shadow-sm'
                                            }`}>
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 min-w-0">
                                                    {p.brand && <p className="text-[9px] font-semibold text-gray-400 uppercase">{p.brand}</p>}
                                                    <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                                                </div>
                                                {inCart && (
                                                    <span className="flex-shrink-0 w-5 h-5 bg-primary-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                                                        {inCart.quantity}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-end justify-between mt-2">
                                                <span className="text-sm font-bold text-gray-900">{fmt(p.retailPrice)} ₸</span>
                                                {stock !== null ? (
                                                    <span className={`text-[10px] font-medium ${stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                        {stock > 0 ? `${stock} ${p.unit}` : 'Нет'}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-0.5">
                                                        <Wrench className="w-3 h-3" /> Услуга
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* RIGHT: Cart */}
                    <div className="lg:w-96 flex-shrink-0">
                        <div className="bg-white rounded-2xl border border-gray-100 sticky top-4">
                            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                                    <ShoppingCart className="w-4 h-4" />
                                    Корзина
                                    {itemCount > 0 && (
                                        <span className="bg-primary-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{itemCount}</span>
                                    )}
                                </h2>
                                {cart.length > 0 && (
                                    <button onClick={() => setCart([])} className="text-xs text-red-500 hover:text-red-700">Очистить</button>
                                )}
                            </div>

                            {cart.length === 0 ? (
                                <div className="px-4 py-8 text-center">
                                    <ShoppingCart className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                                    <p className="text-sm text-gray-400">Добавьте товары или услуги</p>
                                </div>
                            ) : (
                                <>
                                    <div className="px-4 py-2 space-y-2 max-h-[40vh] overflow-y-auto">
                                        {cart.map(item => (
                                            <div key={item.productId} className="flex items-center gap-2 py-2 border-b border-gray-50 last:border-0">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                                                    <p className="text-xs text-gray-400">{fmt(item.unitPrice)} ₸ × {item.quantity}</p>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => updateQty(item.productId, -1)}
                                                        className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                                                        <Minus className="w-3 h-3" />
                                                    </button>
                                                    <span className="w-7 text-center text-sm font-bold">{item.quantity}</span>
                                                    <button onClick={() => updateQty(item.productId, 1)}
                                                        className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                                                        <Plus className="w-3 h-3" />
                                                    </button>
                                                    <button onClick={() => removeFromCart(item.productId)}
                                                        className="w-7 h-7 rounded-lg text-red-400 hover:bg-red-50 flex items-center justify-center ml-1">
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                                <div className="w-20 text-right text-sm font-semibold text-gray-900">
                                                    {fmt(item.unitPrice * item.quantity)} ₸
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Totals */}
                                    <div className="px-4 py-3 border-t border-gray-100 space-y-1.5">
                                        <div className="flex justify-between text-sm text-gray-500">
                                            <span>Подитог</span>
                                            <span>{fmt(subtotal)} ₸</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-500">Скидка</span>
                                            <input type="number" min="0" max="100" value={discount}
                                                onChange={e => setDiscount(e.target.value)}
                                                className="w-14 border border-gray-200 rounded-lg px-2 py-1 text-xs text-center" />
                                            <span className="text-sm text-gray-500">%</span>
                                            {discountAmount > 0 && (
                                                <span className="ml-auto text-sm text-red-500">−{fmt(discountAmount)} ₸</span>
                                            )}
                                        </div>
                                        <div className="flex justify-between text-lg font-bold text-gray-900 pt-1 border-t border-gray-100">
                                            <span>ИТОГО</span>
                                            <span>{fmt(total)} ₸</span>
                                        </div>
                                    </div>

                                    {/* Payment methods */}
                                    <div className="px-4 py-3 border-t border-gray-100">
                                        <div className="flex gap-2 mb-3">
                                            {PAYMENT_METHODS.map(pm => (
                                                <button key={pm.key} onClick={() => setPaymentMethod(pm.key)}
                                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium border transition-colors ${
                                                        paymentMethod === pm.key ? pm.color + ' border-current' : 'bg-gray-50 text-gray-400 border-gray-100'
                                                    }`}>
                                                    <pm.icon className="w-3.5 h-3.5" />
                                                    {pm.label}
                                                </button>
                                            ))}
                                        </div>
                                        <button onClick={() => setShowCheckout(true)}
                                            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold transition-colors shadow-sm">
                                            💰 Оформить — {fmt(total)} ₸
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ==================== CHECKOUT MODAL ==================== */}
            <AnimatePresence>
                {showCheckout && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowCheckout(false)}>
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            onClick={e => e.stopPropagation()} className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                            <h2 className="text-lg font-bold text-gray-900 mb-4">Оформление продажи</h2>

                            <div className="space-y-3 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Имя покупателя</label>
                                    <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)}
                                        placeholder="Необязательно" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                                    <input type="text" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                                        placeholder="Необязательно" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-1">
                                {cart.map(c => (
                                    <div key={c.productId} className="flex justify-between text-sm">
                                        <span className="text-gray-600">{c.name} ×{c.quantity}</span>
                                        <span className="font-medium">{fmt(c.unitPrice * c.quantity)} ₸</span>
                                    </div>
                                ))}
                                <div className="border-t border-gray-200 pt-1 mt-2 flex justify-between font-bold">
                                    <span>ИТОГО</span>
                                    <span>{fmt(total)} ₸</span>
                                </div>
                                <div className="text-xs text-gray-400">
                                    Оплата: {PAYMENT_METHODS.find(p => p.key === paymentMethod)?.label}
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button onClick={() => setShowCheckout(false)}
                                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                                    Отмена
                                </button>
                                <button onClick={handleCheckout} disabled={saving}
                                    className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold">
                                    {saving ? 'Оформление...' : '✅ Подтвердить'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ==================== SUCCESS MODAL ==================== */}
            <AnimatePresence>
                {lastSale && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setLastSale(null)}>
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                            onClick={e => e.stopPropagation()} className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
                            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
                            <h2 className="text-xl font-bold text-gray-900 mb-1">Продажа оформлена!</h2>
                            <p className="text-lg font-bold text-green-600 mb-1">{fmt(lastSale.total)} ₸</p>
                            <p className="text-sm text-gray-500 mb-4">Чек №{lastSale.saleNumber}</p>
                            <div className="bg-gray-50 rounded-xl p-3 text-left mb-4 text-sm">
                                {lastSale.items?.map((item, i) => (
                                    <div key={i} className="flex justify-between py-0.5">
                                        <span className="text-gray-600">{item.name} ×{item.quantity}</span>
                                        <span className="text-gray-900">{fmt(item.total)} ₸</span>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => setLastSale(null)}
                                className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium">
                                Новая продажа
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ==================== HISTORY MODAL ==================== */}
            <AnimatePresence>
                {showHistory && (
                    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[5vh] overflow-y-auto" onClick={() => setShowHistory(false)}>
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                            onClick={e => e.stopPropagation()} className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mb-[5vh]">
                            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 rounded-t-2xl flex items-center justify-between">
                                <h2 className="text-lg font-bold text-gray-900">История продаж</h2>
                                <button onClick={() => setShowHistory(false)}><X className="w-5 h-5 text-gray-400" /></button>
                            </div>
                            <div className="px-6 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
                                {sales.length === 0 ? (
                                    <p className="text-center text-gray-400 py-8">Нет продаж</p>
                                ) : sales.map(sale => (
                                    <div key={sale.id} className="border border-gray-100 rounded-xl p-3">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-bold text-gray-900">{sale.saleNumber}</span>
                                            <span className="text-lg font-bold text-green-600">{fmt(sale.total)} ₸</span>
                                        </div>
                                        <div className="text-xs text-gray-400 mb-2">
                                            {formatDateTime(sale.createdAt)}
                                            {sale.customerName && ` • ${sale.customerName}`}
                                            {' • '}{PAYMENT_METHODS.find(p => p.key === sale.paymentMethod)?.label || sale.paymentMethod}
                                        </div>
                                        <div className="space-y-0.5">
                                            {sale.items?.map((item, i) => (
                                                <div key={i} className="flex justify-between text-xs text-gray-500">
                                                    <span>{item.name} ×{item.quantity}</span>
                                                    <span>{fmt(item.total)} ₸</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
