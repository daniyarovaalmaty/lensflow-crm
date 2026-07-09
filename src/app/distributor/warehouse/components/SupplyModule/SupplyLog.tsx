'use client';

import { useState, useEffect } from 'react';
import { Eye, Edit, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SupplyLog() {
    const [documents, setDocuments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/distributor/warehouse/documents?type=receipt');
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setDocuments(data.documents || []);
        } catch (error) {
            toast.error('Ошибка загрузки журнала');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-gray-900">Журнал поставок</h2>
                <div className="flex space-x-2">
                    <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Подтвержденные</span>
                    <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">Черновики</span>
                </div>
            </div>

            {loading ? (
                <div className="animate-pulse flex space-x-4">
                    <div className="flex-1 space-y-4 py-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="space-y-3">
                            <div className="h-4 bg-gray-200 rounded"></div>
                            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Номер документа</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Дата</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Поставщик</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Сумма</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Статус</th>
                                <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                    <span className="sr-only">Действия</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {documents.map((doc) => (
                                <tr key={doc.id}>
                                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">{doc.documentNumber}</td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                        {new Date(doc.createdAt).toLocaleDateString('ru-RU')}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{doc.counterpartyName || 'Не указан'}</td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{doc.totalAmount.toLocaleString()} ₸</td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                                        {doc.status === 'confirmed' ? (
                                            <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Проведен</span>
                                        ) : (
                                            <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">Черновик</span>
                                        )}
                                    </td>
                                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                        <button className="text-indigo-600 hover:text-indigo-900 mr-4">
                                            {doc.status === 'confirmed' ? <Eye className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {documents.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="py-4 text-center text-sm text-gray-500">
                                        Нет поставок
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
