'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { OrderConstructor } from '@/components/order/OrderConstructor';
import type { CreateOrderDTO, Order } from '@/types/order';
import { CheckCircle, Download, ArrowLeft, FileText } from 'lucide-react';

const PRICE_PER_LENS = 17500;

export default function DistributorNewOrderPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

    const dashboardUrl = '/distributor';

    const handleCreateOrder = async (data: CreateOrderDTO) => {
        try {
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errBody = await response.json().catch(() => ({}));
                throw new Error(errBody.error || `Ошибка ${response.status}`);
            }

            const order = await response.json();
            setCreatedOrder(order);
        } catch (error: any) {
            console.error('Error creating order:', error);
            alert(error.message || 'Ошибка при создании заказа');
        }
    };

    const handleDownloadInvoice = () => {
        if (!createdOrder) return;
        import('@/lib/generateInvoicePdf').then(({ generateInvoicePdf }) => {
            generateInvoicePdf({
                order_id: createdOrder.order_id,
                patient: createdOrder.patient,
                meta: createdOrder.meta,
                company: createdOrder.company,
                config: createdOrder.config,
                is_urgent: createdOrder.is_urgent,
                total_price: createdOrder.total_price,
                discount_percent: (createdOrder as any).discount_percent,
                document_name_od: (createdOrder as any).document_name_od,
                document_name_os: (createdOrder as any).document_name_os,
                price_od: (createdOrder as any).price_od,
                price_os: (createdOrder as any).price_os,
                products: (createdOrder as any).products,
            });
        });
    };

    if (createdOrder) {
        const odQty = Number((createdOrder.config?.eyes?.od || { qty: 0 }).qty) || 0;
        const osQty = Number((createdOrder.config?.eyes?.os || { qty: 0 }).qty) || 0;
        const totalPrice = createdOrder.total_price || (odQty + osQty) * PRICE_PER_LENS;

        return (
            <div className="min-h-screen bg-surface py-12">
                <div className="max-w-lg mx-auto px-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="card text-center"
                    >
                        <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-5">
                            <CheckCircle className="w-8 h-8" />
                        </div>

                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Заказ создан!</h1>
                        <p className="text-gray-600 mb-1">Номер заказа:</p>
                        <p className="text-lg font-semibold text-primary-600 mb-4">{createdOrder.order_id}</p>

                        <div className="bg-gray-50 rounded-xl p-4 mb-6 text-sm text-gray-700 space-y-1">
                            <div className="flex justify-between">
                                <span>Линз OD:</span>
                                <span>{odQty} шт.</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Линз OS:</span>
                                <span>{osQty} шт.</span>
                            </div>
                            <div className="flex justify-between font-semibold border-t border-gray-200 pt-2 mt-2 text-gray-900">
                                <span>Итого:</span>
                                <span>{totalPrice.toLocaleString('ru-RU')} ₸</span>
                            </div>
                        </div>

                        <div className="space-y-3 mb-6">
                            <button onClick={handleDownloadInvoice} className="btn btn-primary w-full gap-2">
                                <Download className="w-4 h-4" />
                                Скачать счёт на оплату
                            </button>
                        </div>

                        <button
                            onClick={() => router.push(dashboardUrl)}
                            className="text-sm text-gray-500 hover:text-primary-600 transition-colors flex items-center justify-center gap-1 mx-auto"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Вернуться на дашборд
                        </button>
                    </motion.div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-surface py-8">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
                <nav className="mb-8">
                    <ol className="flex items-center gap-2 text-sm text-gray-600">
                        <li>
                            <a href={dashboardUrl} className="hover:text-primary-500 transition-colors">
                                Дашборд
                            </a>
                        </li>
                        <li>/</li>
                        <li className="text-gray-900 font-medium">Новый заказ</li>
                    </ol>
                </nav>

                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Создать новый заказ</h1>
                    <p className="text-gray-600">
                        Заполните параметры линз для пациента. Поля с * обязательны для заполнения.
                    </p>
                </div>

                <OrderConstructor opticId="DIST-001" onSubmit={handleCreateOrder} />
            </div>
        </div>
    );
}
