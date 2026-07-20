'use client';

import React, { useState, useEffect } from 'react';
import { Search, Download, Box, Barcode, Edit2, Trash2, X, Save, ChevronDown, ChevronRight, LayoutGrid, List } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx-js-style';
import DocumentViewerModal from './SupplyModule/DocumentViewerModal';
import UnitsModal from './UnitsModal';
import ExpiryDateBadge from './ExpiryDateBadge';
import { translateCyrillicToEnglishLayout } from '@/lib/utils/keyboard-layout';
import { parseGS1Barcode } from '@/lib/utils/gs1Parser';

function FlexibleDateInput({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) {
    const [mode, setMode] = useState<'month' | 'date'>((value && value.length > 7) ? 'date' : 'month');
    return (
        <div>
            <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium leading-6 text-gray-900">{label}</label>
                <button 
                    type="button" 
                    onClick={(e) => {
                        e.preventDefault();
                        setMode(m => m === 'month' ? 'date' : 'month');
                        onChange('');
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800"
                >
                    {mode === 'month' ? 'Указать день' : 'Только месяц'}
                </button>
            </div>
            <input
                type={mode}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            />
        </div>
    );
}

const getDiopterButtonClass = (items: any[]) => {
    const validItems = items.filter((item: any) => item.quantity > 0 && item.expiryDate);
    if (validItems.length === 0) return 'bg-white text-gray-900 ring-gray-200 hover:bg-gray-50';
    
    const now = new Date().getTime();
    let minDiffMonths = Infinity;
    
    validItems.forEach((item: any) => {
        const expDate = new Date(item.expiryDate);
        if (!isNaN(expDate.getTime())) {
            const diffMs = expDate.getTime() - now;
            const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.44);
            if (diffMonths < minDiffMonths) {
                minDiffMonths = diffMonths;
            }
        }
    });

    if (minDiffMonths === Infinity) return 'bg-white text-gray-900 ring-gray-200 hover:bg-gray-50';

    if (minDiffMonths <= 0) return 'bg-red-100 text-red-800 ring-red-600/30 hover:bg-red-200';
    if (minDiffMonths <= 3) return 'bg-red-50 text-red-700 ring-red-600/20 hover:bg-red-100';
    if (minDiffMonths <= 6) return 'bg-yellow-50 text-yellow-700 ring-yellow-600/20 hover:bg-yellow-100';
    
    return 'bg-green-50 text-green-700 ring-green-600/20 hover:bg-green-100';
};

export default function ProductBalances() {
    const [viewMode, setViewMode] = useState<'list' | 'matrix'>('list');
    const [expandedDiopters, setExpandedDiopters] = useState<Set<string>>(new Set());
    const [expandedMatrixProducts, setExpandedMatrixProducts] = useState<Set<string>>(new Set());
    const [turnoverData, setTurnoverData] = useState<any[]>([]);
    const [turnoverLoading, setTurnoverLoading] = useState(false);

    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const [startDate, setStartDate] = useState(firstDay.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

    const fetchTurnover = async () => {
        try {
            setTurnoverLoading(true);
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            
            const res = await fetch(`/api/distributor/warehouse/balances/turnover?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch turnover');
            const data = await res.json();
            setTurnoverData(data);
        } catch (error) {
            toast.error('Ошибка загрузки оборотов');
        } finally {
            setTurnoverLoading(false);
        }
    };

    useEffect(() => {
        if (viewMode === 'matrix') {
            fetchTurnover();
        }
    }, [viewMode, startDate, endDate]);

    const toggleDiopterRow = (rowKey: string) => {
        const newSet = new Set(expandedDiopters);
        if (newSet.has(rowKey)) newSet.delete(rowKey);
        else newSet.add(rowKey);
        setExpandedDiopters(newSet);
    };

    const toggleMatrixProduct = (productId: string) => {
        const newSet = new Set(expandedMatrixProducts);
        if (newSet.has(productId)) newSet.delete(productId);
        else newSet.add(productId);
        setExpandedMatrixProducts(newSet);
    };

    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [barcodeSearch, setBarcodeSearch] = useState('');
    const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
    const [nameFilter, setNameFilter] = useState('all');
    
    const [batchSorts, setBatchSorts] = useState<Record<string, string>>({});

    const uniqueNames = Array.from(new Set(products.map(p => p.name).filter(Boolean))).sort();
    

    const [editingProduct, setEditingProduct] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState<any>(null);
    const [docLoading, setDocLoading] = useState(false);
    const [viewingSerialsForProduct, setViewingSerialsForProduct] = useState<any>(null);

    useEffect(() => {
        fetchBalances();
    }, []);

    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const toggleRow = (productId: string) => {
        const newSet = new Set(expandedRows);
        if (newSet.has(productId)) {
            newSet.delete(productId);
        } else {
            newSet.add(productId);
        }
        setExpandedRows(newSet);
    };

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
                retailPrice: editingProduct.retailPrice,
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


    const filteredProducts = products.filter(p => {
        const query = searchQuery.toLowerCase();
        const bSearch = barcodeSearch.toLowerCase();
        
        const matchesName = !query || 
               p.name?.toLowerCase().includes(query) || 
               p.brand?.toLowerCase().includes(query) || 
               p.model?.toLowerCase().includes(query) || 
               p.sku?.toLowerCase().includes(query) ||
               p.specs?.lot?.toLowerCase().includes(query);
               
        const matchesBarcode = !bSearch ||
               p.barcode?.toLowerCase().includes(bSearch) ||
               (p.stockItems && p.stockItems.some((si: any) => 
                   si.barcode?.toLowerCase().includes(bSearch) ||
                   si.serialNumber?.toLowerCase().includes(bSearch)
               ));
        
        const matchesStock = stockFilter === 'all' ||
            (stockFilter === 'in_stock' && p.currentStock > 0) ||
            (stockFilter === 'low_stock' && p.currentStock > 0 && p.currentStock <= (p.minStock || 3)) ||
            (stockFilter === 'out_of_stock' && p.currentStock === 0);

        const matchesNameFilter = nameFilter === 'all' || p.name === nameFilter;
        
        return matchesName && matchesBarcode && matchesStock && matchesNameFilter;
    });

    const sortBatches = (productId: string, batches: any[]) => {
        const currentSort = batchSorts[productId] || 'expiry_asc';
        return [...batches].sort((a, b) => {
            if (currentSort === 'expiry_asc') {
                if (!a.expiryDate) return 1;
                if (!b.expiryDate) return -1;
                return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
            }
            if (currentSort === 'expiry_desc') {
                if (!a.expiryDate) return 1;
                if (!b.expiryDate) return -1;
                return new Date(b.expiryDate).getTime() - new Date(a.expiryDate).getTime();
            }
            if (currentSort === 'diopters_asc') {
                const da = parseFloat(a.diopters) || 0;
                const db = parseFloat(b.diopters) || 0;
                return da - db;
            }
            if (currentSort === 'diopters_desc') {
                const da = parseFloat(a.diopters) || 0;
                const db = parseFloat(b.diopters) || 0;
                return db - da;
            }
            if (currentSort === 'size_asc') {
                const sa = parseFloat(a.size);
                const sb = parseFloat(b.size);
                if (!isNaN(sa) && !isNaN(sb)) return sa - sb;
                return String(a.size || '').localeCompare(String(b.size || ''));
            }
            if (currentSort === 'size_desc') {
                const sa = parseFloat(a.size);
                const sb = parseFloat(b.size);
                if (!isNaN(sa) && !isNaN(sb)) return sb - sa;
                return String(b.size || '').localeCompare(String(a.size || ''));
            }
            return 0;
        });
    };

    const handleExportExcel = () => {
        if (!turnoverData || turnoverData.length === 0) {
            toast.error('Нет данных для выгрузки');
            return;
        }

        const filteredTurnover = turnoverData.filter(p => {
            const q = searchQuery.toLowerCase();
            const matchesName = p.name.toLowerCase().includes(q) || 
                              (p.brand && p.brand.toLowerCase().includes(q)) ||
                              (p.model && p.model.toLowerCase().includes(q));
            const matchesNameFilter = nameFilter === 'all' || p.name === nameFilter;
            return matchesName && matchesNameFilter;
        });

        // Формирование данных для Excel
        const exportData: any[] = [];
        
        filteredTurnover.forEach((product) => {
            const fullName = product.name || '';

            let totalInitial = 0;
            let totalIn = 0;
            let totalOut = 0;
            let totalFinal = 0;

            product.turnover.forEach((data: any) => {
                exportData.push({
                    'Название товара': fullName,
                    'Диоптрия / Размер': data.diopter !== '-' ? data.diopter : '',
                    [startDate]: data.initial || 0,
                    'Приход': data.in || 0,
                    'Расход': data.out || 0,
                    'Факт': data.final || 0
                });

                totalInitial += (data.initial || 0);
                totalIn += (data.in || 0);
                totalOut += (data.out || 0);
                totalFinal += (data.final || 0);
            });

            // Добавляем строку итого по модели
            exportData.push({
                'Название товара': `Всего ${fullName}`,
                'Диоптрия / Размер': '',
                [startDate]: totalInitial,
                'Приход': totalIn,
                'Расход': totalOut,
                'Факт': totalFinal
            });
        });

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        
        // Настройка ширины колонок
        const wscols = [
            { wch: 30 }, // Модель
            { wch: 20 }, // dioptry / size
            { wch: 15 }, // Start Date
            { wch: 15 }, // Приход
            { wch: 15 }, // Расход
            { wch: 15 }, // Факт
        ];
        worksheet['!cols'] = wscols;

        // Стилизация: границы и выравнивание
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:F1');
        
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellRef = XLSX.utils.encode_cell({ c: C, r: R });
                if (!worksheet[cellRef]) continue;

                // Базовый стиль с границами
                const style: any = {
                    border: {
                        top: { style: "thin", color: { auto: 1 } },
                        bottom: { style: "thin", color: { auto: 1 } },
                        left: { style: "thin", color: { auto: 1 } },
                        right: { style: "thin", color: { auto: 1 } }
                    }
                };

                // Для первой строки (заголовков) добавляем выравнивание по центру
                if (R === 0) {
                    style.alignment = { horizontal: "center", vertical: "center" };
                    style.font = { bold: true };
                }

                worksheet[cellRef].s = style;
            }
        }

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Матрица по остаткам');
        
        XLSX.writeFile(workbook, `Остатки_${startDate}_${endDate}.xlsx`);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-gray-900">Остатки товара на складе</h2>
                <div className="flex items-center gap-4">
                    <div className="flex items-center rounded-md bg-gray-100 p-1">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium ${viewMode === 'list' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <List className="h-4 w-4 mr-2" />
                            Обычный вид
                        </button>
                        <button
                            onClick={() => setViewMode('matrix')}
                            className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium ${viewMode === 'matrix' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <LayoutGrid className="h-4 w-4 mr-2" />
                            Матрица по остаткам
                        </button>
                    </div>
                    {viewMode === 'matrix' && (
                        <button 
                            onClick={handleExportExcel}
                            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 hidden sm:inline-flex"
                        >
                            <Download className="h-4 w-4 mr-2 text-gray-500" />
                            Выгрузить в Excel
                        </button>
                    )}
                </div>
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
                        placeholder="Поиск по бренду или модели..."
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
                <select value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} className="rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6 pr-10"> <option value="all">Все товары</option> {uniqueNames.map((n: any) => (<option key={n} value={n}>{n}</option>))} </select>

                

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

                {viewMode === 'matrix' && (
                    <div className="flex gap-2 items-center bg-gray-50 p-1 rounded-md border border-gray-200 ml-auto">
                        <span className="text-xs text-gray-500 font-medium px-2">Период:</span>
                        <input 
                            type="date" 
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="rounded text-sm border-gray-300 py-1"
                        />
                        <span className="text-gray-400">-</span>
                        <input 
                            type="date" 
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="rounded text-sm border-gray-300 py-1"
                        />
                    </div>
                )}
            </div>

            {loading ? (
                <div className="animate-pulse space-y-4">
                    <div className="h-10 bg-gray-200 rounded w-full"></div>
                    <div className="h-10 bg-gray-200 rounded w-full"></div>
                    <div className="h-10 bg-gray-200 rounded w-full"></div>
                </div>
            ) : viewMode === 'list' ? (
                <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="py-2 pl-4 pr-3 text-left text-xs font-semibold text-gray-900 sm:pl-6">Название товара</th>
                                
                                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-900">Остаток</th>
                                <th className="px-2 py-2 text-right text-xs font-semibold text-gray-900">Сумма</th>
                                <th className="relative py-2 pl-3 pr-4 sm:pr-6"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {filteredProducts.map((product) => (
                                <><tr key={product.id} className="hover:bg-gray-50">
                                    <td className="py-3 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                        <div className="flex items-center gap-2">
                                            {product.stockItems?.length > 0 ? (
                                                <button onClick={() => toggleRow(product.id)} className="text-gray-400 hover:text-gray-600 focus:outline-none">
                                                    {expandedRows.has(product.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                </button>
                                            ) : (
                                                <div className="w-4" />
                                            )}
                                            {product.trackSerials ? <Barcode className="h-4 w-4 text-indigo-500 flex-shrink-0" /> : <Box className="h-4 w-4 text-gray-400 flex-shrink-0" />}
                                            <span className="min-w-0 break-words">{product.name}</span>
                                        </div>
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
                                {expandedRows.has(product.id) && (
                                    <>
                                        <tr className="bg-indigo-50/50 border-t border-b border-indigo-100">
                                            <td colSpan={5} className="py-2 px-4 text-sm text-gray-500">
                                                <div className="flex justify-end items-center gap-2">
                                                    <span className="text-xs text-gray-400 font-medium">Сортировка партий:</span>
                                                    <select
                                                        value={batchSorts[product.id] || 'expiry_asc'}
                                                        onChange={(e) => setBatchSorts({ ...batchSorts, [product.id]: e.target.value })}
                                                        className="block rounded-md border-0 py-1 pl-3 pr-8 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 text-xs sm:leading-6 bg-white shadow-sm"
                                                    >
                                                        {['contact_lens', 'spectacle_lens', 'iol', 'diagnostic_lens'].includes(product.category) ? (
                                                            <>
                                                                <option value="expiry_asc">По сроку годности (возрастание)</option>
                                                                <option value="expiry_desc">По сроку годности (убывание)</option>
                                                                <option value="diopters_asc">По диоптриям (возрастание)</option>
                                                                <option value="diopters_desc">По диоптриям (убывание)</option>
                                                            </>
                                                        ) : product.category === 'solution' ? (
                                                            <>
                                                                <option value="expiry_asc">По сроку годности (возрастание)</option>
                                                                <option value="expiry_desc">По сроку годности (убывание)</option>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <option value="expiry_asc">По сроку годности (возрастание)</option>
                                                                <option value="expiry_desc">По сроку годности (убывание)</option>
                                                                <option value="size_asc">По размеру (возрастание)</option>
                                                                <option value="size_desc">По размеру (убывание)</option>
                                                            </>
                                                        )}
                                                    </select>
                                                </div>
                                            </td>
                                        </tr>
                                        {sortBatches(product.id, product.stockItems || []).map((batch: any) => (
                                            <tr key={batch.id} className="bg-indigo-50/30">
                                        <td colSpan={2} className="py-3 pl-4 pr-3 text-sm text-gray-500 sm:pl-12 align-middle">
                                            <div className="flex items-center gap-6">
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-300"></span>
                                                    <span>Партия</span>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-gray-600">
                                                    <div>
                                                        <span className="text-gray-400 text-[10px] uppercase tracking-wider block leading-tight mb-0.5">Штрихкод партии</span>
                                                        <span className="font-medium text-indigo-600 leading-tight">{batch.serialNumber}</span>
                                                    </div>
                                                    {(() => {
                                                        const parsed = parseGS1Barcode(batch.serialNumber || '');
                                                        const sn = parsed.serialNumber || parsed.batchNumber;
                                                        return sn ? (
                                                            <div>
                                                                <span className="text-gray-400 text-[10px] uppercase tracking-wider block leading-tight mb-0.5">Серийный номер</span>
                                                                <span className="font-medium text-gray-900 leading-tight">{sn}</span>
                                                            </div>
                                                        ) : null;
                                                    })()}
                                                    {batch.diopters && (
                                                        <div>
                                                            <span className="text-gray-400 text-[10px] uppercase tracking-wider block leading-tight mb-0.5">Диоптрии</span>
                                                            <span className="leading-tight text-gray-700">{batch.diopters}</span>
                                                        </div>
                                                    )}
                                                    {batch.size && (
                                                        <div>
                                                            <span className="text-gray-400 text-[10px] uppercase tracking-wider block leading-tight mb-0.5">Размер</span>
                                                            <span className="leading-tight text-gray-700">{batch.size}</span>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <span className="text-gray-400 text-[10px] uppercase tracking-wider block leading-tight mb-0.5">Срок годности</span>
                                                        <div className="leading-tight">
                                                            <ExpiryDateBadge date={batch.expiryDate} />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-400 text-[10px] uppercase tracking-wider block leading-tight mb-0.5">Цена закупки ед.</span>
                                                        <span className="leading-tight text-gray-700">{(batch.purchasePrice || product.purchasePrice || 0).toLocaleString()} ₸</span>
                                                    </div>
                                                    {batch.receiptDocNumber && (
                                                        <div>
                                                            <span className="text-gray-400 text-[10px] uppercase tracking-wider block leading-tight mb-0.5">Документ прихода</span>
                                                            <a href={`/distributor/warehouse/documents/${batch.receiptDocId}`} className="text-indigo-600 hover:text-indigo-900 leading-tight flex items-center gap-1 group font-medium" title="Открыть документ">
                                                                <svg className="w-3 h-3 text-indigo-400 group-hover:text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                                № {batch.receiptDocNumber}
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-2 py-2 text-center">
                                            <span className="text-sm font-medium text-gray-700">{batch.quantity}</span>
                                        </td>
                                        <td className="px-2 py-2 text-right text-sm text-gray-500">
                                            {(batch.quantity * (batch.purchasePrice || product.purchasePrice || 0)).toLocaleString()} ₸
                                        </td>
                                        <td className="relative py-2 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 whitespace-nowrap">
                                        </td>
                                    </tr>
                                ))}
                                </>
                                )}
                                </>
                            ))}
                            {filteredProducts.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="py-8 text-center text-sm text-gray-500">
                                        Товары не найдены
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            ) : viewMode === 'matrix' && turnoverLoading ? (
                <div className="animate-pulse space-y-4">
                    <div className="h-10 bg-gray-200 rounded w-full"></div>
                    <div className="h-10 bg-gray-200 rounded w-full"></div>
                    <div className="h-10 bg-gray-200 rounded w-full"></div>
                </div>
            ) : viewMode === 'matrix' ? (
                <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300 border-separate border-spacing-0">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="sticky top-0 border-b border-gray-300 bg-gray-50 bg-opacity-75 py-3 pl-4 pr-3 text-left text-xs font-semibold text-gray-900 sm:pl-6 backdrop-blur backdrop-filter">Название товара</th>
                                <th className="sticky top-0 border-b border-gray-300 bg-gray-50 bg-opacity-75 px-3 py-3 text-left text-xs font-semibold text-gray-900 backdrop-blur backdrop-filter">Диоптрия</th>
                                <th className="sticky top-0 border-b border-gray-300 bg-gray-50 bg-opacity-75 px-3 py-3 text-center text-xs font-semibold text-gray-900 backdrop-blur backdrop-filter">Нач. остаток</th>
                                <th className="sticky top-0 border-b border-gray-300 bg-gray-50 bg-opacity-75 px-3 py-3 text-center text-xs font-semibold text-gray-900 backdrop-blur backdrop-filter text-green-700">Приход</th>
                                <th className="sticky top-0 border-b border-gray-300 bg-gray-50 bg-opacity-75 px-3 py-3 text-center text-xs font-semibold text-gray-900 backdrop-blur backdrop-filter text-red-700">Расход</th>
                                <th className="sticky top-0 border-b border-gray-300 bg-gray-50 bg-opacity-75 px-3 py-3 text-center text-xs font-semibold text-gray-900 backdrop-blur backdrop-filter">Факт (Остаток)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {turnoverData.filter(p => {
                                const q = searchQuery.toLowerCase();
                                const matchesName = p.name.toLowerCase().includes(q) || 
                                                  (p.brand && p.brand.toLowerCase().includes(q)) ||
                                                  (p.model && p.model.toLowerCase().includes(q));
                                const matchesNameFilter = nameFilter === 'all' || p.name === nameFilter;
                                return matchesName && matchesNameFilter;
                            }).map((product, idx) => {
                                  const totalInitial = product.turnover.reduce((sum: number, d: any) => sum + d.initial, 0);
                                  const totalIn = product.turnover.reduce((sum: number, d: any) => sum + d.in, 0);
                                  const totalOut = product.turnover.reduce((sum: number, d: any) => sum + d.out, 0);
                                  const totalFinal = product.turnover.reduce((sum: number, d: any) => sum + d.final, 0);

                                  return (
                                      <React.Fragment key={product.id}>
                                          <tr className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                              <td className="py-3 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 align-top">
                                                  <div className="flex items-center gap-2">
                                                      <button onClick={() => toggleMatrixProduct(product.id)} className="text-gray-400 hover:text-gray-600 focus:outline-none">
                                                          {expandedMatrixProducts.has(product.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                      </button>
                                                      {product.trackSerials ? <Barcode className="h-4 w-4 text-indigo-500 flex-shrink-0" /> : <Box className="h-4 w-4 text-gray-400 flex-shrink-0" />}
                                                      <div className="flex flex-col">
                                                          <span className="font-bold text-gray-900">{product.name}</span>
                                                          
                                                      </div>
                                                  </div>
                                              </td>
                                              <td className="px-3 py-3 text-sm text-gray-500 align-top">
                                              </td>
                                              <td className="px-3 py-3 text-center align-top">
                                                  <span className="inline-flex items-center rounded-md bg-yellow-100/50 px-2 py-1 text-xs font-medium text-gray-700 ring-1 ring-inset ring-yellow-400/50 shadow-sm">
                                                      {totalInitial}
                                                  </span>
                                              </td>
                                              <td className="px-3 py-3 text-center align-top">
                                                  <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium shadow-sm ${totalIn > 0 ? 'bg-green-100/50 text-green-700 ring-1 ring-inset ring-green-600/30' : 'text-gray-400'}`}>
                                                      {totalIn > 0 ? `+${totalIn}` : '0'}
                                                  </span>
                                              </td>
                                              <td className="px-3 py-3 text-center align-top">
                                                  <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium shadow-sm ${totalOut > 0 ? 'bg-red-100/50 text-red-700 ring-1 ring-inset ring-red-600/30' : 'text-gray-400'}`}>
                                                      {totalOut > 0 ? `-${totalOut}` : '0'}
                                                  </span>
                                              </td>
                                              <td className="px-3 py-3 text-center align-top">
                                                  <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-600/20 shadow-sm">
                                                      {totalFinal}
                                                  </span>
                                              </td>
                                          </tr>

                                          {expandedMatrixProducts.has(product.id) && product.turnover.map((data: any, dIdx: number) => {
                                              const rowKey = `${product.id}_${data.diopter}`;
                                              const isExpanded = expandedDiopters.has(rowKey);
                                              return (
                                        <React.Fragment key={rowKey}>
                                            <tr className={dIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                                                <td className="py-2 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-12 align-top border-l-2 border-indigo-200">
                                                </td>
                                                <td className="px-3 py-2 text-sm font-bold text-gray-900 align-top">
                                                    <button 
                                                        onClick={() => toggleDiopterRow(rowKey)}
                                                        className={`flex items-center gap-2 focus:outline-none px-2 py-1 rounded ring-1 shadow-sm transition-colors ${getDiopterButtonClass(data.items)}`}
                                                    >
                                                        {isExpanded ? <ChevronDown className="h-4 w-4 opacity-50" /> : <ChevronRight className="h-4 w-4 opacity-50" />}
                                                        {data.diopter !== '-' ? data.diopter : 'Без диоптрий'}
                                                    </button>
                                                </td>
                                                <td className="px-3 py-2 text-center align-top">
                                                    <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-300 shadow-sm">
                                                        {data.initial}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-center align-top">
                                                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium shadow-sm ${data.in > 0 ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20' : 'text-gray-400'}`}>
                                                        {data.in > 0 ? `+${data.in}` : '0'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-center align-top">
                                                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium shadow-sm ${data.out > 0 ? 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20' : 'text-gray-400'}`}>
                                                        {data.out > 0 ? `-${data.out}` : '0'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-center align-top">
                                                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-600/20 shadow-sm">
                                                        {data.final}
                                                    </span>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr className="bg-indigo-50/30">
                                                    <td colSpan={6} className="p-0 border-b border-indigo-100">
                                                        <div className="pl-6 sm:pl-12 pr-6 py-4">
                                                            <table className="min-w-full divide-y divide-indigo-100 bg-white shadow-sm ring-1 ring-gray-200 rounded-lg overflow-hidden">
                                                                <thead className="bg-gray-50">
                                                                    <tr>
                                                                        <th className="py-2 pl-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Партия (С/Н)</th>
                                                                        <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Срок годности</th>
                                                                        <th className="py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Нач. остаток</th>
                                                                        <th className="py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider text-green-700">Приход</th>
                                                                        <th className="py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider text-red-700">Расход</th>
                                                                        <th className="py-2 pr-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Факт (Остаток)</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-indigo-50">
                                                                    {sortBatches(product.id, data.items).map((batch: any) => (
                                                                        <tr key={batch.id} className="hover:bg-gray-50">
                                                                            <td className="py-2 pl-4 text-sm text-gray-900 font-medium">
                                                                                {(() => {
                                                                                    const parsed = parseGS1Barcode(batch.serialNumber || '');
                                                                                    return parsed.serialNumber || parsed.batchNumber || batch.serialNumber;
                                                                                })()}
                                                                            </td>
                                                                            <td className="py-2 text-sm text-gray-500">
                                                                                <ExpiryDateBadge date={batch.expiryDate} />
                                                                            </td>
                                                                            <td className="py-2 text-center text-sm font-medium text-gray-700">
                                                                                {batch.initial}
                                                                            </td>
                                                                            <td className="py-2 text-center text-sm font-medium">
                                                                                <span className={batch.in > 0 ? 'text-green-600' : 'text-gray-400'}>
                                                                                    {batch.in > 0 ? `+${batch.in}` : '0'}
                                                                                </span>
                                                                            </td>
                                                                            <td className="py-2 text-center text-sm font-medium">
                                                                                <span className={batch.out > 0 ? 'text-red-600' : 'text-gray-400'}>
                                                                                    {batch.out > 0 ? `-${batch.out}` : '0'}
                                                                                </span>
                                                                            </td>
                                                                            <td className="py-2 pr-4 text-sm font-bold text-gray-900 text-right">
                                                                                {batch.quantity}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                    {data.items.length === 0 && (
                                                                        <tr>
                                                                            <td colSpan={6} className="py-4 text-center text-sm text-gray-500">
                                                                                Нет доступных партий в наличии
                                                                            </td>
                                                                        </tr>
                                                                    )}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </React.Fragment>
                        );
                    })}
                            {turnoverData.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="py-8 text-center text-sm text-gray-500">
                                        Нет движений за выбранный период
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            ) : null}

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
                                        <label className="block text-sm font-medium leading-6 text-gray-900">Бренд *</label>
                                        <input
                                            type="text"
                                            value={editingProduct.name}
                                            onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                                            className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                        />
                                    </div>
                                    
                                    <div className="sm:col-span-2">
                                        <label className="block text-sm font-medium leading-6 text-gray-900">Модель</label>
                                        <input
                                            type="text"
                                            value={editingProduct.model || ''}
                                            onChange={(e) => setEditingProduct({...editingProduct, model: e.target.value})}
                                            className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                        />
                                    </div>

                                    <div className="sm:col-span-2 grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium leading-6 text-gray-900">Закупочная цена (₸)</label>
                                            <input
                                                type="number"
                                                value={editingProduct.purchasePrice || ''}
                                                onChange={(e) => setEditingProduct({...editingProduct, purchasePrice: Number(e.target.value)})}
                                                className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium leading-6 text-gray-900">Розничная цена (₸)</label>
                                            <input
                                                type="number"
                                                value={editingProduct.retailPrice || ''}
                                                onChange={(e) => setEditingProduct({...editingProduct, retailPrice: Number(e.target.value)})}
                                                className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                        </div>
                                    </div>

                                    {!editingProduct.trackSerials && (
                                        <>
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
                                                <FlexibleDateInput
                                                    label="Срок годности"
                                                    value={editingProduct.specs?.expirationDate || ''}
                                                    onChange={(val) => handleSpecChange('expirationDate', val)}
                                                />
                                            </div>

                                            <div>
                                                <FlexibleDateInput
                                                    label="Дата импорта"
                                                    value={editingProduct.specs?.importDate || ''}
                                                    onChange={(val) => handleSpecChange('importDate', val)}
                                                />
                                            </div>

                                            <div>
                                                <FlexibleDateInput
                                                    label="Дата производства"
                                                    value={editingProduct.specs?.productionDate || ''}
                                                    onChange={(val) => handleSpecChange('productionDate', val)}
                                                />
                                            </div>
                                        </>
                                    )}
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
                    onUpdated={fetchBalances}
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
