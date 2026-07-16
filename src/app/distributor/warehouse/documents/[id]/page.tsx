import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, CheckCircle, Clock, Package, Barcode } from 'lucide-react';
import { formatGS1Barcode, parseGS1Barcode } from '@/lib/utils/gs1Parser';
import ExpiryDateBadge from '../../components/ExpiryDateBadge';

export default async function DocumentPage({ params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user?.organizationId) {
        redirect('/login');
    }

    const doc = await prisma.stockDocument.findUnique({
        where: { id: params.id, organizationId: session.user.organizationId }
    });

    if (!doc) {
        notFound();
    }

    const items = doc.items as any[] || [];

    // Parse JSON notes if it exists
    let parsedNotes: any = {};
    let isJsonNotes = false;
    if (doc.notes) {
        try {
            parsedNotes = JSON.parse(doc.notes);
            isJsonNotes = true;
        } catch (e) {
            isJsonNotes = false;
        }
    }

    const getDocumentTypeLabel = (type: string) => {
        switch (type) {
            case 'receipt': return 'Приходная накладная';
            case 'write_off': return 'Акт списания';
            case 'transfer_out': return 'Перемещение (Расход)';
            case 'transfer_in': return 'Перемещение (Приход)';
            case 'adjustment': return 'Корректировка';
            default: return type;
        }
    };

    return (
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/distributor/warehouse?tab=documents" className="text-gray-500 hover:text-gray-700 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                                Документ № {doc.documentNumber}
                            </h1>
                            {doc.status === 'confirmed' ? (
                                <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Проведен
                                </span>
                            ) : (
                                <span className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">
                                    <Clock className="w-3 h-3 mr-1" />
                                    Черновик
                                </span>
                            )}
                        </div>
                        <p className="mt-1 text-sm text-gray-500">
                            {getDocumentTypeLabel(doc.type)} от {new Date(doc.createdAt).toLocaleDateString('ru-RU')}
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-8 border-b border-gray-100 pb-8">
                    <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Контрагент</p>
                        <p className="text-sm text-gray-900">{doc.counterpartyName || '—'}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Сумма документа</p>
                        <p className="text-sm text-gray-900 font-semibold">{doc.totalAmount.toLocaleString()} ₸</p>
                    </div>
                    {doc.notes && (
                        <div className="col-span-2">
                            <p className="text-sm font-medium text-gray-500 mb-2">Дополнительная информация</p>
                            {isJsonNotes ? (
                                <div className="space-y-1 text-sm text-gray-900">
                                    {parsedNotes.documentDate && (
                                        <p><span className="text-gray-500">Дата накладной:</span> {(() => {
                                            const parts = parsedNotes.documentDate.split('-');
                                            if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
                                            if (parts.length === 2) return `${parts[1]}.${parts[0]}`;
                                            return parsedNotes.documentDate;
                                        })()}</p>
                                    )}
                                    {parsedNotes.declarationNumber && (
                                        <p><span className="text-gray-500">Номер декларации:</span> {parsedNotes.declarationNumber}</p>
                                    )}
                                    {parsedNotes.declarationDate && (
                                        <p><span className="text-gray-500">Дата декларации:</span> {parsedNotes.declarationDate}</p>
                                    )}
                                    {parsedNotes.userNotes && (
                                        <p><span className="text-gray-500">Примечание:</span> {parsedNotes.userNotes}</p>
                                    )}
                                    {!parsedNotes.declarationNumber && !parsedNotes.declarationDate && !parsedNotes.userNotes && !parsedNotes.documentDate && (
                                        <p className="text-gray-400 italic">Нет дополнительных данных</p>
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-900">{doc.notes}</p>
                            )}
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <h2 className="text-lg font-medium text-gray-900">Товары в документе</h2>
                    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                        <table className="min-w-full divide-y divide-gray-300">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Наименование</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Кол-во</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Цена</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Сумма</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {items.map((item: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                            <div className="flex items-center gap-3">
                                                {item.trackSerials ? <Barcode className="w-5 h-5 text-indigo-500" /> : <Package className="w-5 h-5 text-gray-400" />}
                                                <div>
                                                    <p className="font-semibold text-gray-900">{item.name}</p>
                                                    {(item.trackSerials && item.serialNumbers && item.serialNumbers.length > 0) ? (
                                                        <div className="mt-1 flex gap-1 flex-wrap">
                                                            {item.serialNumbers.map((sn: string) => (
                                                                <span key={sn} className="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">
                                                                    {sn}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : item.batchBarcode ? (
                                                        <div className="mt-1.5 space-y-2">
                                                            <div className="flex flex-wrap gap-4">
                                                                <div className="inline-flex flex-col items-start rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10 mb-1 w-fit">
                                                                    <span className="text-indigo-400 mb-0.5">Штрихкод партии:</span>
                                                                    {formatGS1Barcode(item.batchBarcode).map((block, i) => (
                                                                        <span key={i} className="block">{block}</span>
                                                                    ))}
                                                                </div>
                                                                {(() => {
                                                                    const parsed = parseGS1Barcode(item.batchBarcode);
                                                                    const extracted = parsed.serialNumber || parsed.batchNumber;
                                                                    if (!extracted) return null;
                                                                    return (
                                                                        <div className="inline-flex flex-col items-start rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 mb-1 w-fit h-fit">
                                                                            <span className="text-blue-400 mb-0.5">Серийный номер:</span>
                                                                            <span className="font-semibold">{extracted}</span>
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500 items-center">
                                                                {item.batchExpiration && (
                                                                    <div className="flex items-center gap-1">
                                                                        <span>Срок:</span>
                                                                        <ExpiryDateBadge date={item.batchExpiration} />
                                                                    </div>
                                                                )}
                                                                {item.batchProduction && <span>Произв: {new Date(item.batchProduction).toLocaleDateString('ru-RU')}</span>}
                                                                {item.batchDiopters && <span>Диоптрии: {item.batchDiopters}</span>}
                                                            </div>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{item.qty} шт</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{item.price?.toLocaleString() || 0} ₸</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900">
                                            {((item.qty || 0) * (item.price || 0)).toLocaleString()} ₸
                                        </td>
                                    </tr>
                                ))}
                                {items.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="py-8 text-center text-sm text-gray-500">
                                            Пустой документ
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
