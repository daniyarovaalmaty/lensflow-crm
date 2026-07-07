'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Plus, Minus, X, Search, CreditCard, Banknote, ArrowRightLeft, Trash2, CheckCircle, Package, Wrench, Receipt, Camera, ChevronDown, ArrowLeft, Maximize, Minimize, Scan, Wallet, Calendar, Layers, SplitSquareHorizontal } from 'lucide-react';
import Link from 'next/link';
import { BarcodeScanner } from '@/components/scanner/BarcodeScanner';
import { useUsbScanner } from '@/hooks/useUsbScanner';
import { formatDateTime } from '@/lib/dateUtils';
import { getEffectiveClinicPermissions } from '@/types/user';
import AccessDenied from '@/components/ui/AccessDenied';

interface Product {
    id: string; name: string; category: string; type: string;
    brand: string | null; sku: string | null; barcode: string | null;
    retailPrice: number; currentStock: number; unit: string;
    images: string[] | null; isActive: boolean;
    isFreePrice: boolean;
    _count?: { stockItems: number };
}

interface CartItem {
    productId: string; name: string; category: string; type: string;
    unitPrice: number; quantity: number; maxStock: number;
    isFreePrice?: boolean;
}

interface Sale {
    id: string; saleNumber: string; customerName: string | null; total: number; paidAmount: number;
    paymentMethod: string; createdAt: string;
    invoiceData?: { split?: Array<{ method: string; label: string; amount: number }> } | null;
    items: Array<{ name: string; quantity: number; unitPrice: number; total: number }>;
}

const fmt = (n: number) => n.toLocaleString('ru-RU');

