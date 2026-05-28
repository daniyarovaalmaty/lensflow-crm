'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Plus, Minus, X, Search, CreditCard, Banknote, ArrowRightLeft, Trash2, CheckCircle, Package, Wrench, Receipt, Camera, ChevronDown, ArrowLeft, Maximize, Minimize, Scan } from 'lucide-react';
import Link from 'next/link';
import { BarcodeScanner } from '@/components/scanner/BarcodeScanner';
import { useUsbScanner } from '@/hooks/useUsbScanner';
import { formatDateTime } from '@/lib/dateUtils';
import { getEffectiveClinicPermissions } from '@/types/user';
import AccessDenied from '@/components/ui/AccessDenied';

interface Product {
    id: string; name: string; category: string; type: string;
    brand: string | null; sku: string | null; barcode: string | null;
    retailPrice: number; currentStock: number; availableStock?: number; unit: string;
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

    // permissions visibility check
    const clinicPerms = session?.user ? getEffectiveClinicPermissions({
        subRole: session.user.subRole,
        permissions: session.user.permissions,
    }) : null;

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
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [scanFeedback, setScanFeedback] = useState<string | null>(null);

    // Checkout form
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [discount, setDiscount] = useState('0');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [saving, setSaving] = useState(false);

    // USB Scanner — auto-detects barcode scanner input (keyboard emulation)
    const handleUsbScan = useCallback((code: string) => {
        const product = products.find(p => p.barcode === code || p.sku === code);
        if (product) {
            const stock = product.type === 'service' ? 999 : (product.availableStock ?? product.currentStock);
            const existing = cart.find(c => c.productId === product.id);
            if (existing) {
                if (product.type === 'product' && existing.quantity >= stock) {
                    setScanFeedback(`⚠️ ${product.name} — нет на складе`);
                } else {
                    setCart(prev => prev.map(c => c.productId === product.id ? { ...c, quantity: c.quantity + 1 } : c));
                    setScanFeedback(`✅ ${product.name} (${existing.quantity + 1} шт)`);
                }
            } else {
                setCart(prev => [...prev, {
                    productId: product.id, name: product.name, category: product.category,
                    type: product.type, unitPrice: product.retailPrice, quantity: 1, maxStock: stock,
                }]);
                setScanFeedback(`✅ ${product.name} добавлен`);
            }
        } else {
            setScanFeedback(`❌ Товар "${code}" не найден`);
        }
        setTimeout(() => setScanFeedback(null), 3000);
    }, [products, cart]);
    useUsbScanner(handleUsbScan);

    // Fullscreen toggle for monoblock
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

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
        const stock = product.type === 'service' ? 999 : (product.availableStock ?? product.currentStock);
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

