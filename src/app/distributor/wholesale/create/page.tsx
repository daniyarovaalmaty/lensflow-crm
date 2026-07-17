'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Save, ArrowLeft, Search } from 'lucide-react';
import { useUsbScanner } from '@/hooks/useUsbScanner';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { translateCyrillicToEnglishLayout } from '@/lib/utils/keyboard-layout';

interface Product {
    id: string;
    name: string;
    sku: string;
    barcode: string;
    wholesalePrice: number;
    retailPrice: number;
    currentStock: number;
    stockItems?: any[];
}

interface Counterparty {
    id: string;
    name: string;
}

interface CartItem {
    productId: string;
    stockItemId?: string;
    name: string;
    price: number;
    quantity: number;
    maxStock: number;
    diopter?: string;
    serialNumber?: string;
    expiryDate?: string;
}

export default function CreateWholesaleOrderPage() {
    const router = useRouter();
    const [products, setProducts] = useState<Product[]>([]);
    const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
    
    const [selectedCounterpartyId, setSelectedCounterpartyId] = useState<string>('');
    const [notes, setNotes] = useState('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [scanFeedback, setScanFeedback] = useState<string | null>(null);
    const [manualCode, setManualCode] = useState('');

    // Fetch initial data
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch products
                const prodRes = await fetch('/api/distributor/warehouse/balances');
                if (prodRes.ok) {
                    const data = await prodRes.json();
                    setProducts(data.products || []);
                }

                // Fetch counterparties
                const countRes = await fetch('/api/distributor/counterparties');
                if (countRes.ok) {
                    const countData = await countRes.json();
                    setCounterparties(countData || []);
                }
            } catch (err) {
                console.error('Error fetching data:', err);
                toast.error('Ошибка загрузки данных');
            }
        };
        fetchData();
    }, []);

    const handleScan = useCallback((rawCode: string) => {
        // Очистка от спецсимволов сканера (например DataMatrix ]C1)
        let code = rawCode.trim().replace(/^\]C1/, '');
        code = translateCyrillicToEnglishLayout(code);

        let foundProduct: Product | undefined;
        let foundStockItem: any = undefined;

        // Try finding by stock item first
        for (const p of products) {
            if (p.stockItems) {
                const si = p.stockItems.find((s: any) => s.serialNumber === code || s.barcode === code);
                if (si) {
                    foundProduct = p;
                    foundStockItem = si;
                    break;
                }
            }
        }

        // Fallback to product barcode/sku
        if (!foundProduct) {
            foundProduct = products.find(p => p.barcode === code || p.sku === code);
        }
        
        if (foundProduct) {
            const maxAvailable = foundStockItem ? foundStockItem.quantity : foundProduct.currentStock;
            
            if (maxAvailable <= 0) {
                toast.error(`Товара ${foundProduct.name} нет на складе`);
                setScanFeedback(`⚠️ ${foundProduct.name} — нет на складе`);
                setTimeout(() => setScanFeedback(null), 3000);
                return;
            }

            const itemKey = foundStockItem ? foundStockItem.id : foundProduct.id;

            setCart(prev => {
                const existing = prev.find(c => (c.stockItemId || c.productId) === itemKey);
                if (existing) {
                    if (existing.quantity >= maxAvailable) {
                        toast.error(`Достигнут максимум остатка для ${foundProduct!.name}`);
                        setScanFeedback(`⚠️ Максимум остатка (${maxAvailable} шт)`);
                        return prev;
                    }
                    setScanFeedback(`✅ ${foundProduct!.name} (${existing.quantity + 1} шт)`);
                    return prev.map(c => (c.stockItemId || c.productId) === itemKey ? { ...c, quantity: c.quantity + 1 } : c);
                } else {
                    setScanFeedback(`✅ ${foundProduct!.name} добавлен`);
                    return [...prev, {
                        productId: foundProduct!.id,
                        stockItemId: foundStockItem?.id,
                        name: foundProduct!.name,
                        price: foundProduct!.wholesalePrice || foundProduct!.retailPrice || 0,
                        quantity: 1,
                        maxStock: maxAvailable,
                        diopter: foundStockItem?.diopters,
                        serialNumber: foundStockItem?.serialNumber,
                        expiryDate: foundStockItem?.expiryDate,
                    }];
                }
            });
            setTimeout(() => setScanFeedback(null), 3000);
        } else {
            toast.error(`Товар со штрихкодом "${code}" не найден`);
            setScanFeedback(`❌ Товар "${code}" не найден`);
            setTimeout(() => setScanFeedback(null), 3000);
        }
    }, [products]);

    useUsbScanner(handleScan);

    const updateQuantity = (itemKey: string, val: number) => {
        setCart(prev => prev.map(item => {
            if ((item.stockItemId || item.productId) === itemKey) {
                let newQty = val;
                if (newQty < 1) newQty = 1;
                if (newQty > item.maxStock) newQty = item.maxStock;
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const updatePrice = (itemKey: string, val: number) => {
        setCart(prev => prev.map(item => {
            if ((item.stockItemId || item.productId) === itemKey) {
                return { ...item, price: val >= 0 ? val : 0 };
            }
            return item;
        }));
    };

    const removeItem = (itemKey: string) => {
        setCart(prev => prev.filter(c => (c.stockItemId || c.productId) !== itemKey));
    };

    const totalSum = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    const handleSaveDraft = async () => {
        if (cart.length === 0) {
            toast.error('Корзина пуста');
            return;
        }

        setIsSaving(true);
        try {
            const res = await fetch('/api/distributor/wholesale', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    counterpartyId: selectedCounterpartyId || null,
                    notes,
                    items: cart.map(item => ({
                        productId: item.productId,
                        stockItemId: item.stockItemId || null,
                        quantity: item.quantity,
                        price: item.price,
                        total: item.price * item.quantity
                    }))
                })
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || 'Ошибка при сохранении заказа');
            }

            const data = await res.json();
            toast.success('Заказ (черновик) успешно создан');
            router.push(`/distributor/wholesale/${data.id}`);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex items-center gap-4 flex-wrap mb-6">
                <Link href="/distributor/wholesale" className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white hover:bg-gray-100 p-2">
                    <ArrowLeft className="w-4 h-4" />
                </Link>
                <h1 className="text-2xl font-bold flex-1">Оформление заказа</h1>
                
                <div className="flex items-center gap-2 max-w-xs w-full bg-white px-3 py-1.5 border rounded-md shadow-sm focus-within:ring-2 focus-within:ring-blue-500">
                    <Search className="w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Ручной ввод штрихкода..."
                        className="w-full bg-transparent border-none focus:outline-none text-sm"
                        value={manualCode}
                        onChange={e => setManualCode(translateCyrillicToEnglishLayout(e.target.value))}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                if (manualCode.trim()) {
                                    handleScan(manualCode.trim());
                                    setManualCode('');
                                }
                            }
                        }}
                    />
                </div>

                <button 
                    onClick={handleSaveDraft} 
                    disabled={isSaving || cart.length === 0}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium disabled:opacity-50 flex items-center gap-2"
                >
                    <Save className="w-4 h-4" />
                    Сохранить черновик
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Col: Cart & Scanning */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white border rounded-lg p-6 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold">Товары в заказе</h2>
                            <div className="text-sm text-gray-500 flex items-center gap-2">
                                <span className="animate-pulse w-2 h-2 rounded-full bg-green-500 block"></span>
                                Сканер активен
                            </div>
                        </div>

                        {scanFeedback && (
                            <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded-md text-center text-lg font-medium animate-pulse">
                                {scanFeedback}
                            </div>
                        )}

                        {cart.length === 0 ? (
                            <div className="text-center p-8 border-2 border-dashed rounded-lg text-gray-500">
                                Пропикайте сканером штрихкод товара, чтобы добавить его в заказ.
                                <br />Сканер работает в фоновом режиме.
                            </div>
                        ) : (
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-4 py-3 font-medium text-gray-500">Наименование</th>
                                        <th className="px-4 py-3 font-medium text-gray-500">Кол-во</th>
                                        <th className="px-4 py-3 font-medium text-gray-500">Цена (₸)</th>
                                        <th className="px-4 py-3 font-medium text-gray-500">Сумма</th>
                                        <th className="px-4 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {cart.map((item) => {
                                        const itemKey = item.stockItemId || item.productId;
                                        return (
                                        <tr key={itemKey} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium">
                                                <div className="flex flex-col">
                                                    <span>{item.name}</span>
                                                    {item.diopter && (
                                                        <span className="text-xs text-gray-500">Диоптрия: {item.diopter}</span>
                                                    )}
                                                    {item.serialNumber && (
                                                        <span className="text-xs text-gray-500">Партия: {item.serialNumber}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <input 
                                                    type="number" 
                                                    className="w-20 px-3 py-1 border rounded" 
                                                    value={item.quantity} 
                                                    onChange={(e) => updateQuantity(itemKey, parseInt(e.target.value) || 1)}
                                                    min={1}
                                                    max={item.maxStock}
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input 
                                                    type="number" 
                                                    className="w-24 px-3 py-1 border rounded" 
                                                    value={item.price} 
                                                    onChange={(e) => updatePrice(itemKey, parseInt(e.target.value) || 0)}
                                                    min={0}
                                                />
                                            </td>
                                            <td className="px-4 py-3 font-semibold">
                                                {(item.price * item.quantity).toLocaleString('ru-RU')}
                                            </td>
                                            <td className="px-4 py-3">
                                                <button onClick={() => removeItem(itemKey)} className="text-red-500 hover:bg-red-50 p-2 rounded">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    )})}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Right Col: Details & Save */}
                <div className="space-y-6">
                    <div className="bg-white border rounded-lg p-6 shadow-sm space-y-4">
                        <h2 className="text-lg font-semibold">Детали заказа</h2>
                        
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Контрагент (Покупатель)</label>
                            <select 
                                className="w-full px-3 py-2 border rounded-md bg-white"
                                value={selectedCounterpartyId} 
                                onChange={(e) => setSelectedCounterpartyId(e.target.value)}
                            >
                                <option value="">Выберите контрагента</option>
                                {counterparties.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Комментарий к заказу</label>
                            <input 
                                type="text"
                                className="w-full px-3 py-2 border rounded-md"
                                placeholder="Дополнительная информация..." 
                                value={notes} 
                                onChange={(e) => setNotes(e.target.value)} 
                            />
                        </div>

                        <div className="pt-4 border-t border-dashed mt-4">
                            <div className="flex justify-between items-center text-xl font-bold">
                                <span>Итого:</span>
                                <span>{totalSum.toLocaleString('ru-RU')} ₸</span>
                            </div>
                        </div>

                        <button 
                            className="w-full mt-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-md font-medium disabled:opacity-50" 
                            onClick={handleSaveDraft}
                            disabled={cart.length === 0 || isSaving}
                        >
                            {isSaving ? 'Сохранение...' : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Сохранить черновик
                                </>
                            )}
                        </button>
                        <p className="text-xs text-center text-gray-500 mt-2">
                            После сохранения черновика вы сможете зарезервировать товар.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
