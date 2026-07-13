'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCcw, Plus, Save, FileText, CheckCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { translateCyrillicToEnglishLayout } from '@/lib/utils/keyboard-layout';
import { useUsbScanner } from '@/hooks/useUsbScanner';

export default function InventoryModule() {
    const [inventories, setInventories] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // View state
    const [view, setView] = useState<'list' | 'edit' | 'view'>('list');
    const [currentInventory, setCurrentInventory] = useState<any>(null);
    const [barcodeInput, setBarcodeInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const barcodeRef = useRef<HTMLInputElement>(null);

    // USB barcode scanner for inventory — active only in edit mode
    const handleUsbScanInventory = useCallback((rawCode: string) => {
        if (view !== 'edit') return;
        const code = translateCyrillicToEnglishLayout(rawCode.trim());
        
        setCurrentInventory((prevInventory: any) => {
            if (!prevInventory) return prevInventory;
            const idx = prevInventory.items.findIndex((item: any) =>
                item.sku === code ||
                item.barcode === code ||
                item.stockItemBarcodes?.includes(code)
            );

            if (idx !== -1) {
                const newItems = [...prevInventory.items];
                const item = { ...newItems[idx] };
                item.actualQty += 1;
                item.diff = item.actualQty - item.systemQty;
                newItems[idx] = item;
                setTimeout(() => toast.success(`Добавлено: ${item.name}`), 0);
                return { ...prevInventory, items: newItems };
            } else {
                setTimeout(() => toast.error('Товар с таким штрихкодом не найден в ревизии'), 0);
                return prevInventory;
            }
        });
    }, [view]);

    useUsbScanner(handleUsbScanInventory, view === 'edit');

    useEffect(() => {
        if (view === 'list') {
            fetchInventories();
        }
    }, [view]);

    const fetchInventories = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/distributor/warehouse/inventory');
            if (res.ok) {
                const data = await res.json();
                setInventories(data.inventories || []);
            }
        } catch (error) {
            toast.error('Ошибка загрузки ревизий');
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartInventory = async () => {
        try {
            const res = await fetch('/api/distributor/warehouse/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'start' })
            });
            if (res.ok) {
                const data = await res.json();
                setCurrentInventory(data.inventory);
                setView('edit');
                toast.success('Новая ревизия начата');
            } else {
                throw new Error('Failed to start');
            }
        } catch (error) {
            toast.error('Ошибка создания ревизии');
        }
    };

    const handleSaveInventory = async (action: 'save' | 'complete') => {
        if (!currentInventory) return;
        
        try {
            const res = await fetch('/api/distributor/warehouse/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action,
                    inventoryId: currentInventory.id,
                    items: currentInventory.items,
                    notes: currentInventory.notes
                })
            });

            if (res.ok) {
                toast.success(action === 'complete' ? 'Ревизия завершена' : 'Черновик сохранен');
                setView('list');
            } else {
                throw new Error('Failed to save');
            }
        } catch (error) {
            toast.error('Ошибка сохранения ревизии');
        }
    };

    const handleDeleteInventory = async (id: string) => {
        if (!confirm('Вы уверены, что хотите удалить эту ревизию? Это действие нельзя отменить.')) return;
        
        try {
            const res = await fetch(`/api/distributor/warehouse/inventory/${id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                toast.success('Ревизия успешно удалена');
                setView('list');
                setCurrentInventory(null);
            } else {
                throw new Error('Failed to delete');
            }
        } catch (error) {
            toast.error('Ошибка при удалении ревизии');
        }
    };

    const updateActualQty = (index: number, val: string) => {
        const qty = parseInt(val, 10);
        if (isNaN(qty) || qty < 0) return;
        
        const newItems = [...currentInventory.items];
        newItems[index].actualQty = qty;
        newItems[index].diff = qty - newItems[index].systemQty;
        setCurrentInventory({ ...currentInventory, items: newItems });
    };

    const handleBarcodeScan = () => {
        if (!barcodeInput.trim()) return;
        
        const input = translateCyrillicToEnglishLayout(barcodeInput.trim());
        
        setCurrentInventory((prevInventory: any) => {
            if (!prevInventory) return prevInventory;
            const idx = prevInventory.items.findIndex((item: any) => 
                item.sku === input || 
                item.barcode === input || 
                item.name.includes(input) ||
                item.stockItemBarcodes?.includes(input)
            );

            if (idx !== -1) {
                const newItems = [...prevInventory.items];
                const item = { ...newItems[idx] };
                item.actualQty += 1;
                item.diff = item.actualQty - item.systemQty;
                newItems[idx] = item;
                setTimeout(() => toast.success(`Добавлено: ${item.name}`), 0);
                return { ...prevInventory, items: newItems };
            } else {
                setTimeout(() => toast.error('Товар с таким штрихкодом не найден в ревизии'), 0);
                return prevInventory;
            }
        });
        
        setBarcodeInput('');
        setTimeout(() => barcodeRef.current?.focus(), 0);
    };

    if ((view === 'edit' || view === 'view') && currentInventory) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-medium text-gray-900">Ревизия {currentInventory.inventoryNumber}</h2>
                        <p className="text-sm text-gray-500">Заполните фактическое количество товаров на складе</p>
                    </div>
                    <div className="space-x-3 flex items-center">
                        <button 
                            onClick={() => handleDeleteInventory(currentInventory.id)}
                            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-red-600 shadow-sm ring-1 ring-inset ring-red-300 hover:bg-red-50"
                            title="Удалить ревизию"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Удалить
                        </button>
                        <button 
                            onClick={() => setView('list')}
                            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                        >
                            {view === 'view' ? 'Назад' : 'Отмена'}
                        </button>
                        {view === 'edit' && (
                            <>
                                <button 
                                    onClick={() => handleSaveInventory('save')}
                                    className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-indigo-600 shadow-sm ring-1 ring-inset ring-indigo-300 hover:bg-indigo-50"
                                >
                                    <Save className="h-4 w-4 mr-2" />
                                    Сохранить черновик
                                </button>
                                <button 
                                    onClick={() => handleSaveInventory('complete')}
                                    className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                                >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Завершить ревизию
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {view === 'edit' && (
                    <div className="mb-4">
                        <label className="block text-sm font-medium leading-6 text-gray-900">Сканирование штрихкода</label>
                        <div className="mt-2 flex gap-2">
                            <input
                                type="text"
                                ref={barcodeRef}
                                autoFocus
                                value={barcodeInput}
                                onChange={(e) => setBarcodeInput(translateCyrillicToEnglishLayout(e.target.value))}
                                onKeyDown={(e) => e.key === 'Enter' && handleBarcodeScan()}
                                className="block w-64 rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                placeholder="Пропикайте штрихкод товара..."
                            />
                            <button
                                onClick={handleBarcodeScan}
                                className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                            >
                                Добавить +1
                            </button>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">При каждом сканировании фактическое количество товара будет увеличиваться на 1.</p>
                    </div>
                )}

                <div className="mb-4">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full rounded-md border-0 py-2 pl-3 pr-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                        placeholder="Поиск по названию или артикулу в ревизии..."
                    />
                </div>

                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Товар</th>
                                <th className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">По учету</th>
                                <th className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">По факту</th>
                                <th className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">Разница</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {currentInventory.items.filter((item: any) => 
                                item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                item.sku?.toLowerCase().includes(searchQuery.toLowerCase())
                            ).map((item: any, idx: number) => {
                                const realIdx = currentInventory.items.findIndex((i: any) => i.productId === item.productId);
                                return (
                                <tr key={realIdx}>
                                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                        {item.name}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-center">{item.systemQty}</td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-center">
                                        {view === 'edit' ? (
                                            <input
                                                type="number"
                                                min="0"
                                                value={item.actualQty}
                                                onChange={(e) => updateActualQty(realIdx, e.target.value)}
                                                className="block w-24 mx-auto rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
                                            />
                                        ) : (
                                            <span className="font-medium text-gray-900">{item.actualQty}</span>
                                        )}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-center font-medium">
                                        {item.diff > 0 ? (
                                            <span className="text-green-600">+{item.diff} (Излишек)</span>
                                        ) : item.diff < 0 ? (
                                            <span className="text-red-600">{item.diff} (Недостача)</span>
                                        ) : (
                                            <span className="text-gray-400">0</span>
                                        )}
                                    </td>
                                </tr>
                            )})}
                            {currentInventory.items.filter((item: any) => 
                                item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                item.sku?.toLowerCase().includes(searchQuery.toLowerCase())
                            ).length === 0 && (
                                <tr>
                                    <td colSpan={4} className="py-8 text-center text-sm text-gray-500">
                                        На складе нет товаров для ревизии
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-medium text-gray-900">Журнал ревизий</h2>
                    <p className="text-sm text-gray-500">История инвентаризаций склада</p>
                </div>
                <button 
                    onClick={handleStartInventory}
                    className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Начать ревизию
                </button>
            </div>

            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">№ Документа</th>
                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Статус</th>
                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Товаров</th>
                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Излишки / Недостачи</th>
                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Сотрудник</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {inventories.map((inv) => (
                            <tr key={inv.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => {
                                setCurrentInventory(inv);
                                setView(inv.status === 'in_progress' ? 'edit' : 'view');
                            }}>
                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-gray-400" />
                                        {inv.inventoryNumber}
                                    </div>
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                    {inv.status === 'completed' ? (
                                        <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Завершено</span>
                                    ) : (
                                        <span className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">В процессе</span>
                                    )}
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{inv.totalProducts} поз.</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                    <span className="text-green-600 mr-2">+{inv.surplusCount}</span>
                                    <span className="text-red-600">-{inv.shortageCount}</span>
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{inv.performedByName || 'Неизвестно'}</td>
                            </tr>
                        ))}
                        {inventories.length === 0 && !isLoading && (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-sm text-gray-500">
                                    Нет проведенных ревизий
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
