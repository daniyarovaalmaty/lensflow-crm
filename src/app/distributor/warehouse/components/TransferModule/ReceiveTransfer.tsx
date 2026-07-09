'use client';

import { useState, useEffect } from 'react';
import { Download, CheckCircle, Package } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ReceiveTransfer({ onSuccess }: { onSuccess: () => void }) {
    const [incomingTransfers, setIncomingTransfers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchIncoming();
    }, []);

    const fetchIncoming = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/distributor/warehouse/documents?type=transfer_out&status=draft');
            if (res.ok) {
                const data = await res.json();
                setIncomingTransfers(data.documents || []);
            }
        } catch (error) {
            toast.error('Ошибка загрузки входящих трансферов');
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async (id: string) => {
        try {
            const res = await fetch(`/api/distributor/warehouse/documents/${id}/accept`, {
                method: 'POST'
            });
            if (!res.ok) throw new Error('Failed to accept transfer');
            
            toast.success('Трансфер успешно принят');
            fetchIncoming();
            onSuccess();
        } catch (error) {
            toast.error('Ошибка приемки трансфера');
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-gray-900">Приемка входящих трансферов</h2>
            </div>

            {loading ? (
                <div className="animate-pulse space-y-4">
                    <div className="h-10 bg-gray-200 rounded w-full"></div>
                </div>
            ) : (
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Отправитель</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Номер документа</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Дата отправки</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Кол-во товаров</th>
                                <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                    <span className="sr-only">Действия</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {incomingTransfers.map((transfer) => (
                                <tr key={transfer.id}>
                                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                        <div className="flex items-center">
                                            <Package className="h-5 w-5 text-gray-400 mr-2" />
                                            {transfer.organization?.name || 'Неизвестный склад'}
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{transfer.documentNumber}</td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                        {new Date(transfer.createdAt).toLocaleDateString('ru-RU')}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                        {transfer.items?.length || 0} позиций
                                    </td>
                                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                        <button 
                                            onClick={() => handleAccept(transfer.id)}
                                            className="inline-flex items-center text-indigo-600 hover:text-indigo-900"
                                        >
                                            <CheckCircle className="h-4 w-4 mr-1" /> Принять
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {incomingTransfers.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-sm text-gray-500">
                                        Нет ожидающих приемки трансферов
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
