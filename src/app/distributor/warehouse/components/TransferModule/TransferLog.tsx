'use client';

import { useState, useEffect } from 'react';
import { Eye, Edit, CheckCircle, ArrowRightLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TransferLog() {
    const [documents, setDocuments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTransfers();
    }, []);

    const fetchTransfers = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/distributor/warehouse/documents?type=transfer');
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
                <h2 className="text-lg font-medium text-gray-900">Журнал трансферов</h2>
            </div>

            {loading ? (
                <div className="animate-pulse space-y-4">
                    <div className="h-10 bg-gray-200 rounded w-full"></div>
                    <div className="h-10 bg-gray-200 rounded w-full"></div>
                </div>
            ) : (
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Направление</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Документ</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Дата</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Контрагент (Склад)</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Статус</th>
                                <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {documents.map((doc) => (
                                <tr key={doc.id}>
                                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                        {doc.type === 'transfer_out' ? (
                                            <span className="inline-flex items-center text-orange-600"><ArrowRightLeft className="mr-1 h-4 w-4" /> Исходящий</span>
                                        ) : (
                                            <span className="inline-flex items-center text-green-600"><ArrowRightLeft className="mr-1 h-4 w-4" /> Входящий</span>
                                        )}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">{doc.documentNumber}</td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                        {new Date(doc.createdAt).toLocaleDateString('ru-RU')}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                        {doc.targetOrganization?.name || doc.organization?.name || 'Неизвестно'}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                                        {doc.status === 'confirmed' ? (
                                            <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Проведен</span>
                                        ) : (
                                            <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">В пути / Черновик</span>
                                        )}
                                    </td>
                                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                        <button className="text-indigo-600 hover:text-indigo-900 mr-4">
                                            <Eye className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {documents.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="py-4 text-center text-sm text-gray-500">
                                        Нет трансферов
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
