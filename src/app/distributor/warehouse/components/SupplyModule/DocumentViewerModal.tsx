import { X, Box, Barcode, Edit2, Check, Loader2 } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { formatGS1Barcode } from '@/lib/utils/gs1Parser';

interface DocumentViewerModalProps {
    document: any;
    allProducts?: any[];
    onClose: () => void;
    onUpdated?: () => void;
}

export default function DocumentViewerModal({ document, allProducts, onClose, onUpdated }: DocumentViewerModalProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    const [counterpartyName, setCounterpartyName] = useState(document?.counterpartyName || '');
    const [decl, setDecl] = useState<any>(() => {
        try { return JSON.parse(document?.notes || '{}'); } catch { return {}; }
    });

    if (!document) return null;

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(`/api/distributor/warehouse/documents/${document.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...document, // existing document fields
                    counterpartyName,
                    notes: JSON.stringify(decl),
                })
            });
            
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to update');
            }
            
            toast.success('Реквизиты обновлены');
            setIsEditing(false);
            if (onUpdated) onUpdated();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Ошибка при сохранении');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
                
                <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl sm:p-6">
                    <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                        <button
                            type="button"
                            className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                            onClick={onClose}
                        >
                            <span className="sr-only">Закрыть</span>
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    <div>
                        <div className="mt-3 text-center sm:mt-0 sm:text-left">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-semibold leading-6 text-gray-900">
                                    Детали поставки №{document.documentNumber}
                                </h3>
                                {document.status === 'confirmed' && (
                                    isEditing ? (
                                        <div className="flex space-x-2 pr-6">
                                            <button
                                                onClick={() => setIsEditing(false)}
                                                className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                                            >
                                                Отмена
                                            </button>
                                            <button
                                                onClick={handleSave}
                                                disabled={isSaving}
                                                className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-sm font-medium rounded text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:opacity-50"
                                            >
                                                {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                                                Сохранить
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none mr-6"
                                        >
                                            <Edit2 className="w-4 h-4 mr-1" />
                                            Изменить реквизиты
                                        </button>
                                    )
                                )}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded-lg">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Поставщик</p>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={counterpartyName}
                                            onChange={(e) => setCounterpartyName(e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        />
                                    ) : (
                                        <p className="mt-1 text-sm text-gray-900">{counterpartyName || 'Не указан'}</p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Дата создания</p>
                                    <p className="mt-1 text-sm text-gray-900">{new Date(document.createdAt).toLocaleString('ru-RU')}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Статус</p>
                                    <p className="mt-1 text-sm">
                                        {document.status === 'confirmed' ? (
                                            <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Проведен</span>
                                        ) : (
                                            <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">Черновик</span>
                                        )}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Общая сумма</p>
                                    <p className="mt-1 text-lg font-semibold text-gray-900">{document.totalAmount.toLocaleString()} ₸</p>
                                </div>
                                
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Дата накладной</p>
                                    {isEditing ? (
                                        <input
                                            type="date"
                                            value={decl.documentDate || ''}
                                            onChange={(e) => setDecl({ ...decl, documentDate: e.target.value })}
                                            className="mt-1 block w-full rounded-md border-gray-300 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        />
                                    ) : (
                                        <p className="mt-1 text-sm text-gray-900">
                                            {decl.documentDate ? (() => {
                                                const parts = decl.documentDate.split('-');
                                                if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
                                                if (parts.length === 2) return `${parts[1]}.${parts[0]}`;
                                                return decl.documentDate;
                                            })() : '—'}
                                        </p>
                                    )}
                                </div>
                                
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Номер декларации</p>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={decl.declarationNumber || ''}
                                            onChange={(e) => setDecl({ ...decl, declarationNumber: e.target.value })}
                                            className="mt-1 block w-full rounded-md border-gray-300 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                            placeholder="Например, 10502010/120524/1234567"
                                        />
                                    ) : (
                                        <p className="mt-1 text-sm text-gray-900">{decl.declarationNumber || '—'}</p>
                                    )}
                                </div>
                                
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Дата декларации</p>
                                    {isEditing ? (
                                        <input
                                            type="date"
                                            value={decl.declarationDate || ''}
                                            onChange={(e) => setDecl({ ...decl, declarationDate: e.target.value })}
                                            className="mt-1 block w-full rounded-md border-gray-300 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        />
                                    ) : (
                                        <p className="mt-1 text-sm text-gray-900">{decl.declarationDate || '—'}</p>
                                    )}
                                </div>

                                <div className="col-span-2">
                                    <p className="text-sm font-medium text-gray-500">Примечание</p>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={decl.userNotes || document.notes || ''}
                                            onChange={(e) => setDecl({ ...decl, userNotes: e.target.value })}
                                            className="mt-1 block w-full rounded-md border-gray-300 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        />
                                    ) : (
                                        <p className="mt-1 text-sm text-gray-900">{decl.userNotes || document.notes || '—'}</p>
                                    )}
                                </div>
                            </div>

                            <div className="mt-4">
                                <h4 className="text-md font-medium text-gray-900 mb-3">Товары в поставке</h4>
                                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                                    <table className="min-w-full divide-y divide-gray-300">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Товар</th>
                                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Учет</th>
                                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Кол-во</th>
                                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Цена</th>
                                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Сумма</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 bg-white">
                                            {(document.items || []).map((item: any, idx: number) => {
                                                const product = allProducts?.find(p => p.id === item.productId);
                                                return (
                                                <tr key={idx}>
                                                    <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                                        <div className="font-medium">{item.name || item.productName || 'Неизвестный товар'}</div>
                                                        {product && (
                                                            <div className="mt-1 text-xs text-gray-500">
                                                                {product.model && <span className="mr-3">Модель: {product.model}</span>}
                                                            </div>
                                                        )}
                                                        {item.batchBarcode && (
                                                            <div className="mt-1.5 space-y-1">
                                                                <div className="inline-flex flex-col items-start rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10 mb-1 w-fit">
                                                                    <span className="text-indigo-400 mb-0.5">Штрихкод партии:</span>
                                                                    {formatGS1Barcode(item.batchBarcode).map((block, i) => (
                                                                        <span key={i} className="block">{block}</span>
                                                                    ))}
                                                                </div>
                                                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500">
                                                                    {item.batchExpiration && <span>Срок: {new Date(item.batchExpiration).toLocaleDateString('ru-RU')}</span>}
                                                                    {item.batchProduction && <span>С/Н: {item.batchProduction}</span>}
                                                                    {item.batchDiopters && <span>Диоптрии: {item.batchDiopters}</span>}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {item.trackSerials && item.serialNumbers && item.serialNumbers.length > 0 && (
                                                            <div className="mt-2 text-xs text-gray-500 flex gap-1 flex-wrap items-center">
                                                                <span className="text-gray-400 mr-1">С/Н:</span>
                                                                {item.serialNumbers.map((sn: string, idx: number) => (
                                                                    <div key={idx} className="px-1.5 py-1 bg-indigo-50 text-indigo-700 rounded border border-indigo-100 flex flex-col items-center">
                                                                        {formatGS1Barcode(sn).map((block, i) => (
                                                                            <span key={i}>{block}</span>
                                                                        ))}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                        {item.trackSerials ? <span title="Серийный учет"><Barcode className="h-4 w-4 text-indigo-500" /></span> : <span title="Партионный учет"><Box className="h-4 w-4 text-gray-400" /></span>}
                                                    </td>
                                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{item.qty}</td>
                                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{item.price?.toLocaleString()} ₸</td>
                                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 font-medium">{((item.qty || 0) * (item.price || 0)).toLocaleString()} ₸</td>
                                                </tr>
                                                );
                                            })}
                                            {(!document.items || document.items.length === 0) && (
                                                <tr>
                                                    <td colSpan={5} className="py-4 text-center text-sm text-gray-500">
                                                        В этой накладной нет товаров (или старый формат)
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
