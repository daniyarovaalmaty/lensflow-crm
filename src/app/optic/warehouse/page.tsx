'use client';

import { useState, useEffect, useMemo, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Plus, Search, X, ArrowDownToLine, ArrowUpFromLine, FileText, Clock, AlertTriangle, Trash2, BarChart3, ChevronDown, Glasses, Eye, Droplets, ShoppingBag, Wrench, Hash, Download, ArrowLeft, Upload, Banknote, CheckCircle, Printer, Sparkles, Camera, Pencil } from 'lucide-react';
import Link from 'next/link';
import { formatDate, formatDateTime } from '@/lib/dateUtils';
import { getEffectiveClinicPermissions } from '@/types/user';
import AccessDenied from '@/components/ui/AccessDenied';
import { BarcodeScanner } from '@/components/scanner/BarcodeScanner';

// ==================== Types ====================
interface Product {
    id: string; name: string; category: string; brand: string | null;
    sku: string | null; barcode?: string | null; currentStock: number; minStock: number; unit: string;
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
const MOVEMENT_TYPES: Record<string, { label: string; color: string; icon: ReactNode }> = {
    receipt: { label: 'Приход', color: 'text-green-700 bg-green-50', icon: <Download className="w-4 h-4" /> },
    sale: { label: 'Продажа', color: 'text-blue-700 bg-blue-50', icon: <Banknote className="w-4 h-4" /> },
    write_off: { label: 'Списание', color: 'text-red-700 bg-red-50', icon: null },
    return_in: { label: 'Возврат (от покупателя)', color: 'text-amber-700 bg-amber-50', icon: '↩️' },
    return_out: { label: 'Возврат поставщику', color: 'text-orange-700 bg-orange-50', icon: <Upload className="w-4 h-4" /> },
    adjustment: { label: 'Корректировка', color: 'text-purple-700 bg-purple-50', icon: null },
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

    // permissions visibility check
    const clinicPerms = session?.user ? getEffectiveClinicPermissions({
        subRole: session.user.subRole,
        permissions: session.user.permissions,
    }) : null;

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

    // Edit Document State
    const [editingDoc, setEditingDoc] = useState<StockDoc | null>(null);
    const [editDocNum, setEditDocNum] = useState('');
    const [editSupplier, setEditSupplier] = useState('');
    const [editNotes, setEditNotes] = useState('');
    const [editItems, setEditItems] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);

    // Write-off modal
    const [showWriteOff, setShowWriteOff] = useState(false);
    const [woProduct, setWoProduct] = useState('');
    const [woQty, setWoQty] = useState('1');
    const [woReason, setWoReason] = useState('');

    // Batch Print state
    const [printBatchItems, setPrintBatchItems] = useState<Array<{
        name: string; brand: string | null; barcode: string | null; sku: string | null;
        retailPrice: number; quantity: number;
    }>>([]);
    const [showBatchPrintSettings, setShowBatchPrintSettings] = useState(false);
    const [labelWidth, setLabelWidth] = useState(58); // default 58mm
    const [labelHeight, setLabelHeight] = useState(30); // default 30mm
    const [includePrice, setIncludePrice] = useState(true);
    const [includeBrand, setIncludeBrand] = useState(true);

    const [showScanner, setShowScanner] = useState(false);
    const [scannerMode, setScannerMode] = useState<'search' | 'receive' | 'writeoff'>('search');

