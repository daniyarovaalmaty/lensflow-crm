'use client';

import { useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { CreateOrderSchema, type CreateOrderDTO } from '@/types/order';
import { EyeParametersCard } from './EyeParametersCard';
import { Copy, Package, User, Building2, Truck, Receipt, Zap, Clock } from 'lucide-react';

const PRICE_PER_LENS = 40000; // тенге

interface OrderConstructorProps {
    opticId: string;
    onSubmit: (data: CreateOrderDTO) => Promise<void>;
}

export function OrderConstructor({ opticId, onSubmit }: OrderConstructorProps) {
    const { data: session } = useSession();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        getValues,
        watch,
        formState: { errors },
    } = useForm<CreateOrderDTO>({
        resolver: zodResolver(CreateOrderSchema),
        defaultValues: {
            optic_id: opticId,
            doctor: session?.user?.profile?.fullName || '',
            is_urgent: false,
            patient: {
                name: '',
                phone: '',
            },
            company: '',
            inn: '',
            delivery_method: '',
            delivery_address: '',
            doctor_email: '',
            config: {
                type: 'medilens',
                eyes: {
                    od: { qty: 1 },
                    os: { qty: 1 },
                },
            },
        },
    });

    // Mirror OD to OS
    const mirrorODtoOS = () => {
        const odValues = getValues('config.eyes.od');
        setValue('config.eyes.os', { ...odValues });
    };

    // Form submission
    const onFormSubmit = async (data: CreateOrderDTO) => {
        setIsSubmitting(true);
        try {
            await onSubmit(data);
        } finally {
            setIsSubmitting(false);
        }
    };

    const onFormError = (errs: any) => {
        // Don't use JSON.stringify — form error objects contain circular refs (React refs)
        console.error('Form validation errors:', errs);
        const extractMessages = (obj: any, prefix = ''): string[] => {
            const msgs: string[] = [];
            for (const key of Object.keys(obj)) {
                const path = prefix ? `${prefix}.${key}` : key;
                if (obj[key]?.message) msgs.push(`${path}: ${obj[key].message}`);
                else if (typeof obj[key] === 'object') msgs.push(...extractMessages(obj[key], path));
            }
            return msgs;
        };
        console.error('Validation summary:', extractMessages(errs).join('\n'));
    };

    // Price calculation
    const DISCOUNT_PCT = 5; // 5% постоянный клиент
    const URGENT_SURCHARGE_PCT = 25; // +25% за срочность
    const odQty = watch('config.eyes.od.qty') || 0;
    const osQty = watch('config.eyes.os.qty') || 0;
    const isUrgent = watch('is_urgent');
    const totalLenses = Number(odQty) + Number(osQty);
    const basePrice = totalLenses * PRICE_PER_LENS;
    const discountAmt = Math.round(basePrice * DISCOUNT_PCT / 100);
    const priceAfterDiscount = basePrice - discountAmt;
    const urgentSurcharge = isUrgent ? Math.round(priceAfterDiscount * URGENT_SURCHARGE_PCT / 100) : 0;
    const totalPrice = priceAfterDiscount + urgentSurcharge;

    return (
        <form onSubmit={handleSubmit(onFormSubmit, onFormError)} className="max-w-5xl mx-auto space-y-8">
            {/* Urgency Picker */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`card border-2 transition-colors ${isUrgent ? 'border-amber-400 bg-amber-50' : 'border-transparent'
                    }`}
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isUrgent ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500'
                        }`}>
                        {isUrgent ? <Zap className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Тип заказа</h2>
                        <p className="text-sm text-gray-500">
                            {isUrgent
                                ? 'Срочный — лаборатория может приступить сразу (+25% к стоимости)'
                                : 'Обычный — лаборатория начнёт через 2 часа (время на редактирование)'}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => setValue('is_urgent', false)}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${!isUrgent
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                            }`}
                    >
                        <Clock className="w-5 h-5 shrink-0" />
                        <div className="text-left">
                            <div className="font-semibold">Обычный</div>
                            <div className="text-xs opacity-70">4 часа на изменение</div>
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => setValue('is_urgent', true)}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${isUrgent
                            ? 'border-amber-500 bg-amber-50 text-amber-700'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                            }`}
                    >
                        <Zap className="w-5 h-5 shrink-0" />
                        <div className="text-left">
                            <div className="font-semibold">Срочный</div>
                            <div className="text-xs opacity-70">Начнут сразу</div>
                        </div>
                    </button>
                </div>

                {/* Hidden input for react-hook-form */}
                <input type="hidden" {...register('is_urgent', { setValueAs: v => v === true || v === 'true' })} />
            </motion.div>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card"
            >
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                        <Building2 className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">Информация о заказе</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1.5">
                            Компания
                        </label>
                        <input
                            id="company"
                            type="text"
                            {...register('company')}
                            className="input"
                            placeholder="Ozat clinic"
                        />
                    </div>

                    <div>
                        <label htmlFor="inn" className="block text-sm font-medium text-gray-700 mb-1.5">
                            ИНН
                        </label>
                        <input
                            id="inn"
                            type="text"
                            {...register('inn')}
                            className="input"
                            placeholder="ИНН компании"
                        />
                    </div>

                    <div>
                        <label htmlFor="delivery_method" className="block text-sm font-medium text-gray-700 mb-1.5">
                            Способ доставки
                        </label>
                        <input
                            id="delivery_method"
                            type="text"
                            {...register('delivery_method')}
                            className="input"
                            placeholder="Курьер, самовывоз..."
                        />
                    </div>

                    <div>
                        <label htmlFor="delivery_address" className="block text-sm font-medium text-gray-700 mb-1.5">
                            Адрес доставки
                        </label>
                        <input
                            id="delivery_address"
                            type="text"
                            {...register('delivery_address')}
                            className="input"
                            placeholder="Астана, Пр. Мангилик ел 27"
                        />
                    </div>
                </div>
            </motion.div>

            {/* Patient Information */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="card"
            >
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
                        <User className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">Пациент и врач</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="patient-name" className="block text-sm font-medium text-gray-700 mb-1.5">
                            Пациент *
                        </label>
                        <input
                            id="patient-name"
                            type="text"
                            {...register('patient.name')}
                            className="input"
                            placeholder="Даир Мансур"
                        />
                        {errors.patient?.name && (
                            <p className="mt-1 text-sm text-red-600">{errors.patient.name.message}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="patient-phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                            Телефон *
                        </label>
                        <input
                            id="patient-phone"
                            type="tel"
                            {...register('patient.phone')}
                            className="input"
                            placeholder="+7 900 000 00 00"
                        />
                        {errors.patient?.phone && (
                            <p className="mt-1 text-sm text-red-600">{errors.patient.phone.message}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="doctor" className="block text-sm font-medium text-gray-700 mb-1.5">
                            Врач
                        </label>
                        <input
                            id="doctor"
                            type="text"
                            {...register('doctor')}
                            className="input bg-gray-50"
                            placeholder={session?.user?.profile?.fullName || 'Войдите в систему'}
                            value={session?.user?.profile?.fullName || ''}
                            readOnly
                            disabled
                        />
                    </div>

                    <div>
                        <label htmlFor="doctor_email" className="block text-sm font-medium text-gray-700 mb-1.5">
                            Email врача
                        </label>
                        <input
                            id="doctor_email"
                            type="email"
                            {...register('doctor_email')}
                            className="input"
                            placeholder="doctor@clinic.com"
                        />
                    </div>
                </div>
            </motion.div>

            {/* Lens Type */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="card"
            >
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                        <Package className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">Тип линз</h2>
                </div>

                <div className="grid grid-cols-1 gap-3">
                    <div className="p-4 rounded-lg border-2 border-primary-500 bg-primary-50 text-primary-700 text-center">
                        <p className="font-semibold text-lg">MediLens</p>
                        <p className="text-sm text-primary-500">Ортокератологическая</p>
                    </div>
                </div>
            </motion.div>

            {/* Eye Parameters */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-6"
            >
                {/* OD (Right Eye) */}
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
                    >
                        <Copy className="w-4 h-4" />
                        Копировать параметры OD → OS
                    </button>
                </div>

                {/* OS (Left Eye) */}
                <EyeParametersCard
                    eye="os"
                    label="OS (Левый глаз)"
                    register={register}
                    errors={errors}
                    watch={watch}
                    setValue={setValue}
                />
            </motion.div>

            {/* Notes */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="card"
            >
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Комментарий
                </label>
                <textarea
                    id="notes"
                    {...register('notes')}
                    rows={3}
                    className="input resize-none"
                    placeholder="Любые дополнительные комментарии к заказу..."
                />
            </motion.div>

            {/* Price Summary */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="card border-2 border-primary-100"
            >
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                        <Receipt className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">Стоимость заказа</h2>
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">OD (Правый глаз): {Number(odQty)} шт. × {PRICE_PER_LENS.toLocaleString('ru-RU')} ₸</span>
                        <span className="font-medium text-gray-900">
                            {(Number(odQty) * PRICE_PER_LENS).toLocaleString('ru-RU')} ₸
                        </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">OS (Левый глаз): {Number(osQty)} шт. × {PRICE_PER_LENS.toLocaleString('ru-RU')} ₸</span>
                        <span className="font-medium text-gray-900">
                            {(Number(osQty) * PRICE_PER_LENS).toLocaleString('ru-RU')} ₸
                        </span>
                    </div>

                    {/* Discount row */}
                    <div className="flex justify-between items-center text-sm text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">
                        <span>Скидка постоянного клиента ({DISCOUNT_PCT}%)</span>
                        <span className="font-medium">-{discountAmt.toLocaleString('ru-RU')} ₸</span>
                    </div>

                    {/* Urgent surcharge */}
                    {isUrgent && (
                        <div className="flex justify-between items-center text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                            <span>Срочность (+{URGENT_SURCHARGE_PCT}%)</span>
                            <span className="font-medium">+{urgentSurcharge.toLocaleString('ru-RU')} ₸</span>
                        </div>
                    )}

                    <div className="border-t border-gray-200 pt-3 mt-3 flex justify-between items-center">
                        <span className="text-base font-semibold text-gray-900">Итого:</span>
                        <span className="text-xl font-bold text-primary-600">
                            {totalPrice.toLocaleString('ru-RU')} ₸
                        </span>
                    </div>
                </div>
            </motion.div>

            {/* Submit */}
            <div className="flex justify-end gap-4">
                <button type="button" className="btn btn-secondary">
                    Сохранить черновик
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn btn-primary"
                >
                    {isSubmitting ? 'Создание...' : 'Создать заказ'}
                </button>
            </div>
        </form>
    );
}
