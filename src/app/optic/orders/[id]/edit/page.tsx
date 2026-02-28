'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, User, Building2, Truck, FileText, Eye, Copy } from 'lucide-react';
import Link from 'next/link';
import type { CreateOrderDTO } from '@/types/order';
import { EyeParametersCard } from '@/components/order/EyeParametersCard';

interface OrderData {
    order_id: string;
    meta: { optic_id: string; optic_name: string; doctor: string; created_at: string };
    patient: { name: string; phone: string; email?: string; notes?: string };
    config: any;
    company?: string;
    inn?: string;
    delivery_method?: string;
    delivery_address?: string;
    doctor_email?: string;
    status: string;
    is_urgent: boolean;
    edit_deadline?: string;
    notes?: string;
}

export default function EditOrderPage() {
    const params = useParams();
    const router = useRouter();
    const { data: session } = useSession();
    const orderId = params.id as string;

    const [order, setOrder] = useState<OrderData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const { register, watch, setValue, handleSubmit, reset, formState: { errors } } = useForm<CreateOrderDTO>();

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`/api/orders/${orderId}`);
                if (!res.ok) {
                    setError(res.status === 404 ? 'Заказ не найден' : 'Ошибка загрузки заказа');
                    return;
                }
                const data: OrderData = await res.json();
                setOrder(data);

                // Pre-fill form with existing data
                reset({
                    patient: {
                        name: data.patient?.name || '',
                        phone: data.patient?.phone || '',
                        email: data.patient?.email || '',
                    },
                    company: data.company || '',
                    inn: data.inn || '',
                    delivery_method: data.delivery_method || '',
                    delivery_address: data.delivery_address || '',
                    doctor_email: data.doctor_email || '',
                    notes: data.notes || '',
                    config: data.config || {
                        eyes: {
                            od: { qty: 0, characteristic: '' },
                            os: { qty: 0, characteristic: '' },
                        },
                    },
                } as any);

                // Check editability
                if (data.status !== 'new') {
                    setError('Заказ уже нельзя редактировать — он в обработке');
                }
                if (data.is_urgent && data.edit_deadline && new Date() >= new Date(data.edit_deadline)) {
                    setError('Время редактирования истекло');
                }
            } catch {
                setError('Ошибка сети');
            } finally {
                setLoading(false);
            }
        })();
    }, [orderId, reset]);

    const mirrorODtoOS = () => {
        const od = watch('config.eyes.od');
        if (od) {
            const qtyOS = watch('config.eyes.os.qty');
            Object.entries(od).forEach(([key, val]) => {
                if (key !== 'qty') setValue(`config.eyes.os.${key}` as any, val);
            });
            setValue('config.eyes.os.qty', qtyOS);
        }
    };

    const onSubmit = async (formData: CreateOrderDTO) => {
        setSaving(true);
        setError('');
        try {
            const res = await fetch(`/api/orders/${orderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patient: formData.patient,
                    company: formData.company,
                    inn: formData.inn,
                    delivery_method: formData.delivery_method,
                    delivery_address: formData.delivery_address,
                    notes: formData.notes || undefined,
                    config: formData.config,
                }),
            });
            if (res.ok) {
                setSuccess(true);
                setTimeout(() => router.push('/optic/dashboard'), 1500);
            } else {
                const data = await res.json();
                setError(data.error || 'Ошибка сохранения');
            }
        } catch {
            setError('Ошибка сети');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center text-gray-400">
                Загрузка заказа...
            </div>
        );
    }

    if (!order || (error && !watch('config'))) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <p className="text-red-500 text-lg">{error || 'Заказ не найден'}</p>
                <Link href="/optic/dashboard" className="text-blue-600 hover:underline flex items-center gap-1">
                    <ArrowLeft className="w-4 h-4" /> Назад к заказам
                </Link>
            </div>
        );
    }

    // Non-urgent orders: always editable while status is 'new'
    // Urgent orders: editable only within the edit deadline
    const isEditable = order.status === 'new' && (
        !order.is_urgent || !order.edit_deadline || new Date() < new Date(order.edit_deadline)
    );

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/optic/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900">Редактирование заказа</h1>
                            <p className="text-sm text-gray-500">{order.order_id}</p>
                        </div>
                    </div>
                    {isEditable && (
                        <button
                            onClick={handleSubmit(onSubmit)}
                            disabled={saving}
                            className="btn btn-primary flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            {saving ? 'Сохранение...' : 'Сохранить'}
                        </button>
                    )}
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
                {success && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm"
                    >
                        ✅ Заказ успешно обновлён. Перенаправление...
                    </motion.div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
                        {error}
                    </div>
                )}

                {!isEditable && !error && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-xl text-sm">
                        Заказ нельзя редактировать
                    </div>
                )}

                {/* Patient */}
                <fieldset disabled={!isEditable} className="card p-5 space-y-4">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                        <User className="w-4 h-4 text-blue-500" /> Пациент
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ФИО пациента</label>
                            <input type="text" {...register('patient.name')} className="input" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                            <input type="tel" {...register('patient.phone')} className="input" />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input type="email" {...register('patient.email')} className="input" />
                        </div>
                    </div>
                </fieldset>

                {/* Eye Parameters — using the same EyeParametersCard component as new order form */}
                <fieldset disabled={!isEditable} className="space-y-6">
                    <EyeParametersCard
                        eye="od"
                        label="OD (Правый глаз)"
                        register={register}
                        errors={errors}
                        watch={watch}
                        setValue={setValue}
                    />

                    {/* Mirror Button */}
                    <div className="flex justify-center">
                        <button
                            type="button"
                            onClick={mirrorODtoOS}
                            className="btn btn-secondary gap-2"
                            disabled={!isEditable}
                        >
                            <Copy className="w-4 h-4" />
                            Копировать параметры OD → OS
                        </button>
                    </div>

                    <EyeParametersCard
                        eye="os"
                        label="OS (Левый глаз)"
                        register={register}
                        errors={errors}
                        watch={watch}
                        setValue={setValue}
                    />
                </fieldset>

                {/* Company */}
                <fieldset disabled={!isEditable} className="card p-5 space-y-4">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-blue-500" /> Компания
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
                            <input type="text" {...register('company')} className="input" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ИИН/БИН</label>
                            <input type="text" {...register('inn')} className="input" />
                        </div>
                    </div>
                </fieldset>

                {/* Delivery */}
                <fieldset disabled={!isEditable} className="card p-5 space-y-4">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                        <Truck className="w-4 h-4 text-blue-500" /> Доставка
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Способ доставки</label>
                            <select {...register('delivery_method')} className="input">
                                <option value="">Не указан</option>
                                <option value="pickup">Самовывоз</option>
                                <option value="delivery">Доставка</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Адрес доставки</label>
                            <input type="text" {...register('delivery_address')} className="input" />
                        </div>
                    </div>
                </fieldset>

                {/* Notes */}
                <fieldset disabled={!isEditable} className="card p-5 space-y-4">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-500" /> Примечания
                    </h3>
                    <textarea
                        {...register('notes')}
                        className="input min-h-[80px]"
                        placeholder="Дополнительные заметки к заказу..."
                    />
                </fieldset>

                {/* Bottom save button */}
                {isEditable && (
                    <div className="flex justify-end gap-3 pb-8">
                        <Link href="/optic/dashboard" className="btn btn-secondary">
                            Отмена
                        </Link>
                        <button
                            type="submit"
                            disabled={saving}
                            className="btn btn-primary flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            {saving ? 'Сохранение...' : 'Сохранить изменения'}
                        </button>
                    </div>
                )}
            </form>
        </div>
    );
}
