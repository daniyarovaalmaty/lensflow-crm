'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { OrderConstructor } from '@/components/order/OrderConstructor';
import { CharacteristicLabels } from '@/types/order';
import type { CreateOrderDTO, Order, Characteristic } from '@/types/order';
import { CheckCircle, Download, ArrowLeft, FileText } from 'lucide-react';

const PRICE_PER_LENS = 17500;

function generateInvoiceHTML(order: Order): string {
    const od = order.config.eyes.od;
    const os = order.config.eyes.os;
    const odQty = Number(od.qty) || 0;
    const osQty = Number(os.qty) || 0;
    const totalLenses = odQty + osQty;
    const totalPrice = totalLenses * PRICE_PER_LENS;
    const date = new Date(order.meta.created_at);
    const dateStr = date.toLocaleDateString('ru-RU');

    const renderEyeRow = (label: string, eye: any, qty: number) => `
        <tr>
            <td style="padding:10px 14px;border:1px solid #e5e7eb;">MediLens — ${label}</td>
            <td style="padding:10px 14px;border:1px solid #e5e7eb;text-align:center;">
                ${eye.characteristic ? (CharacteristicLabels[eye.characteristic as Characteristic] || eye.characteristic) : '—'},
                Km ${eye.km || '—'}, DIA ${eye.dia || '—'}, Dk ${eye.dk || '—'}
                ${eye.e1 != null ? ', E ' + eye.e1 + (eye.e2 != null ? '/' + eye.e2 : '') : ''}
                ${eye.tor != null ? ', Тог. ' + eye.tor : ''}
            </td>
            <td style="padding:10px 14px;border:1px solid #e5e7eb;text-align:center;">${qty}</td>
            <td style="padding:10px 14px;border:1px solid #e5e7eb;text-align:right;">${PRICE_PER_LENS.toLocaleString('ru-RU')} ₸</td>
            <td style="padding:10px 14px;border:1px solid #e5e7eb;text-align:right;font-weight:600;">${(qty * PRICE_PER_LENS).toLocaleString('ru-RU')} ₸</td>
        </tr>
    `;

    return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="utf-8">
    <title>Счёт на оплату ${order.order_id}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; padding: 40px; max-width: 800px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #2563eb; }
        .logo { font-size: 24px; font-weight: 700; color: #2563eb; }
        .logo-sub { font-size: 12px; color: #6b7280; margin-top: 4px; }
        .invoice-info { text-align: right; }
        .invoice-num { font-size: 20px; font-weight: 700; color: #111; }
        .invoice-date { font-size: 13px; color: #6b7280; margin-top: 4px; }
        .parties { display: flex; gap: 40px; margin-bottom: 30px; }
        .party { flex: 1; }
        .party-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin-bottom: 8px; font-weight: 600; }
        .party-name { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
        .party-detail { font-size: 13px; color: #4b5563; line-height: 1.6; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        th { background: #f3f4f6; padding: 10px 14px; border: 1px solid #e5e7eb; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #374151; text-align: left; }
        .totals { text-align: right; margin-bottom: 30px; }
        .totals .line { display: flex; justify-content: flex-end; gap: 40px; padding: 6px 0; font-size: 14px; }
        .totals .total-line { font-size: 18px; font-weight: 700; color: #111; border-top: 2px solid #e5e7eb; padding-top: 10px; margin-top: 6px; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
        .footer-note { font-size: 12px; color: #9ca3af; line-height: 1.6; }
        .stamp-area { display: flex; justify-content: space-between; margin-top: 50px; }
        .stamp-box { width: 45%; }
        .stamp-label { font-size: 12px; color: #6b7280; margin-bottom: 30px; }
        .stamp-line { border-bottom: 1px solid #000; width: 100%; height: 1px; }
        .stamp-name { font-size: 11px; color: #9ca3af; margin-top: 4px; }
        @media print {
            body { padding: 20px; }
            @page { margin: 15mm; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <div class="logo">LensFlow</div>
            <div class="logo-sub">Система управления заказами линз</div>
        </div>
        <div class="invoice-info">
            <div class="invoice-num">Счёт №${order.order_id}</div>
            <div class="invoice-date">от ${dateStr}</div>
        </div>
    </div>

    <div class="parties">
        <div class="party">
            <div class="party-label">Поставщик</div>
            <div class="party-name">ТОО «LensFlow»</div>
            <div class="party-detail">
                г. Алматы, ул. Абая 150<br>
                БИН: 123456789012<br>
                ИИК: KZ1234567890123456
            </div>
        </div>
        <div class="party">
            <div class="party-label">Покупатель</div>
            <div class="party-name">${order.company || order.meta.optic_name || 'Не указано'}</div>
            <div class="party-detail">
                ${order.inn ? 'БИН/ИИН: ' + order.inn + '<br>' : ''}
                Врач: ${order.meta.doctor || '—'}<br>
                Пациент: ${order.patient.name}
            </div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Наименование</th>
                <th style="text-align:center;">Параметры</th>
                <th style="text-align:center;">Кол-во</th>
                <th style="text-align:right;">Цена</th>
                <th style="text-align:right;">Сумма</th>
            </tr>
        </thead>
        <tbody>
            ${renderEyeRow('OD (Правый глаз)', od, odQty)}
            ${renderEyeRow('OS (Левый глаз)', os, osQty)}
        </tbody>
    </table>

    <div class="totals">
        <div class="line">
            <span>Всего линз:</span>
            <span>${totalLenses} шт.</span>
        </div>
        <div class="line total-line">
            <span>Итого к оплате:</span>
            <span>${totalPrice.toLocaleString('ru-RU')} ₸</span>
        </div>
    </div>

    <div class="footer">
        <p class="footer-note">
            Оплата должна быть произведена в течение 5 рабочих дней с даты выставления счёта.<br>
            При возникновении вопросов, свяжитесь с нами: info@lensflow.kz
        </p>
    </div>

    <div class="stamp-area">
        <div class="stamp-box">
            <div class="stamp-label">Поставщик:</div>
            <div class="stamp-line"></div>
            <div class="stamp-name">Подпись / Печать</div>
        </div>
        <div class="stamp-box">
            <div class="stamp-label">Покупатель:</div>
            <div class="stamp-line"></div>
            <div class="stamp-name">Подпись / Печать</div>
        </div>
    </div>
</body>
</html>`;
}

export default function NewOrderPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

    const subRole = session?.user?.subRole || '';
    const isDoctor = subRole === 'optic_doctor' || session?.user?.role === 'doctor';

    const opticId = 'OPT-001';

    const handleCreateOrder = async (data: CreateOrderDTO) => {
        try {
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
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
        const html = generateInvoiceHTML(createdOrder);
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Счёт_${createdOrder.order_id}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handlePrintInvoice = () => {
        if (!createdOrder) return;
        const html = generateInvoiceHTML(createdOrder);
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
        }
    };

    // ===== SUCCESS STATE =====
    if (createdOrder) {
        const odQty = Number(createdOrder.config.eyes.od.qty) || 0;
        const osQty = Number(createdOrder.config.eyes.os.qty) || 0;
        const totalPrice = (odQty + osQty) * PRICE_PER_LENS;

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

                        {/* Price + Invoice — only visible to clinic managers, NOT doctors */}
                        {!isDoctor && (
                            <>
                                <div className="bg-gray-50 rounded-xl p-4 mb-6 text-sm text-gray-700 space-y-1">
                                    <div className="flex justify-between">
                                        <span>Линз OD:</span>
                                        <span>{odQty} шт. — {(odQty * PRICE_PER_LENS).toLocaleString('ru-RU')} ₸</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Линз OS:</span>
                                        <span>{osQty} шт. — {(osQty * PRICE_PER_LENS).toLocaleString('ru-RU')} ₸</span>
                                    </div>
                                    <div className="flex justify-between font-semibold border-t border-gray-200 pt-2 mt-2 text-gray-900">
                                        <span>Итого:</span>
                                        <span>{totalPrice.toLocaleString('ru-RU')} ₸</span>
                                    </div>
                                </div>

                                <div className="space-y-3 mb-6">
                                    <button
                                        onClick={handleDownloadInvoice}
                                        className="btn btn-primary w-full gap-2"
                                    >
                                        <Download className="w-4 h-4" />
                                        Скачать счёт на оплату
                                    </button>
                                    <button
                                        onClick={handlePrintInvoice}
                                        className="btn btn-secondary w-full gap-2"
                                    >
                                        <FileText className="w-4 h-4" />
                                        Открыть для печати
                                    </button>
                                </div>
                            </>
                        )}

                        {/* Doctor sees a simple success message */}
                        {isDoctor && (
                            <p className="text-sm text-gray-500 mb-6">
                                Заказ передан в лабораторию. Вы можете отслеживать статус на дашборде.
                            </p>
                        )}

                        <button
                            onClick={() => router.push('/optic/dashboard')}
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

    // ===== ORDER FORM =====
    return (
        <div className="min-h-screen bg-surface py-8">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
                {/* Breadcrumb */}
                <nav className="mb-8">
                    <ol className="flex items-center gap-2 text-sm text-gray-600">
                        <li>
                            <a href="/optic/dashboard" className="hover:text-primary-500 transition-colors">
                                Дашборд
                            </a>
                        </li>
                        <li>/</li>
                        <li className="text-gray-900 font-medium">Новый заказ</li>
                    </ol>
                </nav>

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Создать новый заказ</h1>
                    <p className="text-gray-600">
                        Заполните параметры линз для пациента. Поля с * обязательны для заполнения.
                    </p>
                </div>

                {/* Order Constructor */}
                <OrderConstructor opticId={opticId} onSubmit={handleCreateOrder} />
            </div>
        </div>
    );
}
