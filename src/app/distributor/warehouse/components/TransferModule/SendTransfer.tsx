'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Save, Trash2, Box, Barcode, CheckCircle, Search, ChevronDown, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { translateCyrillicToEnglishLayout } from '@/lib/utils/keyboard-layout';
import { useUsbScanner } from '@/hooks/useUsbScanner';

export default function SendTransfer({ onSuccess }: { onSuccess: () => void }) {
    const [organizations, setOrganizations] = useState<any[]>([]);
    const [targetOrgId, setTargetOrgId] = useState('');
    const [documentNumber, setDocumentNumber] = useState('');
    const [items, setItems] = useState<any[]>([]);
    
    // For adding a new item
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [qty, setQty] = useState(1);
    const [serials, setSerials] = useState<string[]>([]);
    const [currentSerial, setCurrentSerial] = useState('');
    const serialInputRef = useRef<HTMLInputElement>(null);

    const [isTargetOrgOpen, setIsTargetOrgOpen] = useState(false);
    const [targetOrgSearch, setTargetOrgSearch] = useState('');
    const targetOrgRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (targetOrgRef.current && !targetOrgRef.current.contains(event.target as Node)) {
                setIsTargetOrgOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // USB scanner for auto-scanning batch barcodes during transfers
    const handleUsbScan = useCallback((rawCode: string) => {
        if (!selectedProduct?.trackSerials) return;
        const code = translateCyrillicToEnglishLayout(rawCode.trim());
        if (!code) return;
        setCurrentSerial(code);
        toast.success(`Партия выбрана: ${code}`);
    }, [selectedProduct]);

    useUsbScanner(handleUsbScan, !!selectedProduct?.trackSerials);

    useEffect(() => {
        fetchOrganizations();
    }, []);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }
        const delayDebounceFn = setTimeout(async () => {
            setIsSearching(true);
            try {
                // Since this is a transfer, we only want products in balance.
                // We'll reuse the balances API but filter locally, or we could add a ?q parameter to it.
                // Let's assume the user can search everything, but they can only transfer if balance > 0.
                const res = await fetch(`/api/distributor/warehouse/products/search?q=${encodeURIComponent(searchQuery)}`);
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
    }, [searchQuery]);

    const fetchOrganizations = async () => {
        try {
            const res = await fetch('/api/distributor/warehouse/organizations');
            if (res.ok) {
                const data = await res.json();
                setOrganizations(data.organizations || []);
            }
        } catch (error) {
            console.error('Failed to fetch orgs', error);
        }
    };

    // (Removed handleAddSerial)

    const handleAddItem = () => {
        if (!selectedProduct) return;
        
        if (selectedProduct.trackSerials && !currentSerial) {
            toast.error('Выберите или сканируйте партию');
            return;
        }

        const batchInfo = selectedProduct.trackSerials ? selectedProduct.stockItems?.find((b: any) => b.serialNumber === currentSerial) : null;
        if (selectedProduct.trackSerials && batchInfo && qty > batchInfo.quantity) {
            toast.error('Недостаточно товара в выбранной партии');
            return;
        }

        const newItem = {
            productId: selectedProduct.id,
            name: selectedProduct.name,
            qty: qty,
            price: selectedProduct.purchasePrice || 0,
            trackSerials: selectedProduct.trackSerials,
            batchBarcode: selectedProduct.trackSerials ? currentSerial : undefined,
        };
        
        if (newItem.qty <= 0) {
            toast.error('Количество должно быть больше нуля');
            return;
        }

        setItems([...items, newItem]);
        
        // Reset form
        setSelectedProduct(null);
        setSearchQuery('');
        setQty(1);
        setCurrentSerial('');
    };

    const handleSave = async (status: 'draft' | 'confirmed') => {
        if (!targetOrgId) {
            toast.error('Выберите склад/филиал получателя');
            return;
        }
        if (!documentNumber) {
            toast.error('Укажите номер документа');
            return;
        }
        if (items.length === 0) {
            toast.error('Добавьте хотя бы один товар');
            return;
        }

        const totalAmount = items.reduce((acc, item) => acc + (item.qty * item.price), 0);

        try {
            const res = await fetch('/api/distributor/warehouse/documents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'transfer_out',
                    status,
                    documentNumber,
                    targetOrganizationId: targetOrgId,
                    items,
                    totalAmount
                })
            });

            if (!res.ok) throw new Error('Failed to save document');
            
            toast.success(status === 'draft' ? 'Черновик сохранен' : 'Трансфер отправлен!');
            onSuccess();
        } catch (error) {
            toast.error('Ошибка сохранения');
        }
    };

    return (
        <div className="bg-white">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-gray-900">Оформление нового трансфера (Отправка)</h2>
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
                        Провести и Отправить
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-6 mb-8 border-b pb-8">
                <div className="sm:col-span-3">
                    <label className="block text-sm font-medium leading-6 text-gray-900 mb-2">Склад / Филиал получатель</label>
                    <div className="relative" ref={targetOrgRef}>
                        <div 
                            className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 cursor-pointer flex justify-between items-center"
                            onClick={() => {
                                setIsTargetOrgOpen(!isTargetOrgOpen);
                                setTargetOrgSearch('');
                            }}
                        >
                            <span className={targetOrgId ? 'text-gray-900' : 'text-gray-500'}>
                                {targetOrgId 
                                    ? organizations.find(o => o.id === targetOrgId)?.name 
                                    : 'Выберите получателя...'}
                            </span>
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                        </div>

                        {isTargetOrgOpen && (
                            <div className="absolute z-20 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-hidden flex flex-col">
                                <div className="p-2 border-b sticky top-0 bg-white">
                                    <div className="relative">
                                        <Search className="w-4 h-4 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
                                        <input 
                                            type="text"
                                            className="w-full pl-8 pr-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                            placeholder="Поиск..."
                                            value={targetOrgSearch}
                                            onChange={e => setTargetOrgSearch(e.target.value)}
                                            onClick={e => e.stopPropagation()}
                                        />
                                    </div>
                                </div>
                                <div className="overflow-y-auto">
                                    {organizations
                                        .filter(o => o.name.toLowerCase().includes(targetOrgSearch.toLowerCase()))
                                        .map(o => (
                                            <div 
                                                key={o.id} 
                                                className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 flex items-center justify-between"
                                                onClick={() => {
                                                    setTargetOrgId(o.id);
                                                    setIsTargetOrgOpen(false);
                                                }}
                                            >
                                                <span>{o.name}</span>
                                                {targetOrgId === o.id && <Check className="w-4 h-4 text-indigo-600" />}
                                            </div>
                                        ))}
                                    {organizations.filter(o => o.name.toLowerCase().includes(targetOrgSearch.toLowerCase())).length === 0 && (
                                        <div className="px-3 py-4 text-sm text-center text-gray-500">Ничего не найдено</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="sm:col-span-3">
                    <label className="block text-sm font-medium leading-6 text-gray-900">Номер документа</label>
                    <div className="mt-2">
                        <input
                            type="text"
                            value={documentNumber}
                            onChange={(e) => setDocumentNumber(e.target.value)}
                            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                            placeholder="№ док-та"
                        />
                    </div>
                </div>
            </div>

            {/* Product Search & Add */}
            <div className="mb-8 p-4 bg-gray-50 rounded-lg ring-1 ring-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Выбор товара со склада</h3>
                
                {!selectedProduct ? (
                    <div className="relative">
                        <div className="flex gap-4">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    const hasCyrillic = /[\u0400-\u04FF]/.test(val);
                                    setSearchQuery(hasCyrillic ? translateCyrillicToEnglishLayout(val) : val);
                                }}
                                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                placeholder="Поиск по остаткам..."
                            />
                        </div>
                        
                        {/* Search Results Dropdown */}
                        {searchQuery.trim() && (
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
                                                    setSearchQuery('');
                                                }}
                                                className="relative cursor-pointer select-none py-2 pl-3 pr-9 text-gray-900 hover:bg-indigo-50"
                                            >
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <span className="block truncate font-medium">{product.name}</span>
                                                        <span className="block truncate text-gray-500 text-xs">В наличии: {product.currentStock}</span>
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
                                        Товар не найден.
                                    </div>
                                )}
                            </div>
                        )}
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
                            <button onClick={() => setSelectedProduct(null)} className="text-sm text-red-600 hover:text-red-500">Отмена</button>
                        </div>
                        
                        <div className="flex gap-4 items-end">
                            {selectedProduct.trackSerials ? (
                                <div className="flex gap-4 w-full">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Партия (выберите или сканируйте)</label>
                                        <select
                                            value={currentSerial}
                                            onChange={(e) => {
                                                setCurrentSerial(e.target.value);
                                                // Reset qty when batch changes
                                                setQty(1);
                                            }}
                                            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
                                        >
                                            <option value="">-- Выберите партию --</option>
                                            {selectedProduct.stockItems?.map((batch: any) => (
                                                <option key={batch.id} value={batch.serialNumber}>
                                                    Штрихкод: {batch.serialNumber} (Остаток: {batch.quantity})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="w-32">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Количество</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max={selectedProduct.stockItems?.find((b: any) => b.serialNumber === currentSerial)?.quantity || 1}
                                            value={qty}
                                            onChange={(e) => setQty(Number(e.target.value))}
                                            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="w-32">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Количество</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={qty}
                                        onChange={(e) => setQty(Number(e.target.value))}
                                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
                                    />
                                </div>
                            )}

                            <button
                                onClick={handleAddItem}
                                className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 mb-[2px]"
                            >
                                <Plus className="h-4 w-4 mr-1" />
                                Добавить к отправке
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
                            <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {items.map((item, idx) => (
                            <tr key={idx}>
                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                    {item.name}
                                    {item.trackSerials && item.batchBarcode && (
                                        <div className="mt-1 text-xs text-gray-500">
                                            Партия: <span className="px-1 bg-gray-100 rounded">{item.batchBarcode}</span>
                                        </div>
                                    )}
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                    {item.trackSerials ? <Barcode className="h-4 w-4 text-indigo-500" /> : <Box className="h-4 w-4 text-gray-400" />}
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{item.qty}</td>
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
                                <td colSpan={4} className="py-8 text-center text-sm text-gray-500">
                                    В трансфер пока не добавлены товары
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
