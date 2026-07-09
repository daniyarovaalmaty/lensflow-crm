'use client';

import { useState, useEffect } from 'react';
import { Plus, Save, Trash2, Box, Barcode, CheckCircle, Search, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DocumentFlowModule({ isWriteOffOnly = false }: { isWriteOffOnly?: boolean }) {
    const [documents, setDocuments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [documentNumber, setDocumentNumber] = useState('');
    const [reason, setReason] = useState('');
    const [items, setItems] = useState<any[]>([]);
    
    // For adding a new item
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [qty, setQty] = useState(1);
    const [serials, setSerials] = useState<string[]>([]);
    const [currentSerial, setCurrentSerial] = useState('');

    useEffect(() => {
        if (!isWriteOffOnly) {
            fetchDocuments();
        } else {
            setIsLoading(false);
        }
    }, [isWriteOffOnly]);

    const fetchDocuments = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/distributor/warehouse/documents?type=all');
            if (res.ok) {
                const data = await res.json();
                setDocuments(data.documents || []);
            }
        } catch (error) {
            toast.error('Ошибка загрузки документов');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }
        const delayDebounceFn = setTimeout(async () => {
            setIsSearching(true);
            try {
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

    const handleAddSerial = () => {
        if (!currentSerial.trim()) return;
        if (serials.includes(currentSerial.trim())) {
            toast.error('Этот серийный номер уже добавлен');
            return;
        }
        setSerials([...serials, currentSerial.trim()]);
        setQty(serials.length + 1);
        setCurrentSerial('');
    };

    const handleAddItem = () => {
        if (!selectedProduct) return;
        
        let finalSerials = [...serials];
        // UX Fix: Automatically grab the serial from the input if user forgot to press Enter or the Add button
        if (selectedProduct.trackSerials && currentSerial.trim()) {
            if (!finalSerials.includes(currentSerial.trim())) {
                finalSerials.push(currentSerial.trim());
            }
        }
        
        const finalQty = selectedProduct.trackSerials ? finalSerials.length : qty;

        if (finalQty <= 0) {
            toast.error('Введите количество или отсканируйте штрихкод');
            return;
        }

        const newItem = {
            productId: selectedProduct.id,
            name: selectedProduct.name,
            qty: finalQty,
            price: selectedProduct.purchasePrice || 0,
            trackSerials: selectedProduct.trackSerials,
            serialNumbers: selectedProduct.trackSerials ? finalSerials : [],
        };

        setItems([...items, newItem]);
        setSelectedProduct(null);
        setSearchQuery('');
        setQty(1);
        setSerials([]);
        setCurrentSerial('');
    };

    const handleSave = async (status: 'draft' | 'confirmed') => {
        if (!documentNumber) {
            toast.error('Укажите номер акта');
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
                    type: 'write_off',
                    status,
                    documentNumber,
                    notes: reason,
                    items,
                    totalAmount
                })
            });

            if (!res.ok) throw new Error('Failed to save document');
            
            toast.success(status === 'draft' ? 'Черновик сохранен' : 'Акт списания проведен!');
            // Reset state
            setItems([]);
            setDocumentNumber('');
            setReason('');
        } catch (error) {
            toast.error('Ошибка сохранения');
        }
    };

    const getDocumentTypeLabel = (type: string) => {
        switch (type) {
            case 'receipt': return 'Приходная накладная';
            case 'write_off': return 'Акт списания';
            case 'transfer_out': return 'Перемещение (Расход)';
            case 'transfer_in': return 'Перемещение (Приход)';
            case 'adjustment': return 'Корректировка';
            default: return type;
        }
    };

    // JOURNAL VIEW (Документооборот)
    if (!isWriteOffOnly) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-medium text-gray-900">Журнал складских документов</h2>
                        <p className="text-sm text-gray-500">История всех операций по складу</p>
                    </div>
                </div>

                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Документ</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Тип</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Статус</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Контрагент</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Сумма</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Дата</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {documents.map((doc) => (
                                <tr key={doc.id} className="hover:bg-gray-50">
                                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                        <div className="flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-gray-400" />
                                            {doc.documentNumber}
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                        {getDocumentTypeLabel(doc.type)}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                        {doc.status === 'confirmed' ? (
                                            <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Проведен</span>
                                        ) : (
                                            <span className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">Черновик</span>
                                        )}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{doc.counterpartyName || '-'}</td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{doc.totalAmount.toLocaleString()} ₸</td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{new Date(doc.createdAt).toLocaleDateString('ru-RU')}</td>
                                </tr>
                            ))}
                            {documents.length === 0 && !isLoading && (
                                <tr>
                                    <td colSpan={6} className="py-8 text-center text-sm text-gray-500">
                                        Документы не найдены
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    // CREATE WRITE-OFF VIEW (Списания)
    return (
        <div className="bg-white">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-gray-900">Акт списания товаров</h2>
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
                        className="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500"
                    >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Провести акт
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-6 mb-8 border-b pb-8">
                <div className="sm:col-span-3">
                    <label className="block text-sm font-medium leading-6 text-gray-900">Причина списания</label>
                    <div className="mt-2">
                        <select
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-red-600 sm:text-sm sm:leading-6"
                        >
                            <option value="">Выберите причину...</option>
                            <option value="Брак">Брак</option>
                            <option value="Истек срок годности">Истек срок годности</option>
                            <option value="Потеря/Кража">Потеря/Кража</option>
                            <option value="Уценка">Уценка</option>
                        </select>
                    </div>
                </div>
                <div className="sm:col-span-3">
                    <label className="block text-sm font-medium leading-6 text-gray-900">Номер акта списания</label>
                    <div className="mt-2">
                        <input
                            type="text"
                            value={documentNumber}
                            onChange={(e) => setDocumentNumber(e.target.value)}
                            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-red-600 sm:text-sm sm:leading-6"
                            placeholder="№ акта"
                        />
                    </div>
                </div>
            </div>

            {/* Product Search & Add */}
            <div className="mb-8 p-4 bg-gray-50 rounded-lg ring-1 ring-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Выбор товара для списания</h3>
                
                {!selectedProduct ? (
                    <div className="relative">
                        <div className="flex gap-4">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-red-600 sm:text-sm sm:leading-6"
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
                                                className="relative cursor-pointer select-none py-2 pl-3 pr-9 text-gray-900 hover:bg-red-50"
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
                            </div>
                            <button onClick={() => setSelectedProduct(null)} className="text-sm text-red-600 hover:text-red-500">Отмена</button>
                        </div>
                        
                        <div className="flex gap-4 items-end">
                            {selectedProduct.trackSerials ? (
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Сканировать серийный номер / штрихкод ед.</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={currentSerial}
                                            onChange={(e) => setCurrentSerial(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddSerial()}
                                            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-red-600 sm:text-sm"
                                        />
                                        <button onClick={handleAddSerial} className="px-3 py-1.5 bg-gray-100 border rounded hover:bg-gray-200">
                                            <Barcode className="h-4 w-4" />
                                        </button>
                                    </div>
                                    {serials.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {serials.map(sn => (
                                                <span key={sn} className="inline-flex items-center rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                                                    {sn}
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
                                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-red-600 sm:text-sm"
                                    />
                                </div>
                            )}

                            <button
                                onClick={handleAddItem}
                                className="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 mb-[2px]"
                            >
                                <Plus className="h-4 w-4 mr-1" />
                                Добавить к списанию
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
                                    {item.trackSerials && (
                                        <div className="mt-1 text-xs text-gray-500 flex gap-1 flex-wrap">
                                            {item.serialNumbers.map((sn: string) => (
                                                <span key={sn} className="px-1 bg-gray-100 rounded">{sn}</span>
                                            ))}
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
                                    В акт пока не добавлены товары
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