    const handleScanResult = (code: string) => {
        // Find product matching code (either by barcode or sku)
        const found = products.find(p => p.sku === code || p.barcode === code);
        if (!found) {
            alert(`⚠️ Товар с кодом или артикулом "${code}" не найден в системе.`);
            return;
        }

        if (scannerMode === 'search') {
            setSearch(code);
            setShowScanner(false);
        } else if (scannerMode === 'writeoff') {
            setWoProduct(found.id);
            alert(`✅ Товар выбран для списания: ${found.name}`);
            setShowScanner(false);
        } else if (scannerMode === 'receive') {
            // Append to receive items or increment if already exists
            const existingIdx = receiveItems.findIndex(ri => ri.productId === found.id);
            if (existingIdx > -1) {
                const updated = [...receiveItems];
                const newQty = (Number(updated[existingIdx].quantity) || 0) + 1;
                updated[existingIdx].quantity = String(newQty);
                setReceiveItems(updated);
            } else {
                setReceiveItems(prev => [
                    ...prev,
                    {
                        productId: found.id,
                        quantity: '1',
                        serialMode: 'auto',
                        manualSerials: '',
                        purchasePrice: String(found.purchasePrice),
                        color: '',
                        size: '',
                    }
                ]);
            }
            alert(`✅ Товар добавлен в приходную накладную: ${found.name} (1 шт.)`);
        }
    };

