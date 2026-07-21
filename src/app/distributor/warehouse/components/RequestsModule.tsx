'use client';

import { useState, useEffect } from 'react';
import { ClipboardList, Plus, Search, Trash2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { translateCyrillicToEnglishLayout } from '@/lib/utils/keyboard-layout';

export default function RequestsModule() {
    const [requests, setRequests] = useState<any[]>([]);
    const [organizations, setOrganizations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // View state
    const [view, setView] = useState<'list' | 'new'>('list');

    // New Request State
    const [targetOrgId, setTargetOrgId] = useState('');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [qty, setQty] = useState(1);

    useEffect(() => {
        if (view === 'list') {
            fetchRequests();
        } else {
            fetchOrganizations();
        }
    }, [view]);

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

    const fetchRequests = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/distributor/warehouse/requests');
            if (res.ok) {
                const data = await res.json();
                setRequests(data.requests || []);
            }
        } catch (error) {
            toast.error('Ошибка загрузки заявок');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchOrganizations = async () => {
        try {
            const res = await fetch('/api/distributor/warehouse/organizations');
            if (res.ok) {
                const data = await res.json();
                setOrganizations(data.organizations || []);
            }
        } catch (error) {
            console.error('Failed to fetch orgs');
        }
    };

    const handleAddItem = () => {
        if (!selectedProduct) return;
        if (qty <= 0) {
            toast.error('Количество должно быть больше нуля');
            return;
        }

        const newItem = {
            productId: selectedProduct.id,
            name: selectedProduct.name,
            sku: selectedProduct.sku,
            qty: qty,
        };

        setItems([...items, newItem]);
        setSelectedProduct(null);
        setSearchQuery('');
        setQty(1);
    };

    const handleSubmitRequest = async () => {
        if (items.length === 0) {
            toast.error('Добавьте хотя бы один товар в заявку');
            return;
        }

        try {
            const res = await fetch('/api/distributor/warehouse/requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetOrganizationId: targetOrgId || null,
                    items,
                    notes
                })
            });

            if (res.ok) {
                toast.success('Заявка успешно отправлена');
                setView('list');
                setItems([]);
                setNotes('');
                setTargetOrgId('');
            } else {
                throw new Error('Failed to submit');
            }
        } catch (error) {
            toast.error('Ошибка отправки заявки');
        }
    };

    if (view === 'new') {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-lg font-medium text-gray-900">Создание заявки на товар</h2>
                    </div>
                    <div className="space-x-3">
                        <button 
                            onClick={() => setView('list')}
                            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                        >
                            Отмена
                        </button>
                        <button 
                            onClick={handleSubmitRequest}
                            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                        >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Отправить заявку
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-6 mb-8 border-b pb-8">
                    <div className="sm:col-span-3">
                        <label className="block text-sm font-medium leading-6 text-gray-900">Кому (Поставщик / Филиал)</label>
                        <div className="mt-2">
                            <select
                                value={targetOrgId}
                                onChange={(e) => setTargetOrgId(e.target.value)}
                                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                            >
                                <option value="">Без указания (Внешний поставщик)</option>
                                {organizations.map(org => (
                                    <option key={org.id} value={org.id}>{org.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="sm:col-span-6">
                        <label className="block text-sm font-medium leading-6 text-gray-900">Комментарий к заявке</label>
                        <div className="mt-2">
                            <textarea
                                rows={2}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                placeholder="Дополнительная информация..."
                            />
                        </div>
                    </div>
                </div>

                {/* Product Search & Add */}
                <div className="mb-8 p-4 bg-gray-50 rounded-lg ring-1 ring-gray-200">
                    <h3 className="text-sm font-medium text-gray-900 mb-4">Добавление товара в заявку</h3>
                    
                    {!selectedProduct ? (
                        <div className="relative">
                            <div className="relative flex-1">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Search className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        const hasCyrillic = /[\u0400-\u04FF]/.test(val);
                                        setSearchQuery(hasCyrillic ? translateCyrillicToEnglishLayout(val) : val);
                                    }}
                                    className="block w-full rounded-md border-0 py-2 pl-10 pr-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                    placeholder="Поиск по артикулу, штрихкоду или названию..."
                                />
                            </div>
                            
                            {/* Search Results Dropdown */}
                            {searchQuery.trim() && (
                                <div className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
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
                                                        </div>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="p-4 text-sm text-gray-500 text-center">
                                            Товар не найден. Выберите из существующих.
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
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Требуемое кол-во</th>
                                <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {items.map((item, idx) => (
                                <tr key={idx}>
                                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                        {item.name}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{item.qty} шт.</td>
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
                                    <td colSpan={3} className="py-8 text-center text-sm text-gray-500">
                                        Товары не добавлены
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
                    <h2 className="text-lg font-medium text-gray-900">Журнал заявок на товар</h2>
                    <p className="text-sm text-gray-500">Запросы на пополнение склада</p>
                </div>
                <button 
                    onClick={() => setView('new')}
                    className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Создать заявку
                </button>
            </div>

            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">№ Заявки</th>
                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Статус</th>
                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Получатель</th>
                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Отправитель (Инициатор)</th>
                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Дата</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {requests.map((req) => (
                            <tr key={req.id} className="hover:bg-gray-50">
                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                    <div className="flex items-center gap-2">
                                        <ClipboardList className="h-4 w-4 text-gray-400" />
                                        {req.requestNumber}
                                    </div>
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                    {req.status === 'pending' ? (
                                        <span className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">В ожидании</span>
                                    ) : req.status === 'fulfilled' ? (
                                        <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Выполнена</span>
                                    ) : (
                                        <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">{req.status}</span>
                                    )}
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{req.targetOrganization?.name || 'Внешний поставщик'}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{req.organization?.name || 'Неизвестно'}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{new Date(req.createdAt).toLocaleDateString('ru-RU')}</td>
                            </tr>
                        ))}
                        {requests.length === 0 && !isLoading && (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-sm text-gray-500">
                                    Нет активных заявок
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
