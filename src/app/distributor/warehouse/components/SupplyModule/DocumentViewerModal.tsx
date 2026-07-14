import { X, Box, Barcode } from 'lucide-react';

interface DocumentViewerModalProps {
    document: any;
    allProducts?: any[];
    onClose: () => void;
}

export default function DocumentViewerModal({ document, allProducts, onClose }: DocumentViewerModalProps) {
    if (!document) return null;

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
                            <h3 className="text-xl font-semibold leading-6 text-gray-900 mb-6">
                                Детали поставки №{document.documentNumber}
                            </h3>
                            
                            <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded-lg">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Поставщик</p>
                                    <p className="mt-1 text-sm text-gray-900">{document.counterpartyName || 'Не указан'}</p>
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
                                {(() => {
                                    let decl: any = {};
                                    try { decl = JSON.parse(document.notes || '{}'); } catch {}
                                    return (
                                        <>
                                            {decl.documentDate && (
                                                <div>
                                                    <p className="text-sm font-medium text-gray-500">Дата накладной</p>
                                                    <p className="mt-1 text-sm text-gray-900">
                                                    {(() => {
                                                        const parts = decl.documentDate.split('-');
                                                        if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
                                                        if (parts.length === 2) return `${parts[1]}.${parts[0]}`;
                                                        return decl.documentDate;
                                                    })()}
                                                    </p>
                                                </div>
                                            )}
                                            {decl.declarationNumber && (
                                                <div>
                                                    <p className="text-sm font-medium text-gray-500">Номер декларации</p>
                                                    <p className="mt-1 text-sm text-gray-900">{decl.declarationNumber}</p>
                                                </div>
                                            )}
                                            {decl.declarationDate && (
                                                <div>
                                                    <p className="text-sm font-medium text-gray-500">Дата декларации</p>
                                                    <p className="mt-1 text-sm text-gray-900">{decl.declarationDate}</p>
                                                </div>
                                            )}
                                            {decl.userNotes && (
                                                <div className="col-span-2">
                                                    <p className="text-sm font-medium text-gray-500">Примечание</p>
                                                    <p className="mt-1 text-sm text-gray-900">{decl.userNotes}</p>
                                                </div>
                                            )}
                                            {Object.keys(decl).length === 0 && document.notes && (
                                                <div className="col-span-2">
                                                    <p className="text-sm font-medium text-gray-500">Примечание</p>
                                                    <p className="mt-1 text-sm text-gray-900">{document.notes}</p>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
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
                                                                <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10 mb-1 w-fit block">
                                                                    С/Н (Партия): {item.batchBarcode}
                                                                </span>
                                                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500">
                                                                    {item.batchExpiration && <span>Срок: {new Date(item.batchExpiration).toLocaleDateString('ru-RU')}</span>}
                                                                    {item.batchProduction && <span>Произв: {new Date(item.batchProduction).toLocaleDateString('ru-RU')}</span>}
                                                                    {item.batchDiopters && <span>Диоптрии: {item.batchDiopters}</span>}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {item.trackSerials && item.serialNumbers && item.serialNumbers.length > 0 && (
                                                            <div className="mt-2 text-xs text-gray-500 flex gap-1 flex-wrap items-center">
                                                                <span className="text-gray-400 mr-1">С/Н:</span>
                                                                {item.serialNumbers.map((sn: string) => (
                                                                    <span key={sn} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-100">{sn}</span>
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
