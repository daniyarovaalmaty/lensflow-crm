'use client';

import { useState } from 'react';
import { Search, Package, ArrowRight, Building, FileText, Calendar, Box } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LotTrackingModule() {
    const [lotQuery, setLotQuery] = useState('');
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
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
                    <h2 className="text-lg font-medium text-gray-900">Поиск и история по LOT / Серийному номеру</h2>
                    <p className="text-sm text-gray-500 mt-1">Отследите куда и когда ушел товар по его LOT (например, 00AC00020) или части штрихкода.</p>
                </div>
            </div>

            <form onSubmit={handleSearch} className="flex gap-3 max-w-2xl">
                <div className="relative flex-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        value={lotQuery}
                        onChange={(e) => setLotQuery(e.target.value)}
                        className="block w-full rounded-md border-0 py-2.5 pl-10 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                        placeholder="Введите LOT или часть серийного номера (мин 3 символа)..."
                    />
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
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Товар / LOT</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Статус</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Приход</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Расход / Продажа</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {items.map((item) => (
                                <tr key={item.id}>
                                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                        <div className="font-semibold text-gray-900">{item.product?.name || 'Неизвестный товар'}</div>
                                        <div className="text-gray-500 text-xs mt-0.5">Артикул: {item.product?.sku || item.product?.model || '—'}</div>
                                        <div className="mt-2 inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-600/20">
                                            С/Н (LOT): {item.serialNumber}
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                        {getStatusLabel(item.status)}
                                    </td>
                                    <td className="px-3 py-4 text-sm text-gray-500">
                                        {item.receiptDoc ? (
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1.5 text-gray-900 font-medium">
                                                    <FileText className="w-3.5 h-3.5 text-gray-400" />
                                                    № {item.receiptDoc.documentNumber}
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
                                                    {item.wholesaleOrder.client?.name || '—'}
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