    const handlePrintBatch = (
        items: Array<{ name: string; brand: string | null; barcode: string | null; sku: string | null; retailPrice: number; quantity: number }>,
        widthMm: number = 58,
        heightMm: number = 30,
        incPrice: boolean = true,
        incBrand: boolean = true
    ) => {
        // Flatten the items according to their quantities to get the final array of stickers
        const labelList: any[] = [];
        items.forEach(item => {
            const barcodeToPrint = item.barcode || item.sku;
            if (!barcodeToPrint) return; // skip if no barcode or SKU
            
            for (let i = 0; i < item.quantity; i++) {
                labelList.push({
                    name: item.name,
                    brand: item.brand,
                    barcode: barcodeToPrint,
                    retailPrice: item.retailPrice
                });
            }
        });

        if (labelList.length === 0) {
            alert('⚠️ Нет товаров со штрихкодами или артикулами для печати.');
            return;
        }

        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);

        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) {
            alert('Ошибка инициализации печати');
            document.body.removeChild(iframe);
            return;
        }

        // Write content
        const labelsHtml = labelList.map((label, idx) => `
            <div class="label-container">
                ${incBrand ? `<div class="brand">${label.brand || 'ОПТИКА'}</div>` : ''}
                <div class="name">${label.name}</div>
                <svg id="barcode-${idx}"></svg>
                ${incPrice ? `<div class="price">${label.retailPrice.toLocaleString('ru-RU')} ₸</div>` : ''}
            </div>
        `).join('');

        iframeDoc.write(`
            <html>
                <head>
                    <title>Печать партии</title>
                    <style>
                        @page {
                            size: ${widthMm}mm ${heightMm}mm;
                            margin: 0;
                        }
                        html, body {
                            margin: 0;
                            padding: 0;
                            background: white;
                        }
                        .label-container {
                            width: ${widthMm}mm;
                            height: ${heightMm}mm;
                            page-break-after: always;
                            break-after: page;
                            box-sizing: border-box;
                            padding: 2mm;
                            display: flex;
                            flex-direction: column;
                            justify-content: space-between;
                            align-items: center;
                            overflow: hidden;
                        }
                        .label-container:last-child {
                            page-break-after: avoid;
                            break-after: avoid;
                        }
                        .brand {
                            font-size: ${heightMm > 25 ? '8px' : '6px'};
                            font-weight: bold;
                            text-transform: uppercase;
                            color: #555;
                            margin-bottom: 1px;
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            width: 100%;
                            text-align: center;
                        }
                        .name {
                            font-size: ${heightMm > 25 ? '9px' : '7.5px'};
                            font-weight: bold;
                            color: black;
                            text-align: center;
                            line-height: 1.1;
                            height: 2.2em;
                            overflow: hidden;
                            width: 100%;
                            display: -webkit-box;
                            -webkit-line-clamp: 2;
                            -webkit-box-orient: vertical;
                        }
                        .price {
                            font-size: ${heightMm > 25 ? '11px' : '9px'};
                            font-weight: 900;
                            color: black;
                            margin-top: 1px;
                        }
                        svg {
                            width: 100%;
                            max-height: ${heightMm - 19}mm;
                        }
                    </style>
                    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
                </head>
                <body>
                    ${labelsHtml}
                </body>
            </html>
        `);
        iframeDoc.close();

        let printed = false;
        const triggerPrint = () => {
            if (printed) return;
            try {
                const win = iframe.contentWindow as any;
                if (!win) return;
                
                if (win.JsBarcode) {
                    labelList.forEach((label, idx) => {
                        win.JsBarcode(`#barcode-${idx}`, label.barcode, {
                            format: "CODE128",
                            width: widthMm > 45 ? 1.2 : 0.9,
                            height: heightMm > 25 ? 30 : 18,
                            displayValue: heightMm > 25,
                            fontSize: 8,
                            margin: 0
                        });
                    });
                    printed = true;
                }
                
                setTimeout(() => {
                    try {
                        win.focus();
                        win.print();
                    } catch (e) {
                        console.error('Focus/print failed:', e);
                    }
                }, 200);
            } catch (e) {
                console.error('Print trigger failed:', e);
            }
        };

        iframe.onload = triggerPrint;
        setTimeout(triggerPrint, 800);

        setTimeout(() => {
            if (iframe && iframe.parentNode) {
                document.body.removeChild(iframe);
            }
        }, 8000);
    };

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
                alert(`🎉 Приход оформлен: ${result.document.documentNumber}\n${result.serialNumbers?.length ? `Серийные номера: ${result.serialNumbers.join(', ')}` : ''}`);
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
                alert(' Списание оформлено');
                setShowWriteOff(false);
                setWoProduct(''); setWoQty('1'); setWoReason('');
                loadData();
            }
        } finally { setSaving(false); }
    };

    const handleUpdateDocument = async () => {
        if (!editingDoc) return;
        setSaving(true);
        try {
            const res = await fetch('/api/optic/stock', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editingDoc.id,
                    documentNumber: editDocNum,
                    counterpartyName: editSupplier,
                    notes: editNotes,
                    items: editItems
                })
            });
            if (res.ok) {
                alert('🎉 Накладная успешно обновлена');
                setEditingDoc(null);
                loadData();
            } else {
                const data = await res.json();
                alert(`❌ Ошибка: ${data.error || 'Не удалось обновить накладную'}`);
            }
        } catch (err) {
            console.error(err);
            alert('❌ Ошибка сети при обновлении накладной');
        } finally {
            setSaving(false);
        }
    };

    const filteredProducts = useMemo(() => {
        if (!search) return products;
        const s = search.toLowerCase();
        return products.filter(p => p.name.toLowerCase().includes(s) || p.sku?.toLowerCase().includes(s));
    }, [products, search]);

    const lowStockProducts = useMemo(() => {
        return products.filter(p => p.minStock > 0 && (p._count?.stockItems ?? p.currentStock) <= p.minStock);
    }, [products]);

    // ---- Excel export ----
    const exportExcel = () => {
        const header = 'Товар\tБренд\tАртикул\tОстаток\tЕд.\tМин.\tЗакуп. цена\tРозн. цена\tСтоимость на складе\tСерийные';
        const rows = products.map(p => {
            const stock = p._count?.stockItems ?? p.currentStock;
            return [
                p.name, p.brand || '', p.sku || '', stock, p.unit, p.minStock,
                p.purchasePrice, p.retailPrice, stock * p.retailPrice,
                p.trackSerials ? 'Да' : 'Нет'
            ].join('\t');
        });
        const csv = '\uFEFF' + header + '\n' + rows.join('\n');
        const blob = new Blob([csv], { type: 'text/tab-separated-values;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Остатки_склада_${new Date().toISOString().slice(0,10)}.xls`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // ---- Low stock items ----
    if (session?.user && clinicPerms && !clinicPerms.canViewWarehouse) {
        return <AccessDenied />;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <Link href="/optic/dashboard" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-primary-600 mb-1">
                                <ArrowLeft className="w-3 h-3" /> Назад
                            </Link>
                            <h1 className="text-2xl font-bold text-gray-900">Склад</h1>
                            <p className="text-sm text-gray-500 mt-1">Управление товарными запасами</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={exportExcel}
                                className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-sm font-medium transition-colors">
                                <Download className="w-4 h-4" /> Excel
                            </button>
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

                    {/* Low stock alert */}
                    {lowStockProducts.length > 0 && (
                        <div className="mb-4 bg-red-50 border border-red-100 rounded-xl p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                                <span className="text-sm font-semibold text-red-700">Товары с низким остатком ({lowStockProducts.length})</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {lowStockProducts.map(p => (
                                    <span key={p.id} className="px-2 py-1 bg-white rounded-lg text-xs text-red-600 border border-red-100">
                                        {p.name}: <strong>{p._count?.stockItems ?? p.currentStock}</strong> {p.unit} (мин. {p.minStock})
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

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
                        <div className="flex gap-2 mb-4">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input type="text" placeholder="Поиск по названию, артикулу..."
                                    value={search} onChange={e => setSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500" />
                            </div>
                            <button 
                                onClick={() => { setScannerMode('search'); setShowScanner(true); }}
                                className="flex items-center justify-center p-3 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl transition-all"
                                title="Сканировать штрихкод товара"
                            >
                                <Camera className="w-4 h-4 text-primary-600" />
                            </button>
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
                                            <th className="text-right px-4 py-3 font-medium text-gray-500 w-16">Печать</th>
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
                                                    <td className="px-4 py-3 text-right">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setPrintBatchItems([{
                                                                    name: p.name,
                                                                    brand: p.brand,
                                                                    barcode: p.barcode || null,
                                                                    sku: p.sku,
                                                                    retailPrice: p.retailPrice,
                                                                    quantity: 1
                                                                }]);
                                                                setShowBatchPrintSettings(true);
                                                            }}
                                                            title="Печать этикетки"
                                                            className="p-1.5 hover:bg-gray-50 rounded-xl text-gray-500 hover:text-primary-600 transition-colors inline-flex items-center justify-center border border-transparent hover:border-gray-200/50 active:scale-95"
                                                        >
                                                            <Printer className="w-3.5 h-3.5" />
                                                        </button>
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
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <ArrowDownToLine className="w-5 h-5 text-green-600" /> Приходная накладная
                                </h2>
                                <button 
                                    onClick={() => { setScannerMode('receive'); setShowScanner(true); }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-xs font-bold transition-all"
                                >
                                    <Camera className="w-3.5 h-3.5 text-primary-500" /> Сканировать линзу
                                </button>
                            </div>

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
                                {saving ? (
                                    'Оформление...'
                                ) : (
                                    <span className="flex items-center justify-center gap-1.5">
                                        <CheckCircle className="w-4 h-4" />
                                        Оформить приход
                                    </span>
                                )}
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
                                    const mt = MOVEMENT_TYPES[m.type] || { label: m.type, color: 'text-gray-700 bg-gray-50', icon: <Package className="w-4 h-4" /> };
                                    return (
                                        <div key={m.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-4">
                                            <div className="text-gray-500 bg-gray-50 p-2 rounded-lg flex items-center justify-center min-w-8 min-h-8">{mt.icon}</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${mt.color}`}>{mt.label}</span>
                                                    <span className="font-medium text-gray-900 text-sm truncate">{m.product.name}</span>
                                                </div>
                                                <div className="text-xs text-gray-400 mt-0.5">
                                                    {m.documentNumber && <span className="mr-2"><FileText className="w-6 h-6 inline mr-1" /> {m.documentNumber}</span>}
                                                    {m.supplier && <span className="mr-2"> {m.supplier}</span>}
                                                    {m.reason && <span className="mr-2"> {m.reason}</span>}
                                                    {m.performedByName && <span> {m.performedByName}</span>}
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
                                            <div className="text-xs text-gray-400 mt-1"> {doc.performedByName}</div>
                                        )}
                                        {doc.type === 'receipt' && (
                                            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingDoc(doc);
                                                        setEditDocNum(doc.documentNumber);
                                                        setEditSupplier(doc.counterpartyName || '');
                                                        setEditNotes(doc.notes || '');
                                                        setEditItems(JSON.parse(JSON.stringify(doc.items)));
                                                    }}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl text-xs font-semibold transition-colors active:scale-95"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" /> Редактировать
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const batch = (doc.items as any[]).map(it => {
                                                            const prod = products.find(p => p.id === it.productId);
                                                            return {
                                                                name: it.name,
                                                                brand: prod?.brand || null,
                                                                barcode: prod?.barcode || null,
                                                                sku: prod?.sku || null,
                                                                retailPrice: it.price || prod?.retailPrice || 0,
                                                                quantity: it.qty || 1
                                                            };
                                                        });
                                                        setPrintBatchItems(batch);
                                                        setShowBatchPrintSettings(true);
                                                    }}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-xl text-xs font-semibold transition-colors active:scale-95"
                                                >
                                                    <Printer className="w-3.5 h-3.5" /> Печать этикеток партии ({doc.items.reduce((acc, it) => acc + (it.qty || 1), 0)} шт)
                                                </button>
                                            </div>
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
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-gray-900">Списание товара</h2>
                                <button 
                                    onClick={() => { setScannerMode('writeoff'); setShowScanner(true); }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-250 text-gray-600 hover:bg-gray-50 rounded-xl text-xs font-bold transition-all"
                                >
                                    <Camera className="w-3.5 h-3.5 text-red-500" /> Сканировать штрихкод
                                </button>
                            </div>
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

            {/* ==================== BATCH PRINT SETTINGS MODAL ==================== */}
            <AnimatePresence>
                {showBatchPrintSettings && printBatchItems.length > 0 && (
                    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[8vh] overflow-y-auto" onClick={() => setShowBatchPrintSettings(false)}>
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-md" />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 30 }}
                            onClick={e => e.stopPropagation()}
                            className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100"
                        >
                            {/* Sticky Header */}
                            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
                                <div>
                                    <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                                        <Printer className="w-5 h-5 text-primary-600 animate-pulse" /> Пакетная печать этикеток
                                    </h2>
                                    <p className="text-[11px] text-gray-500 mt-0.5">
                                        Всего к печати: {printBatchItems.reduce((acc, it) => acc + it.quantity, 0)} шт
                                    </p>
                                </div>
                                <button onClick={() => setShowBatchPrintSettings(false)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center">
                                    <X className="w-4 h-4 text-gray-500" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                                {/* Label Live Preview */}
                                <div className="flex flex-col items-center justify-center p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200/80 mb-2">
                                    <span className="text-[9px] font-bold text-gray-400 mb-3 uppercase tracking-widest">Макет этикетки (Интерактивный)</span>
                                    
                                    {/* The interactive label container */}
                                    <div
                                        style={{
                                            width: '260px',
                                            height: `${Math.max(70, Math.round(260 * (labelHeight / labelWidth)))}px`,
                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        }}
                                        className="bg-white border border-gray-300 rounded shadow-lg p-3 flex flex-col justify-between items-center overflow-hidden box-border select-none relative"
                                    >
                                        {includeBrand && (
                                            <div className="text-[9px] font-black text-gray-500 uppercase tracking-wide truncate w-full text-center">
                                                {printBatchItems[0].brand || 'ОПТИКА'}
                                            </div>
                                        )}
                                        <div className="text-[10px] font-bold text-black text-center line-clamp-2 leading-tight w-full my-0.5">
                                            {printBatchItems[0].name}
                                        </div>
                                        
                                        {/* Simulated Barcode */}
                                        <div className="w-full flex flex-col items-center justify-center my-1">
                                            <div className="w-[85%] h-5 flex justify-between items-stretch">
                                                {[1,3,2,1,4,2,1,3,2,1,4,1,2,3,1,2,1,4,2,1,3,2,1,2].map((w, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="bg-black"
                                                        style={{
                                                            width: `${w * 0.7}px`,
                                                            opacity: idx % 2 === 0 ? 1 : 0
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                            {labelHeight > 25 && (
                                                <div className="text-[7.5px] font-mono text-gray-700 mt-0.5 tracking-[1.5px]">
                                                    {printBatchItems[0].barcode || printBatchItems[0].sku || '1234567890'}
                                                </div>
                                            )}
                                        </div>

                                        {includePrice && (
                                            <div className="text-xs font-black text-black tracking-tight">
                                                {printBatchItems[0].retailPrice?.toLocaleString('ru-RU')} ₸
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-gray-500 mt-3 font-semibold">Размер на печати: {labelWidth} x {labelHeight} мм</span>
                                </div>

                                {/* Size selection */}
                                <div className="space-y-3">
                                    <label className="block text-sm font-semibold text-gray-900">1. Выберите стандартный размер или укажите свой:</label>
                                    
                                    {/* Presets */}
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { w: 58, h: 30, label: '58 x 30 мм' },
                                            { w: 40, h: 30, label: '40 x 30 мм' },
                                            { w: 30, h: 20, label: '30 x 20 мм' },
                                        ].map((preset, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => {
                                                    setLabelWidth(preset.w);
                                                    setLabelHeight(preset.h);
                                                }}
                                                className={`py-2 px-1 text-center rounded-xl text-xs font-medium border transition-all ${
                                                    labelWidth === preset.w && labelHeight === preset.h
                                                        ? 'bg-primary-50 border-primary-500 text-primary-700 ring-1 ring-primary-500 shadow-sm'
                                                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                                }`}
                                            >
                                                {preset.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Custom inputs */}
                                    <div className="grid grid-cols-2 gap-3 pt-1">
                                        <div>
                                            <span className="block text-[11px] text-gray-400 font-medium mb-1">Ширина (мм)</span>
                                            <input
                                                type="number"
                                                value={labelWidth}
                                                onChange={e => setLabelWidth(Math.max(15, Number(e.target.value)))}
                                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent font-medium"
                                                placeholder="58"
                                            />
                                        </div>
                                        <div>
                                            <span className="block text-[11px] text-gray-400 font-medium mb-1">Высота (мм)</span>
                                            <input
                                                type="number"
                                                value={labelHeight}
                                                onChange={e => setLabelHeight(Math.max(10, Number(e.target.value)))}
                                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent font-medium"
                                                placeholder="30"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Custom Toggles */}
                                <div className="space-y-2.5 pt-1">
                                    <label className="block text-sm font-semibold text-gray-900">2. Дополнительные опции:</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <label className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl cursor-pointer transition-colors border border-gray-100">
                                            <input
                                                type="checkbox"
                                                checked={includeBrand}
                                                onChange={e => setIncludeBrand(e.target.checked)}
                                                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                            />
                                            <div>
                                                <span className="text-xs font-semibold text-gray-800">Выводить бренд</span>
                                            </div>
                                        </label>
                                        <label className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl cursor-pointer transition-colors border border-gray-100">
                                            <input
                                                type="checkbox"
                                                checked={includePrice}
                                                onChange={e => setIncludePrice(e.target.checked)}
                                                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                            />
                                            <div>
                                                <span className="text-xs font-semibold text-gray-800">Выводить цену</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                {/* Batch items preview list */}
                                <div className="space-y-2 pt-1">
                                    <span className="block text-sm font-semibold text-gray-900">3. Содержимое партии печати:</span>
                                    <div className="border border-gray-100 rounded-2xl overflow-hidden max-h-[160px] overflow-y-auto bg-gray-50/50 p-2 space-y-1.5">
                                        {printBatchItems.map((item, idx) => {
                                            const code = item.barcode || item.sku;
                                            return (
                                                <div key={idx} className="bg-white rounded-xl p-2.5 border border-gray-200/50 flex items-center justify-between text-xs">
                                                    <div className="truncate max-w-[70%]">
                                                        <span className="font-semibold text-gray-900 block truncate">{item.name}</span>
                                                        <span className="text-[10px] text-gray-400 font-mono">Код: {code || 'отсутствует'}</span>
                                                    </div>
                                                    <div className="text-right whitespace-nowrap">
                                                        <span className="font-bold text-gray-900 block">{item.quantity} шт</span>
                                                        <span className="text-[10px] text-gray-400">{item.retailPrice.toLocaleString('ru-RU')} ₸</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Sticky Footer */}
                            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3 z-10">
                                <button
                                    onClick={() => setShowBatchPrintSettings(false)}
                                    className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                    Отмена
                                </button>
                                <button
                                    onClick={() => {
                                        handlePrintBatch(printBatchItems, labelWidth, labelHeight, includePrice, includeBrand);
                                        setShowBatchPrintSettings(false);
                                    }}
                                    className="flex-1 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-md shadow-primary-100"
                                >
                                    <Printer className="w-4 h-4" /> Распечатать ({printBatchItems.reduce((acc, it) => acc + it.quantity, 0)} шт)
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ==================== EDIT STOCK DOCUMENT MODAL ==================== */}
            <AnimatePresence>
                {editingDoc && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditingDoc(null)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col z-10"
                        >
                            {/* Sticky Header */}
                            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10 rounded-t-2xl">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Редактирование накладной</h2>
                                    <p className="text-xs text-gray-500">{editingDoc.documentNumber} • {DOC_TYPES[editingDoc.type] || editingDoc.type}</p>
                                </div>
                                <button
                                    onClick={() => setEditingDoc(null)}
                                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors active:scale-95"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">Номер накладной *</label>
                                        <input
                                            type="text"
                                            value={editDocNum}
                                            onChange={e => setEditDocNum(e.target.value)}
                                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                                            placeholder="ПН-0001"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">Поставщик</label>
                                        <input
                                            type="text"
                                            value={editSupplier}
                                            onChange={e => setEditSupplier(e.target.value)}
                                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                                            placeholder="Например, Kwon Danyang"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Примечания</label>
                                    <textarea
                                        value={editNotes}
                                        onChange={e => setEditNotes(e.target.value)}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 resize-none"
                                        placeholder="Комментарий..."
                                        rows={2}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <span className="block text-xs font-semibold text-gray-500">Товары накладной:</span>
                                    <div className="border border-gray-100 rounded-2xl overflow-hidden bg-gray-50/50 p-3 space-y-2">
                                        {editItems.map((item, idx) => (
                                            <div key={idx} className="bg-white rounded-xl p-3 border border-gray-200 flex flex-col gap-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-gray-900 text-sm">{item.name}</span>
                                                    <button
                                                        onClick={() => setEditItems(editItems.filter((_, i) => i !== idx))}
                                                        className="text-red-500 hover:text-red-700 transition-colors text-xs flex items-center gap-1 font-semibold"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" /> Удалить
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-[10px] font-semibold text-gray-400 mb-1">Количество *</label>
                                                        <input
                                                            type="number"
                                                            value={item.qty}
                                                            onChange={e => {
                                                                const updated = [...editItems];
                                                                updated[idx].qty = Math.max(1, Number(e.target.value) || 1);
                                                                setEditItems(updated);
                                                            }}
                                                            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-primary-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-semibold text-gray-400 mb-1">Закупочная цена (₸)</label>
                                                        <input
                                                            type="number"
                                                            value={item.price}
                                                            onChange={e => {
                                                                const updated = [...editItems];
                                                                updated[idx].price = Math.max(0, Number(e.target.value) || 0);
                                                                setEditItems(updated);
                                                            }}
                                                            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-primary-500"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Sticky Footer */}
                            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3 z-10 rounded-b-2xl">
                                <button
                                    onClick={() => setEditingDoc(null)}
                                    className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                    Отмена
                                </button>
                                <button
                                    onClick={handleUpdateDocument}
                                    disabled={!editDocNum || !editItems.length || saving}
                                    className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-md shadow-green-100"
                                >
                                    {saving ? 'Сохранение...' : 'Сохранить изменения'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
