'use client';

import { useState, useEffect } from 'react';
import { Search, Download, Box, Barcode } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProductBalances() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

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

    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-gray-900">Остатки товара на складе</h2>
                <button className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                    <Download className="h-4 w-4 mr-2 text-gray-500" />
                    Выгрузить в Excel
                </button>
            </div>

            <div className="mb-6 relative">
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

            {loading ? (
                <div className="animate-pulse space-y-4">
                    <div className="h-10 bg-gray-200 rounded w-full"></div>
                    <div className="h-10 bg-gray-200 rounded w-full"></div>
                    <div className="h-10 bg-gray-200 rounded w-full"></div>
                </div>
            ) : (
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Наименование</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Артикул</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Тип учета</th>
                                <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Остаток</th>
                                <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Сумма (закуп)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {filteredProducts.map((product) => (
                                <tr key={product.id}>
                                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                        {product.name}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{product.sku || '-'}</td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                        {product.trackSerials ? (
                                            <span className="inline-flex items-center gap-1 text-indigo-600"><Barcode className="h-4 w-4"/> Серийный</span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-gray-500"><Box className="h-4 w-4"/> Количественный</span>
                                        )}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 font-semibold text-right">
                                        {product.currentStock} {product.unit}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-right">
                                        {(product.currentStock * product.purchasePrice).toLocaleString()} ₸
                                    </td>
                                </tr>
                            ))}
                            {filteredProducts.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-sm text-gray-500">
                                        Товары не найдены
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
