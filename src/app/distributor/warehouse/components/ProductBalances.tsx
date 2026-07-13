'use client';

import { useState, useEffect } from 'react';
import { Search, Download, Box, Barcode, Edit2, Trash2, X, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import DocumentViewerModal from './SupplyModule/DocumentViewerModal';
import UnitsModal from './UnitsModal';
import { translateCyrillicToEnglishLayout } from '@/lib/utils/keyboard-layout';

export default function ProductBalances() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [barcodeSearch, setBarcodeSearch] = useState('');
    const [brandFilter, setBrandFilter] = useState('');
    const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');

    const [editingProduct, setEditingProduct] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState<any>(null);
    const [docLoading, setDocLoading] = useState(false);
    const [viewingSerialsForProduct, setViewingSerialsForProduct] = useState<any>(null);

    useEffect(() => {
        fetchBalances();
    }, []);

    const fetchBalances = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/distributor/warehouse/balances');
            if (!res.ok) throw new Error('Failed to fetch balances');
            const data = await res.json();
            setProducts(data.products || []);
        } catch (error) {
            toast.error('Ошибка загрузки остатков');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Вы уверены, что хотите принудительно удалить этот товар? Вся история его движений и остатков будет безвозвратно удалена.')) return;
        
        try {
            const res = await fetch(`/api/distributor/warehouse/products/${id}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            
            if (!res.ok) {
                toast.error(data.error || 'Ошибка удаления товара');
                return;
            }
            
            toast.success('Товар успешно удален');
            setProducts(products.filter(p => p.id !== id));
        } catch (error) {
            console.error(error);
            toast.error('Ошибка при удалении товара');
        }
    };

    const openDocument = async (docNumber: string) => {
        try {
            setDocLoading(true);
            const res = await fetch(`/api/distributor/warehouse/documents?type=all&documentNumber=${encodeURIComponent(docNumber)}`);
            if (res.ok) {
                const data = await res.json();
                if (data.documents && data.documents.length > 0) {
                    setSelectedDocument(data.documents[0]);
                } else {
                    toast.error('Документ не найден');
                }
            } else {
                toast.error('Ошибка загрузки документа');
            }
        } catch (error) {
            toast.error('Ошибка загрузки документа');
        } finally {
            setDocLoading(false);
        }
    };

    const handleSaveEdit = async () => {
        if (!editingProduct.name.trim()) {
            toast.error('Название обязательно');
            return;
        }

        try {
            setIsSaving(true);
            const payload = {
                name: editingProduct.name,
                brand: editingProduct.brand,
                model: editingProduct.model,
                barcode: editingProduct.barcode,
                sku: editingProduct.sku,
                purchasePrice: editingProduct.purchasePrice,
                specs: editingProduct.specs || {}
            };

            const res = await fetch(`/api/distributor/warehouse/products/${editingProduct.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Ошибка сохранения');
            
            toast.success('Товар обновлен');
            setProducts(products.map(p => p.id === data.product.id ? { ...p, ...data.product } : p));
            setEditingProduct(null);
        } catch (error: any) {
            toast.error(error.message || 'Ошибка при сохранении');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSpecChange = (key: string, value: string) => {
        setEditingProduct({
            ...editingProduct,
            specs: {
                ...(editingProduct.specs || {}),
                [key]: value
            }
        });
    };

    // Extract unique brands for filter
    const brands = [...new Set(products.map(p => p.brand).filter(Boolean))].sort();

    const filteredProducts = products.filter(p => {
        const query = searchQuery.toLowerCase();
        const bSearch = barcodeSearch.toLowerCase();
        
        const matchesName = !query || 
               p.name.toLowerCase().includes(query) || 
               p.sku?.toLowerCase().includes(query) ||
               p.specs?.lot?.toLowerCase().includes(query); // also include lot/SN here just in case
               
        const matchesBarcode = !bSearch ||
               p.barcode?.toLowerCase().includes(bSearch) ||
               (p.stockItems && p.stockItems.some((si: any) => 
                   si.barcode?.toLowerCase().includes(bSearch) ||
                   si.serialNumber?.toLowerCase().includes(bSearch)
               ));
        
        const matchesBrand = !brandFilter || p.brand === brandFilter;
        
        const matchesStock = stockFilter === 'all' ||
            (stockFilter === 'in_stock' && p.currentStock > 0) ||
            (stockFilter === 'low_stock' && p.currentStock > 0 && p.currentStock <= (p.minStock || 3)) ||
            (stockFilter === 'out_of_stock' && p.currentStock === 0);
        
        return matchesName && matchesBarcode && matchesBrand && matchesStock;
    });

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-gray-900">Остатки товара на складе</h2>
                <button className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                    <Download className="h-4 w-4 mr-2 text-gray-500" />
                    Выгрузить в Excel
                </button>
            </div>

            <div className="mb-6 flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full rounded-md border-0 py-2 pl-10 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                        placeholder="Поиск по названию или артикулу..."
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
                        className="block w-full rounded-md border-0 py-2 pl-10 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                        placeholder="Поиск по штрихкоду..."
                    />
                </div>
            </div>

            {/* Filters Row */}
            <div className="mb-6 flex gap-4 flex-wrap">
                <select
                    value={brandFilter}
                    onChange={(e) => setBrandFilter(e.target.value)}
                    className="rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6 pr-10"
                >
                    <option value="">Все бренды</option>
                    {brands.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <select
                    value={stockFilter}
                    onChange={(e) => setStockFilter(e.target.value as any)}
                    className="rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6 pr-10"
                >
                    <option value="all">Все остатки</option>
                    <option value="in_stock">В наличии</option>
                    <option value="low_stock">Мало на складе</option>
                    <option value="out_of_stock">Нет в наличии</option>
                </select>
                <span className="text-sm text-gray-500 self-center">
                    Найдено: {filteredProducts.length} из {products.length}
                </span>
            </div>

            {loading ? (
                <div className="animate-pulse space-y-4">
                    <div className="h-10 bg-gray-200 rounded w-full"></div>
                    <div className="h-10 bg-gray-200 rounded w-full"></div>
                    <div className="h-10 bg-gray-200 rounded w-full"></div>
                </div>
            ) : (
                <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="py-2 pl-4 pr-3 text-left text-xs font-semibold text-gray-900 sm:pl-6">Наименование</th>
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-900">Штрихкод</th>
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-900">С/Н (Партия)</th>
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-900">Бренд</th>
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-900">Модель</th>
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-900">Диоптр.</th>
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-900">Процент.</th>
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-900">Срок годн.</th>
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-900">Дата импорта</th>
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-900">Произведено</th>
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-900">Док-т прихода</th>
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-900">Код реф.</th>
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-900">Единицы</th>
                                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-900">Остаток</th>
                                <th className="px-2 py-2 text-right text-xs font-semibold text-gray-900">Сумма</th>
                                <th className="relative py-2 pl-3 pr-4 sm:pr-6"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {filteredProducts.map((product) => (
                                <tr key={product.id} className="hover:bg-gray-50">
                                    <td className="py-3 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                        <div className="flex items-center gap-2">
                                            {product.trackSerials ? <Barcode className="h-4 w-4 text-indigo-500 flex-shrink-0" /> : <Box className="h-4 w-4 text-gray-400 flex-shrink-0" />}
                                            <span className="min-w-0 break-words">{product.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-2 py-3 text-sm text-gray-500">{product.barcode || '-'}</td>
                                    <td className="px-2 py-3 text-sm text-gray-500">{product.specs?.lot || '-'}</td>
                                    <td className="px-2 py-3 text-sm text-gray-500">{product.brand || '-'}</td>
                                    <td className="px-2 py-3 text-sm text-gray-500">{product.model || '-'}</td>
                                    <td className="px-2 py-3 text-sm text-gray-500">{product.specs?.diopters || '-'}</td>
                                    <td className="px-2 py-3 text-sm text-gray-500">{product.specs?.percentage || '-'}</td>
                                    <td className="px-2 py-3 text-sm text-gray-500">{product.specs?.expirationDate ? new Date(product.specs.expirationDate).toLocaleDateString('ru-RU') : '-'}</td>
                                    <td className="px-2 py-3 text-sm text-gray-500">{product.specs?.importDate ? new Date(product.specs.importDate).toLocaleDateString('ru-RU') : '-'}</td>
                                    <td className="px-2 py-3 text-sm text-gray-500">{product.specs?.productionDate ? new Date(product.specs.productionDate).toLocaleDateString('ru-RU') : '-'}</td>
                                    <td className="px-2 py-3 text-sm text-gray-500">
                                        {product.specs?.receiptDocument ? (
                                            <button
                                                onClick={() => openDocument(product.specs.receiptDocument)}
                                                className="text-indigo-600 hover:text-indigo-900 hover:underline"
                                                disabled={docLoading}
                                            >
                                                {product.specs.receiptDocument}
                                            </button>
                                        ) : '-'}
                                    </td>
                                    <td className="px-2 py-3 text-sm text-gray-500">{product.specs?.referenceCode || '-'}</td>
                                    <td className="px-2 py-3 text-sm text-gray-500">
                                        {product.trackSerials ? (
                                            <button 
                                                onClick={() => setViewingSerialsForProduct(product)}
                                                className="text-indigo-600 hover:text-indigo-900 underline text-xs font-medium"
                                            >
                                                Показать единицы
                                            </button>
                                        ) : '-'}
                                    </td>
                                    <td className="px-2 py-3 text-center">
                                        <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                            {product.currentStock} {product.unit || 'шт'}
                                        </span>
                                    </td>
                                    <td className="px-2 py-3 text-right text-sm text-gray-500">
                                        {(product.currentStock * product.purchasePrice).toLocaleString()} ₸
                                    </td>
                                    <td className="relative py-3 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 whitespace-nowrap">
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => setEditingProduct({ ...product })}
                                                className="text-indigo-600 hover:text-indigo-900"
                                                title="Редактировать"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(product.id)}
                                                className="text-red-600 hover:text-red-900"
                                                title="Удалить"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredProducts.length === 0 && (
                                <tr>
                                    <td colSpan={17} className="py-8 text-center text-sm text-gray-500">
                                        Товары не найдены
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Edit Modal */}
            {editingProduct && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setEditingProduct(null)}></div>
                        
                        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
                            <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                                <div className="flex justify-between items-center mb-5">
                                    <h3 className="text-lg font-semibold leading-6 text-gray-900">
                                        Редактирование товара
                                    </h3>
                                    <button onClick={() => setEditingProduct(null)} className="text-gray-400 hover:text-gray-500">
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                                
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="sm:col-span-2">
                                        <label className="block text-sm font-medium leading-6 text-gray-900">Наименование *</label>
                                        <input
                                            type="text"
                                            value={editingProduct.name}
                                            onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                                            className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium leading-6 text-gray-900">Цена закупки (₸)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={editingProduct.purchasePrice || ''}
                                            onChange={(e) => setEditingProduct({...editingProduct, purchasePrice: Number(e.target.value)})}
                                            className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium leading-6 text-gray-900">Бренд</label>
                                        <input
                                            type="text"
                                            value={editingProduct.brand || ''}
                                            onChange={(e) => setEditingProduct({...editingProduct, brand: e.target.value})}
                                            className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium leading-6 text-gray-900">Модель</label>
                                        <input
                                            type="text"
                                            value={editingProduct.model || ''}
                                            onChange={(e) => setEditingProduct({...editingProduct, model: e.target.value})}
                                            className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium leading-6 text-gray-900">Диоптрийность</label>
                                        <input
                                            type="text"
                                            value={editingProduct.specs?.diopters || ''}
                                            onChange={(e) => handleSpecChange('diopters', e.target.value)}
                                            className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium leading-6 text-gray-900">Процентажность</label>
                                        <input
                                            type="text"
                                            value={editingProduct.specs?.percentage || ''}
                                            onChange={(e) => handleSpecChange('percentage', e.target.value)}
                                            className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium leading-6 text-gray-900">Срок годности</label>
                                        <input
                                            type="date"
                                            value={editingProduct.specs?.expirationDate ? new Date(editingProduct.specs.expirationDate).toISOString().split('T')[0] : ''}
                                            onChange={(e) => handleSpecChange('expirationDate', e.target.value ? new Date(e.target.value).toISOString() : '')}
                                            className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium leading-6 text-gray-900">Дата импорта</label>
                                        <input
                                            type="date"
                                            value={editingProduct.specs?.importDate ? new Date(editingProduct.specs.importDate).toISOString().split('T')[0] : ''}
                                            onChange={(e) => handleSpecChange('importDate', e.target.value ? new Date(e.target.value).toISOString() : '')}
                                            className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium leading-6 text-gray-900">Дата производства</label>
                                        <input
                                            type="date"
                                            value={editingProduct.specs?.productionDate ? new Date(editingProduct.specs.productionDate).toISOString().split('T')[0] : ''}
                                            onChange={(e) => handleSpecChange('productionDate', e.target.value ? new Date(e.target.value).toISOString() : '')}
                                            className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium leading-6 text-gray-900">Документ на приход</label>
                                        <input
                                            type="text"
                                            value={editingProduct.specs?.receiptDocument || ''}
                                            onChange={(e) => handleSpecChange('receiptDocument', e.target.value)}
                                            className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium leading-6 text-gray-900">Код референса</label>
                                        <input
                                            type="text"
                                            value={editingProduct.specs?.referenceCode || ''}
                                            onChange={(e) => handleSpecChange('referenceCode', e.target.value)}
                                            className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium leading-6 text-gray-900">Серийный номер</label>
                                        <input
                                            type="text"
                                            value={editingProduct.specs?.lot || ''}
                                            onChange={(e) => handleSpecChange('lot', e.target.value)}
                                            className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                                <button
                                    type="button"
                                    onClick={handleSaveEdit}
                                    disabled={isSaving}
                                    className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 sm:ml-3 sm:w-auto disabled:opacity-50"
                                >
                                    <Save className="h-4 w-4 mr-2" />
                                    {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditingProduct(null)}
                                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                                >
                                    Отмена
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {selectedDocument && (
                <DocumentViewerModal
                    document={selectedDocument}
                    allProducts={products}
                    onClose={() => setSelectedDocument(null)}
                />
            )}

            {viewingSerialsForProduct && (
                <UnitsModal
                    product={viewingSerialsForProduct}
                    onClose={() => setViewingSerialsForProduct(null)}
                />
            )}
        </div>
    );
}
