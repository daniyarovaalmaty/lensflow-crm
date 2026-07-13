'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Save, Trash2, Box, Barcode, CheckCircle, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { translateCyrillicToEnglishLayout } from '@/lib/utils/keyboard-layout';
import { useUsbScanner } from '@/hooks/useUsbScanner';

interface NewSupplyFormProps {
    onSuccess: () => void;
    initialDraft?: any;
}

export default function NewSupplyForm({ onSuccess, initialDraft }: NewSupplyFormProps) {
    const [counterpartyName, setCounterpartyName] = useState(initialDraft?.counterpartyName || '');
    const [documentNumber, setDocumentNumber] = useState(initialDraft?.documentNumber || '');
    const [items, setItems] = useState<any[]>(initialDraft?.items || []);
    
    // Search state
    const [nameSearch, setNameSearch] = useState('');
    const [skuSearch, setSkuSearch] = useState('');
    const [barcodeSearch, setBarcodeSearch] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [qty, setQty] = useState(1);
    const [price, setPrice] = useState<number | string>('');
    const [serials, setSerials] = useState<string[]>([]);
    const [currentSerial, setCurrentSerial] = useState('');
    const serialInputRef = useRef<HTMLInputElement>(null);

    // USB barcode scanner integration — active only when serial product is selected
    const handleUsbScan = useCallback((rawCode: string) => {
        if (!selectedProduct?.trackSerials) return;
        
        const code = translateCyrillicToEnglishLayout(rawCode.trim());
        if (!code) return;
        
        setSerials(prev => {
            if (prev.includes(code)) {
                toast.error(`Штрихкод ${code} уже добавлен`);
                return prev;
            }
            const updated = [...prev, code];
            setQty(updated.length);
            toast.success(`✅ ${code}`);
            return updated;
        });
        setCurrentSerial('');
    }, [selectedProduct]);

    useUsbScanner(handleUsbScan, !!selectedProduct?.trackSerials);

    // Create New Product state
    const [isCreatingProduct, setIsCreatingProduct] = useState(false);
    const [newProductName, setNewProductName] = useState('');
    const [newProductBrand, setNewProductBrand] = useState('');
    const [newProductModel, setNewProductModel] = useState('');
    const [newProductBarcode, setNewProductBarcode] = useState('');
    const [newProductSku, setNewProductSku] = useState('');
    const [newProductDiopters, setNewProductDiopters] = useState('');
    const [newProductPercentage, setNewProductPercentage] = useState('');
    const [newProductExpiration, setNewProductExpiration] = useState('');
    const [newProductImportDate, setNewProductImportDate] = useState('');
    const [newProductProductionDate, setNewProductProductionDate] = useState('');

    const [newProductRefCode, setNewProductRefCode] = useState('');
    const [newProductLot, setNewProductLot] = useState('');
    const [newProductTrackSerials, setNewProductTrackSerials] = useState(false);
    const [newProductBatchSerialNumber, setNewProductBatchSerialNumber] = useState('');
    const [batchSerialNumber, setBatchSerialNumber] = useState('');

    useEffect(() => {
        if (!nameSearch.trim() && !skuSearch.trim() && !barcodeSearch.trim()) {
            setSearchResults([]);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setIsSearching(true);
            try {
                const params = new URLSearchParams();
                if (nameSearch) params.append('name', nameSearch);
                if (skuSearch) params.append('sku', skuSearch);
                if (barcodeSearch) params.append('barcode', barcodeSearch);
                
                const res = await fetch(`/api/distributor/warehouse/products/search?${params.toString()}`);
                if (res.ok) {
                    const data = await res.json();
                    setSearchResults(data.products || []);
                }
            } catch (error) {
                console.error('Failed to search', error);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [nameSearch, skuSearch, barcodeSearch]);

    const handleCreateProduct = async (e?: React.MouseEvent) => {
        if (e) e.preventDefault();
        
        if (!newProductName.trim()) {
            toast.error('Введите название товара');
            return;
        }

        try {
            const res = await fetch('/api/distributor/warehouse/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newProductName,
                    sku: newProductSku,
                    barcode: newProductBarcode,
                    brand: newProductBrand,
                    model: newProductModel,
                    diopters: newProductDiopters,
                    percentage: newProductPercentage,
                    expirationDate: newProductExpiration,
                    importDate: newProductImportDate,
                    productionDate: newProductProductionDate,

                    refCode: newProductRefCode,
                    lot: newProductLot,
                    trackSerials: newProductTrackSerials,
                    batchSerialNumber: newProductTrackSerials ? newProductBatchSerialNumber : ''
                })
            });

            if (!res.ok) throw new Error('Failed to create product');
            const data = await res.json();
            
            toast.success('Товар успешно создан!');
            setSelectedProduct(data.product);
            setIsCreatingProduct(false);
            setSearchResults([]);
            setNewProductName('');
            setNewProductBarcode('');
            setNewProductSku('');
            setNewProductBrand('');
            setNewProductModel('');
            setNewProductDiopters('');
            setNewProductPercentage('');
            setNewProductExpiration('');
            setNewProductImportDate('');
            setNewProductProductionDate('');

            setNewProductRefCode('');
            setNewProductLot('');
            setBatchSerialNumber(newProductTrackSerials ? newProductBatchSerialNumber : '');
            setNewProductTrackSerials(false);
            setNewProductBatchSerialNumber('');
            setIsCreatingProduct(false);
        } catch (error) {
            toast.error('Ошибка создания товара');
        }
    };

    const handleAddSerial = () => {
        if (!currentSerial.trim()) return;
        
        const code = translateCyrillicToEnglishLayout(currentSerial.trim());
        setSerials(prev => {
            if (prev.includes(code)) {
                toast.error('Этот серийный номер уже добавлен');
                return prev;
            }
            const updated = [...prev, code];
            setQty(updated.length);
            return updated;
        });
        setCurrentSerial('');
        // Auto-refocus for continuous scanning
        setTimeout(() => serialInputRef.current?.focus(), 0);
    };

    const handleAddItem = () => {
        if (!selectedProduct) return;
        
        let finalSerials = [...serials];
        if (selectedProduct.trackSerials && currentSerial.trim()) {
            if (!finalSerials.includes(currentSerial.trim())) {
                finalSerials.push(currentSerial.trim());
            }
        }
        
        const newItem = {
            productId: selectedProduct.id,
            name: selectedProduct.name,
            qty: selectedProduct.trackSerials ? finalSerials.length : qty,
            price: Number(price) || 0,
            trackSerials: selectedProduct.trackSerials,
            serialNumbers: selectedProduct.trackSerials ? finalSerials : [],
            batchSerialNumber: selectedProduct.trackSerials ? batchSerialNumber : '',
        };
        
        if (newItem.qty <= 0) {
            toast.error('Количество должно быть больше нуля (добавьте хотя бы один штрихкод)');
            return;
        }

        setItems([...items, newItem]);
        
        // Reset form
        setSelectedProduct(null);
        setNameSearch('');
        setSkuSearch('');
        setBarcodeSearch('');
        setQty(1);
        setPrice('');
        setSerials([]);
        setCurrentSerial('');
        setBatchSerialNumber('');
    };

    const handleSave = async (status: 'draft' | 'confirmed') => {
        if (!documentNumber) {
            toast.error('Укажите номер накладной');
            return;
        }
        if (items.length === 0) {
            toast.error('Добавьте хотя бы один товар');
            return;
        }

        const totalAmount = items.reduce((acc, item) => acc + (item.qty * item.price), 0);

        try {
            const url = initialDraft?.id 
                ? `/api/distributor/warehouse/documents/${initialDraft.id}`
                : '/api/distributor/warehouse/documents';
                
            const method = initialDraft?.id ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'receipt',
                    status,
                    documentNumber,
                    counterpartyName,
                    items,
                    totalAmount
                })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => null);
                throw new Error(errorData?.error || 'Failed to save document');
            }
            
            toast.success(status === 'draft' ? 'Черновик сохранен' : 'Поставка проведена успешно!');
            onSuccess();
        } catch (error: any) {
            toast.error(error.message || 'Ошибка сохранения');
        }
    };

    return (
        <div className="bg-white">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-gray-900">Оформление новой поставки</h2>
                <div className="space-x-3">
                    <button 
                        onClick={() => handleSave('draft')}
                        className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                    >
                        <Save className="h-4 w-4 mr-2 text-gray-500" />
                        Сохранить черновик
                    </button>
                    <button 
                        onClick={() => handleSave('confirmed')}
                        className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                    >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Провести накладную
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-6 mb-8 border-b pb-8">
                <div className="sm:col-span-3">
                    <label className="block text-sm font-medium leading-6 text-gray-900">Поставщик / Контрагент</label>
                    <div className="mt-2">
                        <input
                            type="text"
                            value={counterpartyName}
                            onChange={(e) => setCounterpartyName(e.target.value)}
                            className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                            placeholder="Название поставщика"
                        />
                    </div>
                </div>
                <div className="sm:col-span-3">
                    <label className="block text-sm font-medium leading-6 text-gray-900">Номер накладной</label>
                    <div className="mt-2">
                        <input
                            type="text"
                            value={documentNumber}
                            onChange={(e) => setDocumentNumber(e.target.value)}
                            className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                            placeholder="№ док-та"
                        />
                    </div>
                </div>
            </div>

            {/* Product Search & Add */}
            <div className="mb-8 p-4 bg-gray-50 rounded-lg ring-1 ring-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Добавление товара в накладную</h3>
                
                {!selectedProduct && !isCreatingProduct ? (
                    <div className="relative">
                        <div className="flex flex-col gap-4">
                            <div className="flex gap-4">
                                <div className="relative flex-1">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <Search className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        value={nameSearch}
                                        onChange={(e) => setNameSearch(e.target.value)}
                                        className="block w-full rounded-md border-0 py-2 pl-10 pr-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                        placeholder="Поиск по названию..."
                                    />
                                </div>
                                <div className="relative flex-1">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <Search className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        value={skuSearch}
                                        onChange={(e) => setSkuSearch(e.target.value)}
                                        className="block w-full rounded-md border-0 py-2 pl-10 pr-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                        placeholder="Поиск по артикулу..."
                                    />
                                </div>
                                <div className="relative flex-1">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <Barcode className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        value={barcodeSearch}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            const hasCyrillic = /[\u0400-\u04FF]/.test(val);
                                            setBarcodeSearch(hasCyrillic ? translateCyrillicToEnglishLayout(val) : val);
                                        }}
                                        className="block w-full rounded-md border-0 py-2 pl-10 pr-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                        placeholder="Поиск по штрихкоду..."
                                    />
                                </div>
                                <button 
                                    onClick={() => {
                                        setNewProductName(nameSearch || '');
                                        setIsCreatingProduct(true);
                                    }}
                                    className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-indigo-600 shadow-sm ring-1 ring-inset ring-indigo-300 hover:bg-indigo-50 whitespace-nowrap"
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Создать новый
                                </button>
                            </div>
                        </div>
                        
                        {/* Search Results Dropdown */}
                        {(nameSearch.trim() || skuSearch.trim() || barcodeSearch.trim()) && (
                            <div className="absolute z-10 mt-1 w-full flex-1 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
                                {isSearching ? (
                                    <div className="p-4 text-sm text-gray-500 text-center">Загрузка...</div>
                                ) : searchResults.length > 0 ? (
                                    <ul className="max-h-60 overflow-auto py-1 text-base sm:text-sm">
                                        {searchResults.map((product) => (
                                            <li
                                                key={product.id}
                                                onClick={() => {
                                                    setSelectedProduct(product);
                                                    setNameSearch('');
                                                    setSkuSearch('');
                                                    setBarcodeSearch('');
                                                }}
                                                className="relative cursor-pointer select-none py-2 pl-3 pr-9 text-gray-900 hover:bg-indigo-50"
                                            >
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <span className="block truncate font-medium">{product.name}</span>
                                                    </div>
                                                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                                                        {product.trackSerials ? 'Серийный' : 'Количественный'}
                                                    </span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="p-4 text-sm text-gray-500 text-center">
                                        Товар не найден. Вы можете <button onClick={() => {setNewProductName(nameSearch || ''); setIsCreatingProduct(true);}} className="text-indigo-600 underline">создать его</button>.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : isCreatingProduct ? (
                    <div className="space-y-4 bg-white p-4 rounded-md ring-1 ring-gray-200">
                        <div className="flex justify-between items-center">
                            <h4 className="text-sm font-medium text-gray-900">Создание нового товара</h4>
                            <button onClick={() => setIsCreatingProduct(false)} className="text-sm text-gray-500 hover:text-gray-700">Отмена</button>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Название товара *</label>
                                <input
                                    type="text"
                                    value={newProductName}
                                    onChange={(e) => setNewProductName(e.target.value)}
                                    className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Штрихкод товара</label>
                                <input
                                    type="text"
                                    value={newProductBarcode}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        const hasCyrillic = /[\u0400-\u04FF]/.test(val);
                                        setNewProductBarcode(hasCyrillic ? translateCyrillicToEnglishLayout(val) : val);
                                    }}
                                    className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
                                    placeholder="Сканируйте общий штрихкод..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Артикул</label>
                                <input
                                    type="text"
                                    value={newProductSku}
                                    onChange={(e) => setNewProductSku(e.target.value)}
                                    className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Бренд</label>
                                <input
                                    type="text"
                                    value={newProductBrand}
                                    onChange={(e) => setNewProductBrand(e.target.value)}
                                    className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Модель</label>
                                <input
                                    type="text"
                                    value={newProductModel}
                                    onChange={(e) => setNewProductModel(e.target.value)}
                                    className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Код референса</label>
                                <input
                                    type="text"
                                    value={newProductRefCode}
                                    onChange={(e) => setNewProductRefCode(e.target.value)}
                                    className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Серийный номер</label>
                                <input
                                    type="text"
                                    value={newProductLot}
                                    onChange={(e) => setNewProductLot(e.target.value)}
                                    className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Диоптрийность</label>
                                <input
                                    type="text"
                                    value={newProductDiopters}
                                    onChange={(e) => setNewProductDiopters(e.target.value)}
                                    className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Процентажность</label>
                                <input
                                    type="text"
                                    value={newProductPercentage}
                                    onChange={(e) => setNewProductPercentage(e.target.value)}
                                    className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Срок годности</label>
                                <input
                                    type="date"
                                    value={newProductExpiration}
                                    onChange={(e) => setNewProductExpiration(e.target.value)}
                                    className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Дата производства</label>
                                <input
                                    type="date"
                                    value={newProductProductionDate}
                                    onChange={(e) => setNewProductProductionDate(e.target.value)}
                                    className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Дата импорта</label>
                                <input
                                    type="date"
                                    value={newProductImportDate}
                                    onChange={(e) => setNewProductImportDate(e.target.value)}
                                    className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
                                />
                            </div>

                            <div className="sm:col-span-2 flex items-center">
                                <input
                                    id="trackSerials"
                                    type="checkbox"
                                    checked={newProductTrackSerials}
                                    onChange={(e) => setNewProductTrackSerials(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                />
                                <label htmlFor="trackSerials" className="ml-2 block text-sm text-gray-900">
                                    Вести серийный учет для этого товара (каждая единица имеет уникальный штрихкод)
                                </label>
                            </div>
                            
                            {newProductTrackSerials && (
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Серийный номер партии</label>
                                    <input
                                        type="text"
                                        value={newProductBatchSerialNumber}
                                        onChange={(e) => setNewProductBatchSerialNumber(e.target.value)}
                                        className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
                                        placeholder="Например, L-10294"
                                    />
                                </div>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={handleCreateProduct}
                            className="inline-flex justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 w-full sm:w-auto"
                        >
                            Сохранить и выбрать
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <div className="text-sm font-medium text-gray-900">
                                {selectedProduct.name} 
                                <span className="ml-2 inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                    {selectedProduct.trackSerials ? 'Серийный учет' : 'Количественный учет'}
                                </span>
                            </div>
                            <button onClick={() => setSelectedProduct(null)} className="text-sm text-red-600 hover:text-red-500">Выбрать другой</button>
                        </div>
                        
                        <div className="flex gap-4 items-end flex-wrap">
                            {selectedProduct.trackSerials && (
                                <div className="w-48">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Серийный номер партии</label>
                                    <input
                                        type="text"
                                        value={batchSerialNumber}
                                        onChange={(e) => setBatchSerialNumber(e.target.value)}
                                        className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
                                        placeholder="Например, L-10294"
                                    />
                                </div>
                            )}

                            {selectedProduct.trackSerials ? (
                                <div className="flex-1 min-w-[200px]">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Уникальные штрихкоды (сканируйте)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            ref={serialInputRef}
                                            autoFocus
                                            value={currentSerial}
                                            onChange={(e) => setCurrentSerial(translateCyrillicToEnglishLayout(e.target.value))}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddSerial()}
                                            className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
                                            placeholder="Сканируйте штрихкод..."
                                        />
                                        <button onClick={handleAddSerial} className="px-3 py-1.5 bg-gray-100 border rounded hover:bg-gray-200">
                                            <Barcode className="h-4 w-4" />
                                        </button>
                                    </div>
                                    {serials.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {serials.map(sn => (
                                                <span key={sn} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 bg-gray-100 rounded text-gray-600 text-xs font-medium">
                                                    {sn}
                                                    <button 
                                                        onClick={() => {
                                                            setSerials(prev => {
                                                                const updated = prev.filter(s => s !== sn);
                                                                setQty(updated.length);
                                                                return updated;
                                                            });
                                                        }}
                                                        className="text-gray-400 hover:text-red-500 p-0.5"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="w-32">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Количество</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={qty}
                                        onChange={(e) => setQty(Number(e.target.value))}
                                        className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
                                    />
                                </div>
                            )}

                            <div className="w-40">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Цена закупки (₸)</label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={price}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-9.]/g, '');
                                        setPrice(val === '' ? '' : val);
                                    }}
                                    className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
                                />
                            </div>

                            <button
                                onClick={handleAddItem}
                                className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 mb-[2px]"
                            >
                                <Plus className="h-4 w-4 mr-1" />
                                Добавить
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Added Items Table */}
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Товар</th>
                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Учет</th>
                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Кол-во</th>
                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Цена закупки</th>
                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Сумма</th>
                            <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {items.map((item, idx) => (
                            <tr key={idx}>
                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                    {item.name}
                                    {item.trackSerials && (
                                        <div className="mt-1 text-xs text-gray-500 flex gap-1 flex-wrap">
                                            {item.serialNumbers.map((sn: string) => (
                                                <span key={sn} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 bg-gray-100 rounded text-gray-600">
                                                    {sn}
                                                    <button 
                                                        onClick={() => {
                                                            const updatedItems = [...items];
                                                            const updatedSerials = updatedItems[idx].serialNumbers.filter((s: string) => s !== sn);
                                                            if (updatedSerials.length === 0) {
                                                                updatedItems.splice(idx, 1);
                                                            } else {
                                                                updatedItems[idx].serialNumbers = updatedSerials;
                                                                updatedItems[idx].qty = updatedSerials.length;
                                                            }
                                                            setItems(updatedItems);
                                                        }}
                                                        className="text-gray-400 hover:text-red-500 p-0.5"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                    {item.trackSerials ? <Barcode className="h-4 w-4 text-indigo-500" /> : <Box className="h-4 w-4 text-gray-400" />}
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{item.qty}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{item.price.toLocaleString()} ₸</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 font-medium">{(item.qty * item.price).toLocaleString()} ₸</td>
                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                    <button 
                                        onClick={() => setItems(items.filter((_, i) => i !== idx))}
                                        className="text-red-600 hover:text-red-900"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {items.length === 0 && (
                            <tr>
                                <td colSpan={6} className="py-8 text-center text-sm text-gray-500">
                                    В накладную пока не добавлены товары
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
