import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';
import { notFound, redirect } from 'next/navigation';
import { format } from 'date-fns';

export default async function WholesaleInvoicePage({ params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user?.organizationId) {
        redirect('/login');
    }

    const order = await prisma.wholesaleOrder.findUnique({
        where: { id: params.id, organizationId: session.user.organizationId },
        include: {
            items: {
                include: {
                    product: true
                }
            },
            organization: true,
            counterparty: true,
        }
    });

    if (!order) {
        return notFound();
    }

    return (
        <div className="bg-white text-black min-h-screen p-8">
            <div className="max-w-4xl mx-auto border p-8 shadow-sm print:shadow-none print:border-none">
                {/* Print button (hidden when printing) */}
                <div className="flex justify-end mb-8 print:hidden">
                    <button 
                        onClick={() => typeof window !== 'undefined' && window.print()}
                        className="bg-indigo-600 text-white px-4 py-2 rounded shadow hover:bg-indigo-500"
                    >
                        Распечатать
                    </button>
                </div>

                <div className="text-center mb-8 border-b pb-4">
                    <h1 className="text-2xl font-bold">СЧЕТ НА ОПЛАТУ № {order.orderNumber}</h1>
                    <p className="text-lg mt-2">от {format(new Date(order.createdAt), 'dd.MM.yyyy')} г.</p>
                </div>

                <div className="mb-8 flex justify-between gap-8">
                    <div className="flex-1">
                        <h2 className="font-bold text-gray-700 mb-2 border-b pb-1">Поставщик</h2>
                        <div className="text-sm">
                            <p className="font-bold text-lg mb-1">{order.organization.name}</p>
                            {order.organization.bin && <p>БИН: {order.organization.bin}</p>}
                            <p>Регион: {order.organization.region}</p>
                        </div>
                    </div>
                    
                    <div className="flex-1">
                        <h2 className="font-bold text-gray-700 mb-2 border-b pb-1">Покупатель</h2>
                        <div className="text-sm">
                            {order.counterparty ? (
                                <>
                                    <p className="font-bold text-lg mb-1">{order.counterparty.name}</p>
                                    {order.counterparty.bin && <p>БИН: {order.counterparty.bin}</p>}
                                    <p>Регион: {order.counterparty.region}</p>
                                </>
                            ) : (
                                <p className="text-gray-500">Не указан</p>
                            )}
                        </div>
                    </div>
                </div>

                <table className="w-full text-left border-collapse mb-8 text-sm">
                    <thead>
                        <tr>
                            <th className="border border-gray-300 p-2 bg-gray-50">№</th>
                            <th className="border border-gray-300 p-2 bg-gray-50">Наименование товара, работ, услуг</th>
                            <th className="border border-gray-300 p-2 bg-gray-50">Кол-во</th>
                            <th className="border border-gray-300 p-2 bg-gray-50">Цена (₸)</th>
                            <th className="border border-gray-300 p-2 bg-gray-50">Сумма (₸)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {order.items.map((item, idx) => (
                            <tr key={item.id}>
                                <td className="border border-gray-300 p-2 text-center">{idx + 1}</td>
                                <td className="border border-gray-300 p-2">{item.product.name} {item.product.model ? `/ ${item.product.model}` : ''}</td>
                                <td className="border border-gray-300 p-2 text-center">{item.quantity}</td>
                                <td className="border border-gray-300 p-2 text-right">{item.price.toLocaleString()}</td>
                                <td className="border border-gray-300 p-2 text-right">{(item.quantity * item.price).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={4} className="border border-gray-300 p-2 text-right font-bold">Итого к оплате:</td>
                            <td className="border border-gray-300 p-2 text-right font-bold">{order.totalAmount.toLocaleString()}</td>
                        </tr>
                    </tfoot>
                </table>

                <div className="mt-16 flex justify-between gap-16 text-sm">
                    <div className="flex-1">
                        <div className="border-b border-black mb-1">Руководитель:</div>
                        <div className="text-xs text-gray-500 text-center">(подпись, ФИО)</div>
                    </div>
                    <div className="flex-1">
                        <div className="border-b border-black mb-1">М.П.</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