const PAYMENT_METHODS = [
    { key: 'cash', label: 'Наличными', icon: Banknote, color: 'bg-green-50 text-green-700 border-green-200' },
    { key: 'card', label: 'Картой', icon: CreditCard, color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { key: 'installment12', label: 'Рассрочка 12 мес', icon: Calendar, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { key: 'mixed', label: 'Смешанная', icon: SplitSquareHorizontal, color: 'bg-orange-50 text-orange-700 border-orange-200' },
];

const TRAFFIC_SOURCES = [
    'Не указано',
    'Instagram',
    '2GIS',
    'Пациенты Айгерим',
    'С улицы',
    'Пациенты Диляры',
    'С сайта',
    'другое'
];

const MIXED_SPLITS = [
    { key: 'cash',          label: 'Наличные' },
    { key: 'kaspi',         label: 'Kaspi' },
    { key: 'card',          label: 'Карта' },
    { key: 'installment12', label: 'Рассрочка 12' },
    { key: 'transfer',      label: 'Перевод' },
] as const;

type MixedKey = typeof MIXED_SPLITS[number]['key'];

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
    const [showDebts, setShowDebts] = useState(false);
    const [debts, setDebts] = useState<Sale[]>([]);
    const [payDebtModal, setPayDebtModal] = useState<Sale | null>(null);
    const [debtPaymentMethod, setDebtPaymentMethod] = useState('cash');
    const [payingDebt, setPayingDebt] = useState(false);
    const [lastSale, setLastSale] = useState<Sale | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [scanFeedback, setScanFeedback] = useState<string | null>(null);

    // Checkout form
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [discount, setDiscount] = useState('0');
    const [discountType, setDiscountType] = useState<'percent' | 'amount'>('percent');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [trafficSource, setTrafficSource] = useState('Не указано');
    const [mixedCash, setMixedCash] = useState('');
    const [mixedCard, setMixedCard] = useState('');
    const [mixedTransfer, setMixedTransfer] = useState('');
    const [saving, setSaving] = useState(false);
    const [draftSaleId, setDraftSaleId] = useState<string | null>(null);

    // Pending Sales
    const [pendingSales, setPendingSales] = useState<any[]>([]);

    const [prepayment, setPrepayment] = useState('');
    const [mixedPayments, setMixedPayments] = useState<Record<MixedKey, string>>({
        cash: '', kaspi: '', card: '', installment12: '', transfer: '',
    });

    // Patient integration state
    const [patientId, setPatientId] = useState<string | null>(null);
    const [leadId, setLeadId] = useState<string | null>(null);
    const [patients, setPatients] = useState<any[]>([]);
    const [patientSearch, setPatientSearch] = useState('');
    const [showPatientDropdown, setShowPatientDropdown] = useState(false);
    const [patientSales, setPatientSales] = useState<any[]>([]);
    const [showAllPatientSales, setShowAllPatientSales] = useState(false);

    // Custom Item State
    const [showCustomModal, setShowCustomModal] = useState(false);
    const [customName, setCustomName] = useState('');
    const [customPrice, setCustomPrice] = useState('');

    // Doctors
    const [doctors, setDoctors] = useState<any[]>([]);
    const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');

    useEffect(() => {
        if (!patientSearch.trim()) {
            setPatients([]);
            return;
        }
        const delayDebounceFn = setTimeout(async () => {
            try {
                const res = await fetch(`/api/patients?q=${encodeURIComponent(patientSearch)}&noSync=1`);
                if (res.ok) {
                    const data = await res.json();
                    setPatients(data.patients || []);
                }
            } catch (err) {
                console.error('Error searching patients:', err);
            }
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [patientSearch]);

    // Fetch patient sales when patientId changes
    useEffect(() => {
        if (!patientId) {
            setPatientSales([]);
            setShowAllPatientSales(false);
            return;
        }
        fetch(`/api/patients/${patientId}/sales`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setPatientSales(data);
                else setPatientSales([]);
            })
            .catch(err => {
                console.error('Failed to fetch patient sales', err);
                setPatientSales([]);
            });
    }, [patientId]);

    // USB Scanner — auto-detects barcode scanner input (keyboard emulation)
    const handleUsbScan = useCallback((code: string) => {
        const product = products.find(p => p.barcode === code || p.sku === code);
        if (product) {
            addToCart(product);
        } else {
            setScanFeedback(`❌ Товар "${code}" не найден`);
            setTimeout(() => setScanFeedback(null), 3000);
        }
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

    useEffect(() => { 
        loadProducts(); 
        loadPendingSales();
        loadDoctors();
    }, []);

    const loadPendingSales = async () => {
        try {
            const res = await fetch('/api/optic/sales/pending');
            if (res.ok) {
                setPendingSales(await res.json());
            }
        } catch (e) {
            console.error('Failed to load pending sales', e);
        }
    };

    const handleDeleteDraft = async (id: string) => {
        if (!confirm('Вы уверены, что хотите удалить этот счет?')) return;
        try {
            const res = await fetch(`/api/optic/sales/draft/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setScanFeedback('✅ Счет успешно удален!');
                setTimeout(() => setScanFeedback(null), 3000);
                loadPendingSales();
            } else {
                const data = await res.json().catch(() => ({}));
                alert(`Ошибка при удалении: ${data.error || res.statusText}`);
            }
        } catch (e: any) {
            console.error('Failed to delete draft', e);
            alert(`Ошибка сети: ${e.message}`);
        }
    };

    const loadDoctors = async () => {
        try {
            const res = await fetch('/api/clinic-staff');
            if (res.ok) {
                const data = await res.json();
                setDoctors(data);
            }
        } catch(e) {}
    };

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

    const loadDebts = async () => {
        const res = await fetch('/api/optic/sales?status=partial');
        if (res.ok) setDebts(await res.json());
    };

    const handlePayDebt = async () => {
        if (!payDebtModal) return;
        setPayingDebt(true);
        try {
            const res = await fetch(`/api/optic/sales/${payDebtModal.id}/pay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentMethod: debtPaymentMethod })
            });
            if (res.ok) {
                setPayDebtModal(null);
                loadDebts();
            } else {
                const err = await res.json();
                alert(`Ошибка: ${err.error || 'Не удалось провести оплату'}`);
            }
        } catch(e: any) {
            alert(`Ошибка сети: ${e.message}`);
        } finally {
            setPayingDebt(false);
        }
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
    const addToCart = (p: Product) => {
        const existing = cart.find(c => c.productId === p.id);
        const stock = p.type === 'service' ? 999 : p.currentStock;
        if (existing) {
            if (p.type === 'product' && existing.quantity >= stock) return;
            setCart(cart.map(c => c.productId === p.id ? { ...c, quantity: c.quantity + 1 } : c));
        } else {
            setCart([...cart, {
                productId: p.id, name: p.name, category: p.category,
                type: p.type, unitPrice: p.retailPrice, quantity: 1, maxStock: stock,
                isFreePrice: p.isFreePrice,
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

    const updateCartItemPrice = (productId: string, newPrice: number) => {
        setCart(prev => prev.map(c => {
            if (c.productId === productId && c.isFreePrice) {
                return { ...c, unitPrice: newPrice };
            }
            return c;
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
    const discountVal = Number(discount) || 0;
    const discountAmount = discountType === 'percent' 
        ? Math.round(subtotal * discountVal / 100) 
        : discountVal;
    const discountPct = discountType === 'percent' 
        ? discountVal 
        : (subtotal > 0 ? (discountAmount / subtotal * 100) : 0);
    const total = subtotal - discountAmount;
    const itemCount = cart.reduce((s, c) => s + c.quantity, 0);

    // Prepayment (предоплата вносимая сейчас)
    const isPrepayment = prepayment !== '' && Number(prepayment) >= 0;
    const paidNow = isPrepayment ? Math.min(Number(prepayment), total) : total;
    const remainingDebt = total - paidNow;

    const mixedTotal = MIXED_SPLITS.reduce((s, sp) => s + (Number(mixedPayments[sp.key]) || 0), 0);
    const mixedValid = paymentMethod !== 'mixed' || mixedTotal === paidNow;

    const activeMixedSplits = MIXED_SPLITS.filter(sp => Number(mixedPayments[sp.key]) > 0)
        .map(sp => ({ method: sp.key, label: sp.label, amount: Number(mixedPayments[sp.key]) }));

    // Checkout
    const handleCheckout = async () => {
        if (!cart.length) return;
        
        if (paymentMethod === 'mixed') {
            if (!mixedValid) {
                alert(`Сумма смешанной оплаты (${fmt(mixedTotal)} ₸) не совпадает со вносимой суммой (${fmt(paidNow)} ₸)!`);
                return;
            }
        }

        let invoiceData: any = {};
        if (trafficSource !== 'Не указано') {
            invoiceData.trafficSource = trafficSource;
        }

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
                    explicitDiscountAmount: discountType === 'amount' ? discountAmount : undefined,
                    paymentMethod: paymentMethod,
                    paymentSplit: paymentMethod === 'mixed' ? activeMixedSplits : undefined,
                    prepaymentAmount: isPrepayment ? paidNow : undefined,
                    invoiceData: Object.keys(invoiceData).length > 0 ? invoiceData : undefined,
                    patientId: patientId || undefined,
                    leadId: leadId || undefined,
                    draftSaleId: draftSaleId || undefined,
                    doctorId: selectedDoctorId || undefined,
                }),
            });
            if (res.ok) {
                const sale = await res.json();
                setScanFeedback('✅ Оплата успешно проведена!');
                setTimeout(() => setScanFeedback(null), 3000);
                setCart([]);
                setCustomerName('');
                setCustomerPhone('');
                setTrafficSource('Не указано');
                setDiscount('0');
                setDiscountType('percent');
                setPrepayment('');
                setPatientId(null);
                setLeadId(null);
                setSelectedDoctorId('');
                setPatientSearch('');
                setMixedPayments({ cash: '', kaspi: '', card: '', installment12: '', transfer: '' });
                setDraftSaleId(null);
                setShowCheckout(false);
                loadProducts(); // refresh stock
                loadPendingSales(); // refresh pending
            } else {
                const errData = await res.json();
                alert(`Ошибка: ${errData.error || 'Неизвестная ошибка сервера'}`);
            }
        } catch (err: any) {
            alert(`Ошибка сети: ${err.message}`);
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
                        <button onClick={() => { setShowDebts(true); loadDebts(); }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white text-orange-600 border border-orange-200 hover:bg-orange-50 rounded-2xl text-xs md:text-sm font-bold transition-all active:scale-95 shadow-sm">
                            <Wallet className="w-4 h-4 text-orange-500" /> <span>Долги</span>
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
                                    value={search} onChange={e => {
                                        const val = e.target.value;
                                        setSearch(val);
                                        // Auto-add if exact barcode/sku match is typed/scanned
                                        const product = products.find(p => (p.barcode && p.barcode === val) || (p.sku && p.sku === val));
                                        if (product) {
                                            handleUsbScan(val);
                                            setSearch('');
                                        }
                                    }}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && search.trim()) {
                                            const code = search.trim();
                                            const product = products.find(p => p.barcode === code || p.sku === code);
                                            if (product) {
                                                e.preventDefault();
                                                handleUsbScan(code);
                                                setSearch('');
                                            }
                                        }
                                    }}
                                    className="w-full pl-12 pr-4 py-3.5 md:py-5 border border-gray-200 rounded-2xl text-sm md:text-lg focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 bg-white placeholder-gray-400 transition-all font-medium shadow-sm" />
                            </div>
                            <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                                {[{ key: 'all', label: 'Все' }, { key: 'products', label: 'Товары' }, { key: 'services', label: 'Услуги' }, { key: 'pending', label: 'Ожидают оплаты', badge: pendingSales.length }].map(f => (
                                    <button key={f.key} onClick={() => setCategoryFilter(f.key)}
                                        className={`flex-1 sm:flex-initial px-6 py-3.5 md:py-5 rounded-2xl text-xs md:text-base font-bold whitespace-nowrap transition-all duration-200 active:scale-[0.97] relative ${
                                            categoryFilter === f.key 
                                                ? 'bg-primary-600 text-white shadow-md shadow-primary-100' 
                                                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 shadow-sm'
                                        }`}>
                                        {f.label}
                                        {f.badge ? (
                                            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-sm">
                                                {f.badge}
                                            </span>
                                        ) : null}
                                    </button>
                                ))}
                                <button onClick={() => setShowCustomModal(true)}
                                    className="flex-1 sm:flex-initial px-6 py-3.5 md:py-5 rounded-2xl text-xs md:text-base font-bold whitespace-nowrap transition-all duration-200 active:scale-[0.97] bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 shadow-sm flex items-center justify-center gap-2">
                                    <Plus className="w-5 h-5 shrink-0" />
                                    <span>Свободная сумма</span>
                                </button>
                            </div>
                        </div>

                        {/* Products grid - scrollable */}
                        <div className="flex-1 overflow-y-auto pr-1">
                            {loading ? (
                                <div className="text-center py-16"><div className="animate-spin w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full mx-auto" /></div>
                            ) : categoryFilter === 'pending' ? (
                                pendingSales.length === 0 ? (
                                    <div className="text-center py-16 bg-white border border-gray-200/80 rounded-3xl p-8 shadow-sm">
                                        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                        <p className="text-base font-bold text-gray-700">Нет неоплаченных счетов</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                                        {pendingSales.map(ps => (
                                            <div key={ps.id} className="bg-white rounded-2xl border border-orange-200 p-4 shadow-sm relative hover:shadow-md transition-shadow">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <h3 className="font-bold text-gray-900">{ps.customerName || 'Неизвестный пациент'}</h3>
                                                        <p className="text-xs text-gray-500">{new Date(ps.createdAt).toLocaleString('ru-RU')}</p>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className="bg-orange-100 text-orange-800 text-[10px] font-bold px-2 py-1 rounded-full uppercase text-center whitespace-nowrap">Ожидает оплаты</span>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteDraft(ps.id); }}
                                                            className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                                            title="Удалить счет"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="text-sm font-semibold text-gray-800 my-3">
                                                    Итого: {fmt(ps.total)} ₸
                                                </div>
                                                <div className="text-xs text-gray-500 mb-4 line-clamp-2">
                                                    {ps.items.map((i: any) => `${i.name} (x${i.quantity})`).join(', ')}
                                                </div>
                                                <button onClick={() => {
                                                    // Map sale items to cart
                                                    setCart(ps.items.map((i: any) => {
                                                        const p = products.find(prod => prod.id === i.productId);
                                                        return {
                                                            productId: i.productId,
                                                            name: i.name,
                                                            category: i.category,
                                                            type: p ? p.type : 'product',
                                                            unitPrice: i.unitPrice,
                                                            quantity: i.quantity,
                                                            maxStock: p && p.type === 'product' ? p.currentStock : 999,
                                                            isFreePrice: p ? p.isFreePrice : false
                                                        };
                                                    }));
                                                    setCustomerName(ps.customerName || '');
                                                    setCustomerPhone(ps.customerPhone || '');
                                                    setPatientId(ps.patientId);
                                                    setDraftSaleId(ps.id);
                                                    setCategoryFilter('all');
                                                }} className="w-full bg-orange-100 hover:bg-orange-200 text-orange-800 py-2 rounded-xl text-xs font-bold transition-colors">
                                                    Перенести в корзину
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )
                            ) : filteredProducts.length === 0 ? (
                                <div className="text-center py-16 bg-white border border-gray-200/80 rounded-3xl p-8 shadow-sm">
                                    <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                    <p className="text-base font-bold text-gray-700">Товары не найдены</p>
                                    <p className="text-xs text-gray-400 mt-1">Попробуйте изменить запрос или категорию</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5">
                                    {filteredProducts.map(p => {
                                        const stock = p.type === 'service' ? null : p.currentStock;
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
                                            <div className="flex-1 min-w-0 pr-2">
                                                <p className="text-xs md:text-sm font-bold text-gray-800 leading-snug break-words line-clamp-2">{item.name}</p>
                                                {item.isFreePrice ? (
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <input type="number" min="0" value={item.unitPrice || ''} onChange={e => updateCartItemPrice(item.productId, parseInt(e.target.value) || 0)} className="w-24 border border-gray-200 rounded-lg px-2 py-1 text-sm font-bold text-gray-800" placeholder="Цена..." />
                                                        <span className="text-[10px] md:text-sm text-gray-500 font-semibold">₸ × {item.quantity}</span>
                                                    </div>
                                                ) : (
                                                    <p className="text-[10px] md:text-sm text-gray-500 font-semibold mt-0.5">{fmt(item.unitPrice)} ₸ × {item.quantity}</p>
                                                )}
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
                                            <input type="number" min="0" max={discountType === 'percent' ? "100" : undefined} value={discount}
                                                onChange={e => setDiscount(e.target.value)}
                                                className="w-20 border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 rounded-xl px-2 py-1.5 text-xs md:text-sm text-right font-extrabold bg-white shadow-sm" />
                                            <div className="flex bg-gray-100 rounded-lg p-0.5">
                                                <button onClick={() => { if(discountType !== 'percent') { setDiscountType('percent'); setDiscount('0'); } }} className={`px-2 py-1 rounded-md text-xs font-bold transition-colors ${discountType === 'percent' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>%</button>
                                                <button onClick={() => { if(discountType !== 'amount') { setDiscountType('amount'); setDiscount('0'); } }} className={`px-2 py-1 rounded-md text-xs font-bold transition-colors ${discountType === 'amount' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>₸</button>
                                            </div>
                                            {discountAmount > 0 && discountType === 'percent' && (
                                                <span className="text-xs md:text-sm text-red-500 font-bold ml-2">−{fmt(discountAmount)}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex justify-between text-base md:text-xl font-black text-gray-900 pt-3 border-t border-gray-200/80">
                                        <span>ИТОГО:</span>
                                        <span className="text-primary-700 text-lg md:text-2xl">{fmt(total)} ₸</span>
                                    </div>
                                    {/* Предоплата (уже внесена ранее) */}
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs md:text-sm text-gray-500 font-bold">Предоплата:</span>
                                        <div className="flex items-center gap-1.5">
                                            <input type="number" min="0" value={prepayment}
                                                onChange={e => {
                                                    const raw = e.target.value;
                                                    if (raw === '') { setPrepayment(''); return; }
                                                    const n = Number(raw);
                                                    if (!isNaN(n) && n >= 0) setPrepayment(String(n));
                                                }}
                                                placeholder="0"
                                                className="w-24 border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 rounded-xl px-2 py-1.5 text-xs md:text-sm text-right font-extrabold bg-white shadow-sm" />
                                            <span className="text-xs md:text-sm text-gray-500 font-bold">₸</span>
                                        </div>
                                    </div>
                                    {isPrepayment && (
                                        <div className="flex justify-between text-xs font-bold text-amber-700 mt-2">
                                            <span>Остаток (долг):</span>
                                            <span>{fmt(remainingDebt)} ₸</span>
                                        </div>
                                    )}
                                    {paidNow > 0 && (
                                        <div className="flex justify-between text-sm md:text-base font-black text-amber-700 bg-amber-50 -mx-2 px-2 py-1.5 rounded-lg">
                                            <span>К оплате сейчас:</span>
                                            <span>{fmt(paidNow)} ₸</span>
                                        </div>
                                    )}
                                </div>

                                {/* Payment actions - fixed at bottom */}
                                <div className="p-4 border-t border-gray-100 flex-shrink-0 bg-white shadow-[0_-4px_10px_rgba(0,0,0,0.02)] z-10">
                                    <div className="grid grid-cols-2 gap-2 mb-4">
                                        {PAYMENT_METHODS.map(pm => (
                                            <button key={pm.key} onClick={() => setPaymentMethod(pm.key)}
                                                className={`flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold border transition-all active:scale-[0.98] ${
                                                    paymentMethod === pm.key
                                                        ? pm.color + ' ring-2 ring-current border-transparent shadow-sm'
                                                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                                                }`}>
                                                <pm.icon className="w-4 h-4 shrink-0" />
                                                <span className="leading-tight truncate">{pm.label}</span>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Mixed payment inputs */}
                                    {paymentMethod === 'mixed' && (
                                        <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 space-y-2">
                                            {MIXED_SPLITS.map(sp => (
                                                <div key={sp.key} className="flex items-center gap-2">
                                                    <span className="text-[11px] font-bold text-gray-600 w-20 shrink-0">{sp.label}</span>
                                                    <input
                                                        type="number" min="0"
                                                        value={mixedPayments[sp.key]}
                                                        onChange={e => {
                                                            const raw = e.target.value;
                                                            if (raw === '') { setMixedPayments(prev => ({ ...prev, [sp.key]: '' })); return; }
                                                            const n = Number(raw);
                                                            if (!isNaN(n) && n >= 0) setMixedPayments(prev => ({ ...prev, [sp.key]: String(n) }));
                                                        }}
                                                        placeholder="0"
                                                        className="flex-1 border border-orange-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 rounded-lg px-2 py-1.5 text-xs text-right font-bold bg-white"
                                                    />
                                                    <span className="text-[11px] text-gray-400 shrink-0">₸</span>
                                                </div>
                                            ))}
                                            <div className={`flex justify-between text-xs font-black pt-1.5 border-t ${mixedValid ? 'text-green-600 border-green-200' : 'text-red-500 border-red-200'}`}>
                                                <span>Сумма:</span>
                                                <span>{fmt(mixedTotal)} / {fmt(paidNow)} ₸ {mixedValid ? '✓' : '≠'}</span>
                                            </div>
                                        </div>
                                    )}

                                    <button onClick={() => setShowCheckout(true)}
                                        disabled={!mixedValid}
                                        className="w-full py-4 md:py-5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 active:scale-95 text-white rounded-2xl text-xs md:text-base font-extrabold uppercase tracking-wider transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 cursor-pointer">
                                        <Banknote className="w-4 h-4 md:w-5 h-5" /> Оформить — {fmt(paidNow)} ₸
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
                            onClick={e => e.stopPropagation()} className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 md:p-8 max-h-[95vh] overflow-y-auto">
                            <h2 className="text-xl font-extrabold text-gray-900 mb-5">Оформление продажи</h2>

                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1.5">Связать с пациентом (из базы/лидов)</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={patientSearch}
                                            onChange={e => {
                                                setPatientSearch(e.target.value);
                                                setShowPatientDropdown(true);
                                            }}
                                            onFocus={() => setShowPatientDropdown(true)}
                                            placeholder="Поиск по ФИО или телефону..."
                                            className="w-full border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 rounded-xl px-4 py-3 text-sm md:text-base font-medium shadow-sm bg-white"
                                        />
                                        {patientId && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setPatientId(null);
                                                    setLeadId(null);
                                                    setPatientSearch('');
                                                    setCustomerName('');
                                                    setCustomerPhone('');
                                                }}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-red-500 hover:text-red-700 transition-colors"
                                            >
                                                Сбросить
                                            </button>
                                        )}
                                        {showPatientDropdown && patientSearch.trim() && patients.length > 0 && (
                                            <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-gray-100 rounded-xl shadow-xl z-50 divide-y divide-gray-50">
                                                {patients.map(p => (
                                                    <button
                                                        key={p.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setPatientId(p.id);
                                                            setCustomerName(p.name);
                                                            setCustomerPhone(p.phone);
                                                            setPatientSearch(p.name);
                                                            setShowPatientDropdown(false);
                                                        }}
                                                        className="w-full text-left px-4 py-2.5 hover:bg-primary-50 text-xs md:text-sm font-medium transition-colors"
                                                    >
                                                        <div className="font-bold text-gray-900">{p.name}</div>
                                                        <div className="text-[10px] md:text-xs text-gray-400 mt-0.5">{p.phone}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {patientId && (
                                        <div className="mt-1.5 flex flex-col gap-2">
                                            <div className="px-3 py-1 bg-green-50 text-green-700 border border-green-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 w-fit">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                                Связано с пациентом из базы
                                            </div>
                                            
                                            {/* Patient Purchase History Inline */}
                                            {patientSales.length > 0 && (
                                                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h4 className="text-xs font-bold text-gray-700 flex items-center gap-1.5"><Receipt className="w-3.5 h-3.5" /> История покупок</h4>
                                                        {patientSales.length > 3 && (
                                                            <button 
                                                                onClick={() => setShowAllPatientSales(!showAllPatientSales)} 
                                                                className="text-[10px] font-semibold text-primary-600 hover:text-primary-700"
                                                            >
                                                                {showAllPatientSales ? 'Скрыть' : `Показать все (${patientSales.length})`}
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        {(showAllPatientSales ? patientSales : patientSales.slice(0, 3)).map((sale) => (
                                                            <div key={sale.id} className="text-[11px] flex items-start gap-2 text-gray-600 bg-white border border-gray-100 p-2 rounded-lg shadow-sm">
                                                                <span className="text-gray-400 font-medium shrink-0">{new Date(sale.createdAt).toLocaleDateString('ru-RU')}</span>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="truncate font-medium text-gray-800">{sale.items?.map((i: any) => i.name).join(', ')}</div>
                                                                    <div className="font-bold text-gray-900 mt-0.5">{sale.total.toLocaleString()} ₸</div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
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
                                <div>
                                    <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1.5">Врач / Специалист</label>
                                    <select value={selectedDoctorId} onChange={e => setSelectedDoctorId(e.target.value)}
                                        className="w-full border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 rounded-xl px-4 py-3 text-sm md:text-base font-medium shadow-sm bg-white appearance-none cursor-pointer">
                                        <option value="">Не выбрано</option>
                                        {doctors.map(d => (
                                            <option key={d.id} value={d.id}>{d.fullName}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1.5">Откуда узнали о нас?</label>
                                    <select value={trafficSource} onChange={e => setTrafficSource(e.target.value)}
                                        className="w-full border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 rounded-xl px-4 py-3 text-sm md:text-base font-medium shadow-sm bg-white appearance-none cursor-pointer">
                                        {TRAFFIC_SOURCES.map(source => (
                                            <option key={source} value={source}>{source}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            
                            {paymentMethod === 'mixed' && (
                                <div className="space-y-3 mb-6 bg-orange-50/50 p-4 rounded-2xl border border-orange-100">
                                    <h3 className="text-xs font-bold text-orange-800 uppercase tracking-wider mb-2">Смешанная оплата (К оплате: {fmt(paidNow)} ₸)</h3>
                                    <div className="flex flex-col gap-2">
                                        {MIXED_SPLITS.map(sp => (
                                            <div key={sp.key} className="flex items-center gap-2">
                                                <span className="text-[11px] font-bold text-gray-600 w-24">{sp.label}</span>
                                                <input
                                                    type="number" min="0"
                                                    value={mixedPayments[sp.key]}
                                                    onChange={e => {
                                                        const raw = e.target.value;
                                                        if (raw === '') { setMixedPayments(prev => ({ ...prev, [sp.key]: '' })); return; }
                                                        const n = Number(raw);
                                                        if (!isNaN(n) && n >= 0) setMixedPayments(prev => ({ ...prev, [sp.key]: String(n) }));
                                                    }}
                                                    placeholder="0"
                                                    className="flex-1 border border-orange-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 rounded-lg px-3 py-2 text-sm text-right font-bold bg-white"
                                                />
                                                <span className="text-xs text-gray-400 shrink-0">₸</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className={`text-xs font-bold mt-2 ${mixedValid ? 'text-green-600' : 'text-red-500'}`}>
                                        {mixedValid ? 'Сумма сходится!' : `Сумма не совпадает (Введено: ${fmt(mixedTotal)} ₸, нужно: ${fmt(paidNow)} ₸)`}
                                    </div>
                                </div>
                            )}

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
                                {isPrepayment && (
                                    <>
                                        <div className="flex justify-between text-xs md:text-sm text-amber-700 font-bold">
                                            <span>Предоплата (вносится сейчас)</span>
                                            <span>{fmt(paidNow)} ₸</span>
                                        </div>
                                        <div className="flex justify-between font-black text-sm md:text-base text-amber-700">
                                            <span>Остаток (долг)</span>
                                            <span>{fmt(remainingDebt)} ₸</span>
                                        </div>
                                    </>
                                )}
                                {paymentMethod === 'mixed' && activeMixedSplits.length > 0 ? (
                                    <div className="mt-2 pt-2 border-t border-orange-100 space-y-1">
                                        <p className="text-[11px] font-black text-orange-700 flex items-center gap-1">
                                            <Layers className="w-3 h-3" /> Смешанная оплата:
                                        </p>
                                        {activeMixedSplits.map(sp => (
                                            <div key={sp.method} className="flex justify-between text-xs">
                                                <span className="text-gray-500 font-medium">{sp.label}</span>
                                                <span className="font-bold text-gray-800">{fmt(sp.amount)} ₸</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-xs text-gray-400 font-bold flex items-center gap-1 mt-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                                        Оплата: {PAYMENT_METHODS.find(p => p.key === paymentMethod)?.label}
                                    </div>
                                )}
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
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setLastSale(null)}>
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-md" />
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                            onClick={e => e.stopPropagation()} className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 md:p-8 text-center">
                            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4 animate-bounce" />
                            <h2 className="text-2xl font-black text-gray-900 mb-1">🎉 Поздравляем!</h2>
                            <p className="text-sm text-gray-500 font-bold mb-3">Продажа успешно оформлена</p>
                            <p className="text-3xl font-black text-green-600 mb-1">{fmt(lastSale.total)} ₸</p>
                            <p className="text-xs text-gray-400 font-bold mb-2">Чек №{lastSale.saleNumber}</p>
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-xs font-bold mb-5">
                                {PAYMENT_METHODS.find(p => p.key === lastSale.paymentMethod)?.label || lastSale.paymentMethod}
                            </div>
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
                                <div className="flex items-center gap-2">
                                    <Link href="/optic/sales-history" className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors">
                                        <Receipt className="w-3.5 h-3.5" /> Полный отчёт
                                    </Link>
                                    <button onClick={() => setShowHistory(false)} className="p-1 rounded-lg hover:bg-gray-100 transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
                                </div>
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
                                                {PAYMENT_METHODS.find(p => p.key === sale.paymentMethod)?.label ?? sale.paymentMethod}
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
            {/* Custom Item Modal */}
            {showCustomModal && (
                <div className="fixed inset-0 z-[100] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Свободная сумма</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Название (необязательно)</label>
                                    <input type="text" value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Например: Ремонт оправы"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Сумма (₸) *</label>
                                    <input type="number" value={customPrice} onChange={e => setCustomPrice(e.target.value)} placeholder="0"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all" />
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button onClick={() => { setShowCustomModal(false); setCustomName(''); setCustomPrice(''); }} className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-200 rounded-xl transition-colors">
                                Отмена
                            </button>
                            <button onClick={() => {
                                const price = parseInt(customPrice);
                                if (!price || price <= 0) return;
                                setCart(prev => [...prev, {
                                    productId: `custom_${Date.now()}`,
                                    name: customName.trim() || 'Произвольная позиция',
                                    category: 'Услуга',
                                    type: 'service',
                                    unitPrice: price,
                                    quantity: 1,
                                    maxStock: 999
                                }]);
                                setShowCustomModal(false);
                                setCustomName('');
                                setCustomPrice('');
                            }} disabled={!parseInt(customPrice) || parseInt(customPrice) <= 0} 
                               className="px-5 py-2.5 bg-primary-600 text-white font-bold hover:bg-primary-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                Добавить
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== DEBTS MODAL ==================== */}
            <AnimatePresence>
                {showDebts && (
                    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[5vh] overflow-y-auto" onClick={() => setShowDebts(false)}>
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-md" />
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                            onClick={e => e.stopPropagation()} className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full mb-[5vh] overflow-hidden">
                            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
                                <h2 className="text-lg font-black text-orange-600 flex items-center gap-2"><Wallet className="w-5 h-5"/> Отложенные чеки (Долги)</h2>
                                <button onClick={() => setShowDebts(false)} className="p-1 rounded-lg hover:bg-gray-100 transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
                            </div>
                            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto bg-gray-50/30">
                                {debts.length === 0 ? (
                                    <div className="text-center py-12 text-gray-400">
                                        <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30 text-green-500" />
                                        <p className="text-sm font-bold">Нет неоплаченных долгов!</p>
                                    </div>
                                ) : debts.map((sale: any) => {
                                    const remaining = sale.total - sale.paidAmount;
                                    return (
                                        <div key={sale.id} className="border border-orange-200 rounded-2xl p-5 bg-white hover:border-orange-300 transition-all shadow-sm">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="font-extrabold text-gray-900 text-sm md:text-base">{sale.saleNumber}</span>
                                                <span className="text-lg font-black text-orange-600">{fmt(remaining)} ₸</span>
                                            </div>
                                            <div className="text-[11px] font-bold text-gray-400 mb-3 flex items-center gap-1.5 flex-wrap">
                                                <span>{formatDateTime(sale.createdAt)}</span>
                                                <span>•</span>
                                                {sale.customerName && (
                                                    <>
                                                        <span className="text-gray-600">{sale.customerName}</span>
                                                        <span>•</span>
                                                    </>
                                                )}
                                                <span>Итого: {fmt(sale.total)} ₸ (Оплачено: {fmt(sale.paidAmount)} ₸)</span>
                                            </div>
                                            <div className="text-xs space-y-1 mb-4 border-l-2 border-orange-100 pl-3">
                                                {sale.items?.slice(0,2).map((item: any, i: number) => (
                                                    <div key={i} className="text-gray-500 truncate">{item.name}</div>
                                                ))}
                                                {sale.items?.length > 2 && <div className="text-gray-400">и еще {sale.items.length - 2}...</div>}
                                            </div>
                                            <button onClick={() => setPayDebtModal(sale)} className="w-full py-2.5 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-xl text-xs font-bold transition-all flex justify-center items-center gap-1.5">
                                                <Wallet className="w-4 h-4"/> Принять остаток
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ==================== PAY DEBT MODAL ==================== */}
            <AnimatePresence>
                {payDebtModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setPayDebtModal(null)}>
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-md" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            onClick={e => e.stopPropagation()} className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 md:p-8">
                            <h2 className="text-xl font-extrabold text-gray-900 mb-2">Оплата остатка</h2>
                            <p className="text-sm font-bold text-gray-500 mb-6">Чек {payDebtModal.saleNumber}</p>
                            
                            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5 mb-6 text-center">
                                <p className="text-[11px] font-bold text-orange-600 uppercase tracking-wider mb-1">Сумма к оплате</p>
                                <p className="text-3xl font-black text-orange-700">{fmt(payDebtModal.total - payDebtModal.paidAmount)} ₸</p>
                            </div>

                            <label className="block text-xs font-bold text-gray-700 mb-3">Способ оплаты</label>
                            <div className="grid grid-cols-2 gap-2 mb-8">
                                {[
                                    { key: 'cash', label: 'Наличные', icon: Banknote },
                                    { key: 'card', label: 'Карта', icon: CreditCard },
                                    { key: 'transfer', label: 'Перевод', icon: ArrowRightLeft },
                                    { key: 'kaspi', label: 'Kaspi', icon: Wallet },
                                ].map(pm => (
                                    <button key={pm.key} onClick={() => setDebtPaymentMethod(pm.key)}
                                        className={`flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold border transition-all ${
                                            debtPaymentMethod === pm.key
                                                ? 'bg-orange-50 text-orange-700 border-orange-200 shadow-sm ring-2 ring-orange-500'
                                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                        }`}>
                                        <pm.icon className="w-4 h-4 shrink-0" /> {pm.label}
                                    </button>
                                ))}
                            </div>

                            <div className="flex gap-3">
                                <button onClick={() => setPayDebtModal(null)} className="flex-1 py-3 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all">
                                    Отмена
                                </button>
                                <button onClick={handlePayDebt} disabled={payingDebt} className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md flex justify-center items-center gap-2">
                                    {payingDebt ? 'Загрузка...' : <><CheckCircle className="w-4 h-4"/> Оплатить</>}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
