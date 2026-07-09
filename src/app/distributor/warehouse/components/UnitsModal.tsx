import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface UnitsModalProps {
    product: any;
    onClose: () => void;
}

export default function UnitsModal({ product, onClose }: UnitsModalProps) {
    const [units, setUnits] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUnits = async () => {
            try {
                setLoading(true);
                const res = await fetch(`/api/distributor/warehouse/products/${product.id}/stock-items`);
                if (!res.ok) throw new Error('Failed to fetch stock items');
                const data = await res.json();
                setUnits(data.stockItems || []);
            } catch (error) {
                toast.error('Ошибка загрузки единиц товара');
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchUnits();
    }, [product.id]);

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex min-h-screen items-end justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
                
                <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>
                
                <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:align-middle">
                    <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold leading-6 text-gray-900" id="modal-title">
                                Единицы на балансе: {product.name}
                            </h3>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                        
                        {loading ? (
                            <div className="flex justify-center items-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                            </div>
                        ) : (
                            <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg max-h-[60vh] overflow-y-auto">
                                <table className="min-w-full divide-y divide-gray-300">
                                    <thead className="bg-gray-50 sticky top-0 z-10">
                                        <tr>
                                            <th className="py-3 pl-4 pr-3 text-left text-xs font-semibold text-gray-900 sm:pl-6">Серийный номер (партия)</th>
                                            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-900">Уникальный штрихкод</th>
                                            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-900">Статус</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {units.map((unit) => (
                                            <tr key={unit.id} className="hover:bg-gray-50">
                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                                    {unit.serialNumber || '-'}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    {unit.barcode || '-'}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    {unit.status === 'in_stock' ? (
                                                        <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                                            В наличии
                                                        </span>
                                                    ) : (
                                                        unit.status
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {units.length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="py-8 text-center text-sm text-gray-500">
                                                    Единицы не найдены
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
