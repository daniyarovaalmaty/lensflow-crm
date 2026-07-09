'use client';

import { useState } from 'react';
import { Plus, Save, Trash2, Box, Barcode, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function NewSupplyForm({ onSuccess }: { onSuccess: () => void }) {
    const [counterpartyName, setCounterpartyName] = useState('');
    const [documentNumber, setDocumentNumber] = useState('');
    const [items, setItems] = useState<any[]>([]);
    
    // For adding a new item
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [qty, setQty] = useState(1);
    const [price, setPrice] = useState(0);
    const [serials, setSerials] = useState<string[]>([]);
    const [currentSerial, setCurrentSerial] = useState('');

    const handleAddSerial = () => {
        if (!currentSerial.trim()) return;
        if (serials.includes(currentSerial)) {
            toast.error('Этот серийный номер уже добавлен');
            return;
        }
        setSerials([...serials, currentSerial]);
        setQty(serials.length + 1);
        setCurrentSerial('');
    };

    const handleAddItem = () => {
        if (!selectedProduct) return;
        
        const newItem = {
            productId: selectedProduct.id,
            name: selectedProduct.name,
            qty: selectedProduct.trackSerials ? serials.length : qty,
            price: price,
            trackSerials: selectedProduct.trackSerials,
            serialNumbers: selectedProduct.trackSerials ? serials : [],
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
        setPrice(0);
        setSerials([]);
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
            const res = await fetch('/api/distributor/warehouse/documents', {
                method: 'POST',
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

            if (!res.ok) throw new Error('Failed to save document');
            
            toast.success(status === 'draft' ? 'Черновик сохранен' : 'Поставка проведена успешно!');
            onSuccess();
        } catch (error) {
            toast.error('Ошибка сохранения');
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
                            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
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
                            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                            placeholder="№ док-та"
                        />
                    </div>
                </div>
            </div>

            {/* Simulated Product Search & Add */}
            <div className="mb-8 p-4 bg-gray-50 rounded-lg ring-1 ring-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Добавление товара в накладную</h3>
                
                {!selectedProduct ? (
                    <div className="flex gap-4">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                            placeholder="Поиск по артикулу, штрихкоду или названию..."
                        />
                        <button 
                            onClick={() => {
                                // Mock selection for now. Real implementation should fetch from /api/products
                                setSelectedProduct({ id: 'prod_1', name: 'Линза Hoya 1.50', trackSerials: true });
                            }}
                            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                        >
                            Найти
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
                            <button onClick={() => setSelectedProduct(null)} className="text-sm text-red-600 hover:text-red-500">Отмена</button>
                        </div>
                        
                        <div className="flex gap-4 items-end">
                            {selectedProduct.trackSerials ? (
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Добавить серийный номер / штрихкод ед.</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={currentSerial}
                                            onChange={(e) => setCurrentSerial(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddSerial()}
                                            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
                                            placeholder="Сканируйте штрихкод..."
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
                                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
                                    />
                                </div>
                            )}

                            <div className="w-40">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Цена закупки (₸)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={price}
                                    onChange={(e) => setPrice(Number(e.target.value))}
                                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
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
                                                <span key={sn} className="px-1 bg-gray-100 rounded">{sn}</span>
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