    if (session?.user && clinicPerms && !clinicPerms.canViewPos) {
        return <AccessDenied />;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-3.5 flex-shrink-0">
                <div className="max-w-full mx-auto flex items-center justify-between">
                    <div>
                        <Link href="/optic/dashboard" className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-xs font-bold text-gray-500 hover:text-primary-600 transition-all mb-1">
                            <ArrowLeft className="w-3.5 h-3.5" /> Назад
                        </Link>
                        <h1 className="text-xl md:text-3xl font-black text-gray-900 flex items-center gap-2.5 tracking-tight">
                            <ShoppingCart className="w-5 h-5 md:w-6 h-6 text-primary-600" /> Касса
                        </h1>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3">
                        <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl text-xs font-bold">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <Scan className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">USB-сканер активен</span>
                        </div>
                        <button onClick={() => setShowScanner(!showScanner)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs md:text-sm font-bold transition-all active:scale-95 border ${
                                showScanner 
                                    ? 'bg-primary-50 text-primary-700 border-primary-200 shadow-sm' 
                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900 shadow-sm'
                            }`}>
                            <Camera className="w-4 h-4 text-gray-500" /> <span>Камера</span>
                        </button>
                        <button onClick={() => { setShowHistory(true); loadSales(); }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:text-gray-900 rounded-2xl text-xs md:text-sm font-bold transition-all active:scale-95 shadow-sm">
                            <Receipt className="w-4 h-4 text-gray-500" /> <span>История</span>
                        </button>
                        <button onClick={toggleFullscreen}
                            className="flex items-center justify-center p-2.5 bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:text-gray-900 rounded-2xl transition-all active:scale-95 shadow-sm">
                            {isFullscreen ? <Minimize className="w-4 h-4 md:w-5 h-5 text-gray-500" /> : <Maximize className="w-4 h-4 md:w-5 h-5 text-gray-500" />}
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-full w-full mx-auto px-4 md:px-6 py-4 flex-1 flex flex-col overflow-hidden h-[calc(100vh-80px)] md:h-[calc(100vh-88px)]">
                {/* USB Scanner feedback toast */}
                <AnimatePresence>
                    {scanFeedback && (
                        <motion.div initial={{ opacity: 0, y: -20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -20, x: '-50%' }}
                            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3.5 bg-gray-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl text-base font-bold border border-gray-800 flex items-center gap-2">
                            {scanFeedback}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Camera Scanner */}
                {showScanner && (
                    <div className="mb-4 flex-shrink-0">
                        <BarcodeScanner onScan={handleScanResult} onClose={() => setShowScanner(false)} />
                    </div>
                )}

                <div className="flex-1 flex flex-col md:flex-row gap-5 overflow-hidden h-full">
                    {/* LEFT: Product list */}
                    <div className="flex-1 flex flex-col h-full overflow-hidden">
                        {/* Search & Category Filter */}
                        <div className="flex flex-col sm:flex-row gap-3 mb-4 flex-shrink-0">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input type="text" placeholder="Поиск товара или услуги..."
                                    value={search} onChange={e => setSearch(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 md:py-5 border border-gray-200 rounded-2xl text-sm md:text-lg focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 bg-white placeholder-gray-400 transition-all font-medium shadow-sm" />
                            </div>
                            <div className="flex gap-2">
                                {[{ key: 'all', label: 'Все' }, { key: 'products', label: 'Товары' }, { key: 'services', label: 'Услуги' }].map(f => (
                                    <button key={f.key} onClick={() => setCategoryFilter(f.key)}
                                        className={`flex-1 sm:flex-initial px-6 py-3.5 md:py-5 rounded-2xl text-xs md:text-base font-bold whitespace-nowrap transition-all duration-200 active:scale-[0.97] ${
                                            categoryFilter === f.key 
                                                ? 'bg-primary-600 text-white shadow-md shadow-primary-100' 
                                                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 shadow-sm'
                                        }`}>
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Products grid - scrollable */}
                        <div className="flex-1 overflow-y-auto pr-1">
                            {loading ? (
                                <div className="text-center py-16"><div className="animate-spin w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full mx-auto" /></div>
                            ) : filteredProducts.length === 0 ? (
                                <div className="text-center py-16 bg-white border border-gray-200/80 rounded-3xl p-8 shadow-sm">
                                    <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                    <p className="text-base font-bold text-gray-700">Товары не найдены</p>
                                    <p className="text-xs text-gray-400 mt-1">Попробуйте изменить запрос или категорию</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5">
                                    {filteredProducts.map(p => {
                                        const stock = p.type === 'service' ? null : (p.availableStock ?? p.currentStock);
                                        const inCart = cart.find(c => c.productId === p.id);
                                        const outOfStock = p.type === 'product' && (stock === 0);

                                        return (
                                            <button key={p.id} onClick={() => !outOfStock && addToCart(p)}
                                                disabled={outOfStock}
                                                className={`text-left p-5 md:p-6 rounded-2xl border transition-all flex flex-col justify-between min-h-[130px] md:min-h-[160px] relative overflow-hidden group active:scale-[0.97] duration-150 ${
                                                    inCart 
                                                        ? 'border-primary-500 bg-primary-50/40 shadow-sm shadow-primary-50' 
                                                        : outOfStock 
                                                            ? 'border-gray-200 bg-gray-50 opacity-40 cursor-not-allowed' 
                                                            : 'border-gray-200 bg-white hover:border-primary-400 hover:shadow-md'
                                                }`}>
                                                <div className="flex items-start justify-between gap-2.5 w-full">
                                                    <div className="flex-1 min-w-0">
                                                        {p.brand && <p className="text-[10px] md:text-xs font-extrabold text-primary-500 uppercase tracking-wider mb-1">{p.brand}</p>}
                                                        <p className="text-xs md:text-base font-bold text-gray-800 leading-snug group-hover:text-primary-700 transition-colors line-clamp-2">{p.name}</p>
                                                    </div>
                                                    {inCart && (
                                                        <span className="flex-shrink-0 w-7 h-7 md:w-9 md:h-9 bg-primary-600 text-white rounded-full text-xs md:text-sm font-black flex items-center justify-center shadow-md animate-bounce">
                                                            {inCart.quantity}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-end justify-between mt-4 w-full border-t border-gray-100 pt-3">
                                                    <span className="text-sm md:text-lg font-black text-gray-900">{fmt(p.retailPrice)} ₸</span>
                                                    {stock !== null ? (
                                                        <span className={`text-[10px] md:text-sm font-extrabold px-2.5 py-1 md:px-3 md:py-1.5 rounded-full ${stock > 5 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                                                            {stock > 0 ? `${stock} ${p.unit}` : 'Нет'}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] md:text-sm text-emerald-700 font-extrabold bg-emerald-50 px-2.5 py-1 md:px-3 md:py-1.5 rounded-full flex items-center gap-0.5">
                                                            Услуга
                                                        </span>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: Cart - fixed split viewport */}
                    <div className="w-full md:w-96 lg:w-[420px] flex-shrink-0 h-full flex flex-col bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-md">
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0 bg-gray-50/50">
                            <h2 className="font-extrabold text-gray-900 flex items-center gap-2 text-sm md:text-lg">
                                <ShoppingCart className="w-4 h-4 md:w-5 h-5 text-primary-600" />
                                Корзина
                                {itemCount > 0 && (
                                    <span className="bg-primary-600 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-md animate-pulse">{itemCount}</span>
                                )}
                            </h2>
                            {cart.length > 0 && (
                                <button onClick={() => setCart([])} className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors">Очистить</button>
                            )}
                        </div>

                        {cart.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/20">
                                <div className="w-14 h-14 rounded-2xl bg-gray-100/80 flex items-center justify-center mb-4 text-gray-400">
                                    <ShoppingCart className="w-7 h-7" />
                                </div>
                                <p className="text-sm font-bold text-gray-700">Добавьте товары или услуги</p>
                                <p className="text-xs text-gray-400 mt-1 max-w-[200px] mx-auto leading-relaxed">Выберите интересующие позиции из каталога слева</p>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col overflow-hidden">
                                {/* Cart Items List - scrollable */}
                                <div className="flex-1 overflow-y-auto px-5 py-2 divide-y divide-gray-100">
                                    {cart.map(item => (
                                        <div key={item.productId} className="flex items-center gap-3 py-4">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs md:text-base font-bold text-gray-800 truncate leading-snug">{item.name}</p>
                                                <p className="text-[10px] md:text-sm text-gray-500 font-semibold mt-0.5">{fmt(item.unitPrice)} ₸ × {item.quantity}</p>
                                            </div>
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                <button onClick={() => updateQty(item.productId, -1)}
                                                    className="w-8 h-8 md:w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 active:scale-90 flex items-center justify-center transition-all cursor-pointer">
                                                    <Minus className="w-3.5 h-3.5 text-gray-600" />
                                                </button>
                                                <span className="w-6 text-center text-xs md:text-sm font-black text-gray-800">{item.quantity}</span>
                                                <button onClick={() => updateQty(item.productId, 1)}
                                                    className="w-8 h-8 md:w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 active:scale-90 flex items-center justify-center transition-all cursor-pointer">
                                                    <Plus className="w-3.5 h-3.5 text-gray-600" />
                                                </button>
                                                <button onClick={() => removeFromCart(item.productId)}
                                                    className="w-8 h-8 md:w-9 h-9 rounded-xl text-red-500 hover:bg-red-50 active:scale-90 flex items-center justify-center transition-all ml-1 cursor-pointer">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="w-24 text-right text-xs md:text-base font-black text-gray-900 flex-shrink-0">
                                                {fmt(item.unitPrice * item.quantity)} ₸
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Totals - fixed at bottom */}
                                <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 space-y-3 flex-shrink-0">
                                    <div className="flex justify-between text-xs md:text-sm text-gray-500 font-bold">
                                        <span>Подытог:</span>
                                        <span className="text-gray-700">{fmt(subtotal)} ₸</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs md:text-sm text-gray-500 font-bold">Скидка:</span>
                                        <div className="flex items-center gap-2">
                                            <input type="number" min="0" max="100" value={discount}
                                                onChange={e => setDiscount(e.target.value)}
                                                className="w-14 border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 rounded-xl px-2 py-1.5 text-xs md:text-sm text-center font-extrabold bg-white shadow-sm" />
                                            <span className="text-xs md:text-sm text-gray-500 font-bold">%</span>
                                            {discountAmount > 0 && (
                                                <span className="text-xs md:text-sm text-red-500 font-bold ml-2">−{fmt(discountAmount)} ₸</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex justify-between text-base md:text-xl font-black text-gray-900 pt-3 border-t border-gray-200/80">
                                        <span>ИТОГО:</span>
                                        <span className="text-primary-700 text-lg md:text-2xl">{fmt(total)} ₸</span>
                                    </div>
                                </div>

                                {/* Payment actions - fixed at bottom */}
                                <div className="p-5 border-t border-gray-100 flex-shrink-0 bg-white">
                                    <div className="flex gap-2 mb-4">
                                        {PAYMENT_METHODS.map(pm => (
                                            <button key={pm.key} onClick={() => setPaymentMethod(pm.key)}
                                                className={`flex-1 flex flex-col md:flex-row items-center justify-center gap-1.5 py-3 rounded-2xl text-xs font-bold border transition-all active:scale-[0.96] ${
                                                    paymentMethod === pm.key 
                                                        ? pm.color + ' ring-2 ring-current border-transparent font-extrabold shadow-sm' 
                                                        : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                                                }`}>
                                                <pm.icon className="w-4 h-4" />
                                                <span>{pm.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <button onClick={() => setShowCheckout(true)}
                                        className="w-full py-4 md:py-5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-2xl text-xs md:text-base font-extrabold uppercase tracking-wider transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 cursor-pointer">
                                        <Banknote className="w-4 h-4 md:w-5 h-5" /> Оформить заказ — {fmt(total)} ₸
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ==================== CHECKOUT MODAL ==================== */}
            <AnimatePresence>
                {showCheckout && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowCheckout(false)}>
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-md" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            onClick={e => e.stopPropagation()} className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 md:p-8">
                            <h2 className="text-xl font-extrabold text-gray-900 mb-5">Оформление продажи</h2>

                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1.5">Имя покупателя</label>
                                    <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)}
                                        placeholder="Необязательно" className="w-full border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 rounded-xl px-4 py-3 text-sm md:text-base font-medium shadow-sm bg-white" />
                                </div>
                                <div>
                                    <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1.5">Телефон</label>
                                    <input type="text" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                                        placeholder="Необязательно" className="w-full border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 rounded-xl px-4 py-3 text-sm md:text-base font-medium shadow-sm bg-white" />
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-2xl p-5 mb-6 space-y-2">
                                {cart.map(c => (
                                    <div key={c.productId} className="flex justify-between text-xs md:text-sm">
                                        <span className="text-gray-600 font-medium">{c.name} ×{c.quantity}</span>
                                        <span className="font-bold text-gray-900">{fmt(c.unitPrice * c.quantity)} ₸</span>
                                    </div>
                                ))}
                                <div className="border-t border-gray-200/80 pt-2.5 mt-3 flex justify-between font-black text-sm md:text-base text-gray-900">
                                    <span>ИТОГО</span>
                                    <span className="text-primary-700">{fmt(total)} ₸</span>
                                </div>
                                <div className="text-xs text-gray-400 font-bold flex items-center gap-1 mt-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                                    Оплата: {PAYMENT_METHODS.find(p => p.key === paymentMethod)?.label}
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button onClick={() => setShowCheckout(false)}
                                    className="flex-1 py-3.5 border border-gray-200 rounded-2xl text-xs md:text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all active:scale-95 shadow-sm">
                                    Отмена
                                </button>
                                <button onClick={handleCheckout} disabled={saving}
                                    className="flex-1 py-3.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-2xl text-xs md:text-sm font-black transition-all active:scale-95 shadow-md flex items-center justify-center gap-1.5 cursor-pointer">
                                    {saving ? 'Оформление...' : <><CheckCircle className="w-4 h-4" /> Подтвердить</>}
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
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-md" />
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                            onClick={e => e.stopPropagation()} className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 md:p-8 text-center">
                            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4 animate-bounce" />
                            <h2 className="text-xl font-black text-gray-900 mb-1">Продажа оформлена!</h2>
                            <p className="text-2xl font-black text-green-600 mb-1">{fmt(lastSale.total)} ₸</p>
                            <p className="text-xs text-gray-400 font-bold mb-5">Чек №{lastSale.saleNumber}</p>
                            <div className="bg-gray-50 rounded-2xl p-4 text-left mb-5 text-xs md:text-sm space-y-1.5 max-h-[160px] overflow-y-auto border border-gray-100">
                                {lastSale.items?.map((item, i) => (
                                    <div key={i} className="flex justify-between py-0.5">
                                        <span className="text-gray-600 font-medium">{item.name} ×{item.quantity}</span>
                                        <span className="text-gray-900 font-bold">{fmt(item.total)} ₸</span>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => setLastSale(null)}
                                className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl text-xs md:text-sm font-black transition-all active:scale-95 shadow-md shadow-primary-100 uppercase tracking-wider">
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
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-md" />
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                            onClick={e => e.stopPropagation()} className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full mb-[5vh] overflow-hidden">
                            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
                                <h2 className="text-lg font-black text-gray-900">История продаж</h2>
                                <button onClick={() => setShowHistory(false)} className="p-1 rounded-lg hover:bg-gray-100 transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
                            </div>
                            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
                                {sales.length === 0 ? (
                                    <div className="text-center py-12 text-gray-400">
                                        <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                        <p className="text-sm font-bold">История продаж пуста</p>
                                    </div>
                                ) : sales.map(sale => (
                                    <div key={sale.id} className="border border-gray-100 rounded-2xl p-5 bg-gray-50/30 hover:border-gray-200 transition-all">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="font-extrabold text-gray-900 text-sm md:text-base">{sale.saleNumber}</span>
                                            <span className="text-lg font-black text-green-600">{fmt(sale.total)} ₸</span>
                                        </div>
                                        <div className="text-[11px] font-bold text-gray-400 mb-3 flex items-center gap-1.5 flex-wrap">
                                            <span>{formatDateTime(sale.createdAt)}</span>
                                            <span>•</span>
                                            {sale.customerName && (
                                                <>
                                                    <span>{sale.customerName}</span>
                                                    <span>•</span>
                                                </>
                                            )}
                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-[10px]">
                                                {PAYMENT_METHODS.find(p => p.key === sale.paymentMethod)?.label || sale.paymentMethod}
                                            </span>
                                        </div>
                                        <div className="space-y-1.5 bg-white border border-gray-100/80 rounded-xl p-3">
                                            {sale.items?.map((item, i) => (
                                                <div key={i} className="flex justify-between text-xs text-gray-500">
                                                    <span className="font-medium text-gray-600">{item.name} ×{item.quantity}</span>
                                                    <span className="font-bold text-gray-900">{fmt(item.total)} ₸</span>
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
