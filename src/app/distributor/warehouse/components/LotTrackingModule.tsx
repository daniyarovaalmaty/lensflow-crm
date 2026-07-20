'use client';

import { useState, useEffect } from 'react';
import { Search, Package, ArrowRight, Building, FileText, Calendar, Box } from 'lucide-react';
import toast from 'react-hot-toast';
import { parseGS1Barcode } from '@/lib/utils/gs1Parser';
import ExpiryDateBadge from './ExpiryDateBadge';

export default function LotTrackingModule() {
    const [lotQuery, setLotQuery] = useState('');
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [products, setProducts] = useState<any[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const res = await fetch('/api/optic/products');
                const data = await res.json();
                setProducts(data.products || []);
            } catch (err) {}
        };
        fetchProducts();
    }, []);

    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(lotQuery.toLowerCase()) || 
        (p.sku && p.sku.toLowerCase().includes(lotQuery.toLowerCase()))
    );

    const handleSearchProduct = async (productId: string, productName: string) => {
        setShowDropdown(false);
        setLotQuery(productName);
        try {
            setLoading(true);
            const res = await fetch(`/api/distributor/warehouse/lot-tracking?productId=${productId}`);
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || 'Ошибка поиска');
            
            setItems(data.items || []);
            setHasSearched(true);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setShowDropdown(false);
        if (lotQuery.trim().length < 3) {
            toast.error('Введите минимум 3 символа');
            return;
        }

        try {
            setLoading(true);
            const res = await fetch(`/api/distributor/warehouse/lot-tracking?lot=${encodeURIComponent(lotQuery.trim())}`);
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || 'Ошибка поиска');
            
            setItems(data.items || []);
            setHasSearched(true);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const getStatusLabel = (status: string) => {
        switch(status) {
            case 'in_stock': return <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">На складе</span>;
            case 'sold': return <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">Продан</span>;
            case 'defective': return <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">Брак</span>;
            case 'written_off': return <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">Списан</span>;
            case 'reserved': return <span className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">Резерв</span>;
            default: return <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">{status}</span>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-medium text-gray-900">Поиск товара</h2>
                    <p className="text-sm text-gray-500 mt-1">Отследите куда и когда ушел товар по его LOT, серийному номеру или части штрихкода.</p>
                </div>
            </div>

            <form onSubmit={handleSearch} className="flex gap-3 max-w-2xl relative">
                <div className="relative flex-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        value={lotQuery}
                        onChange={(e) => {
                            setLotQuery(e.target.value);
                            setShowDropdown(true);
                        }}
                        onFocus={() => setShowDropdown(true)}
                        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                        className="block w-full rounded-md border-0 py-2.5 pl-10 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                        placeholder="Введите часть штрихкода, серийного номера или выберите товар..."
                    />
                    
                    {showDropdown && filteredProducts.length > 0 && (
                        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                            {filteredProducts.map((product) => (
                                <div
                                    key={product.id}
                                    onClick={() => handleSearchProduct(product.id, product.name)}
                                    className="relative cursor-pointer select-none py-2 pl-3 pr-9 text-gray-900 hover:bg-indigo-50"
                                >
                                    <div className="flex flex-col">
                                        <span className="font-medium">{product.name}</span>
                                        {product.sku && <span className="text-xs text-gray-500">Артикул: {product.sku}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <button
                    type="submit"
                    disabled={loading || lotQuery.trim().length < 3}
                    className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
                >
                    {loading ? 'Поиск...' : 'Искать'}
                </button>
            </form>

            {hasSearched && !loading && items.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <Package className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-semibold text-gray-900">Партий не найдено</h3>
                    <p className="mt-1 text-sm text-gray-500">По запросу "{lotQuery}" не найдено ни одного товара в базе.</p>
                </div>
            )}

            {items.length > 0 && (
                <div className="flex justify-between items-end mb-4">
                    <span className="text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1 rounded-md">
                        Найдено результатов: {items.length}
                    </span>
                </div>
            )}

            {items.length > 0 && (
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Товар</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Статус</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Приход</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Расход / Продажа</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {items.map((item) => (
                                <tr key={item.id}>
                                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                        <div className="font-semibold text-gray-900 mb-1">{item.product?.name || 'Неизвестный товар'}</div>
                                        {(() => {
                                            const parsed = parseGS1Barcode(item.serialNumber || '');
                                            const sn = parsed.serialNumber || parsed.batchNumber;
                                            return (
                                                <div className="flex flex-col gap-1 mt-2">
                                                    <div className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-[11px] font-medium text-gray-700 ring-1 ring-inset ring-gray-600/20 w-fit">
                                                        <span className="text-gray-400 mr-1">Штрихкод:</span> {item.serialNumber}
                                                    </div>
                                                    {sn && (
                                                        <div className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20 w-fit">
                                                            <span className="text-indigo-400 mr-1">Серийный номер:</span> {sn}
                                                        </div>
                                                    )}
                                                    {item.expiryDate && (
                                                        <div className="flex items-center gap-1 w-fit">
                                                            <span className="text-gray-400 text-[11px] mr-1">Срок годности:</span>
                                                            <ExpiryDateBadge date={item.expiryDate} />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                        {getStatusLabel(item.status)}
                                    </td>
                                    <td className="px-3 py-4 text-sm text-gray-500">
                                        {item.receiptDoc ? (
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1.5 font-medium">
                                                    <a href={`/distributor/warehouse/documents/${item.receiptDoc.id}`} className="text-indigo-600 hover:text-indigo-900 leading-tight flex items-center gap-1 group font-medium" title="Открыть документ">
                                                        <FileText className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-600" />
                                                        № {item.receiptDoc.documentNumber}
                                                    </a>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs">
                                                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                    {(() => {
                                                        try {
                                                            const notes = JSON.parse(item.receiptDoc.notes || '{}');
                                                            if (notes.documentDate) {
                                                                const parts = notes.documentDate.split('-');
                                                                if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]} (Дата накладной)`;
                                                                return notes.documentDate;
                                                            }
                                                        } catch(e) {}
                                                        return new Date(item.receiptDoc.createdAt).toLocaleDateString('ru-RU');
                                                    })()}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs">
                                                    <Building className="w-3.5 h-3.5 text-gray-400" />
                                                    {item.receiptDoc.counterpartyName || '—'}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400">Нет данных о приходе</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-4 text-sm text-gray-500">
                                        {item.wholesaleOrder ? (
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1.5 text-gray-900 font-medium">
                                                    <Box className="w-3.5 h-3.5 text-gray-400" />
                                                    Заказ № {item.wholesaleOrder.orderNumber}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs">
                                                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                    {new Date(item.wholesaleOrder.createdAt).toLocaleDateString('ru-RU')}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs">
                                                    <Building className="w-3.5 h-3.5 text-gray-400" />
                                                    {item.wholesaleOrder.counterparty?.name || '—'}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400">—</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
