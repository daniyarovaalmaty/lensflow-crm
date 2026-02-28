'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { CreateOrderSchema, type CreateOrderDTO } from '@/types/order';
import { EyeParametersCard } from './EyeParametersCard';
import { Copy, Package, User, Building2, Truck, Receipt, Zap, Clock, Plus, Minus, Droplets, Wrench, ShoppingCart, Camera } from 'lucide-react';

interface CatalogProduct {
    id: string;
    name: string;
    category: string;
    sku: string | null;
    description: string | null;
    price?: number; // undefined for doctors
    unit: string;
}

interface SelectedProduct {
    productId: string;
    name: string;
    category: string;
    qty: number;
    price: number;
}

const CATEGORY_ICONS: Record<string, any> = {
    lens: Package,
    solution: Droplets,
    accessory: Wrench,
};

const CATEGORY_COLORS: Record<string, string> = {
    lens: 'bg-blue-100 text-blue-700',
    solution: 'bg-emerald-100 text-emerald-700',
    accessory: 'bg-orange-100 text-orange-700',
};

const CATEGORY_LABELS: Record<string, string> = {
    lens: 'Линзы',
    solution: 'Растворы',
    accessory: 'Аксессуары',
};

interface OrderConstructorProps {
    opticId: string;
    onSubmit: (data: CreateOrderDTO & { products?: SelectedProduct[] }) => Promise<void>;
}

export function OrderConstructor({ opticId, onSubmit }: OrderConstructorProps) {
    const { data: session } = useSession();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Catalog
    const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
    const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
    const [rgpPhotos, setRgpPhotos] = useState<{ od?: File; os?: File }>({});
    const subRole = session?.user?.subRole || '';
    const canSeePrices = subRole !== 'optic_doctor';

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/catalog');
                if (res.ok) {
                    const data = await res.json();
                    setCatalog(data);
                }
            } catch (e) { console.error(e); }
        })();
    }, []);

    // Fetch organization profile for auto-fill
    useEffect(() => {
        if (!session?.user?.organizationId) return;
        (async () => {
            try {
                const res = await fetch('/api/profile');
                if (res.ok) {
                    const data = await res.json();
                    if (data.organization) {
                        const org = data.organization;
                        if (org.name) setValue('company', org.name);
                        if (org.inn) setValue('inn', org.inn);
                        if (org.address) setValue('delivery_address', org.address);
                    }
                }
            } catch (e) { console.error(e); }
        })();
    }, [session?.user?.organizationId]);

    // Lens products from catalog (matched by description field = characteristic code)
    const lensProducts = useMemo(() => catalog.filter(p => p.category === 'lens'), [catalog]);
    const additionalProducts = useMemo(() => catalog.filter(p => p.category !== 'lens'), [catalog]);

    // Map characteristic code → catalog product
    const getLensProduct = (characteristic: string) => {
        return lensProducts.find(p => p.description === characteristic);
    };

    const addProduct = (product: CatalogProduct) => {
        setSelectedProducts(prev => {
            const existing = prev.find(p => p.productId === product.id);
            if (existing) {
                return prev.map(p => p.productId === product.id ? { ...p, qty: p.qty + 1 } : p);
            }
            return [...prev, { productId: product.id, name: product.name, category: product.category, qty: 1, price: product.price || 0 }];
        });
    };

    const updateProductQty = (productId: string, delta: number) => {
        setSelectedProducts(prev => {
            return prev.map(p => {
                if (p.productId !== productId) return p;
                const newQty = p.qty + delta;
                return newQty <= 0 ? null! : { ...p, qty: newQty };
            }).filter(Boolean);
        });
    };

    const removeProduct = (productId: string) => {
        setSelectedProducts(prev => prev.filter(p => p.productId !== productId));
    };

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

    // Mirror OD to OS — set each field individually to trigger watchers
    const mirrorODtoOS = () => {
        const odValues = getValues('config.eyes.od');
        const fields = Object.keys(odValues) as Array<keyof typeof odValues>;
        fields.forEach(field => {
            setValue(`config.eyes.os.${field}` as any, odValues[field], { shouldValidate: true, shouldDirty: true });
        });
    };

    // Form submission
    const onFormSubmit = async (data: CreateOrderDTO) => {
        setIsSubmitting(true);
        try {
            await onSubmit({ ...data, products: selectedProducts.length > 0 ? selectedProducts : undefined });
        } finally {
            setIsSubmitting(false);
        }
    };

    const onFormError = (errs: any) => {
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
    const DISCOUNT_PCT = 5;
    const URGENT_SURCHARGE_PCT = 25;
    const isUrgent = watch('is_urgent');
    const odCharacteristic = watch('config.eyes.od.characteristic');
    const osCharacteristic = watch('config.eyes.os.characteristic');
    const odQty = Number(watch('config.eyes.od.qty')) || 0;
    const osQty = Number(watch('config.eyes.os.qty')) || 0;

    // Lens price from catalog based on characteristic
    const odLensProduct = getLensProduct(odCharacteristic || '');
    const osLensProduct = getLensProduct(osCharacteristic || '');
    const odLensPrice = (odLensProduct?.price || 0) * odQty;
    const osLensPrice = (osLensProduct?.price || 0) * osQty;
    const lensTotal = odLensPrice + osLensPrice;

    // Additional products total (solutions, accessories)
    const additionalTotal = selectedProducts.reduce((sum, p) => sum + p.price * p.qty, 0);
    const basePrice = lensTotal + additionalTotal;
    const discountAmt = Math.round(basePrice * DISCOUNT_PCT / 100);
    const priceAfterDiscount = basePrice - discountAmt;
    const urgentSurcharge = isUrgent ? Math.round(priceAfterDiscount * URGENT_SURCHARGE_PCT / 100) : 0;
    const totalPrice = priceAfterDiscount + urgentSurcharge;

    const isRgpOD = odCharacteristic === 'rgp';
    const isRgpOS = osCharacteristic === 'rgp';
    const hasAnyRgp = isRgpOD || isRgpOS;

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
                            <div className="text-xs opacity-70">2 часа на изменение</div>
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

            {/* Lens Type — shows lens products from catalog linked to characteristics */}
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
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Тип линз</h2>
                        <p className="text-sm text-gray-500">Выберите характеристику в параметрах глаз — товар определится автоматически</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {lensProducts.map(product => {
                        const isSelected = odLensProduct?.id === product.id || osLensProduct?.id === product.id;
                        const isRgp = product.description === 'rgp';
                        return (
                            <div
                                key={product.id}
                                className={`p-4 rounded-xl border-2 text-center transition-all ${isSelected
                                    ? 'border-primary-500 bg-primary-50'
                                    : 'border-gray-200 bg-gray-50'
                                    }`}
                            >
                                <p className="font-semibold text-sm text-gray-900">{product.name}</p>
                                {canSeePrices && (
                                    <p className={`text-xs mt-1 ${isRgp ? 'text-amber-600 font-medium' : 'text-gray-500'}`}>
                                        {isRgp ? 'Цена индивидуальная' : `${(product.price || 0).toLocaleString('ru-RU')} ₸/${product.unit}`}
                                    </p>
                                )}
                                {isSelected && (
                                    <span className="inline-block mt-2 text-xs font-semibold text-primary-600 bg-primary-100 px-2 py-0.5 rounded-full">
                                        Выбрано
                                    </span>
                                )}
                            </div>
                        );
                    })}
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

            {/* RGP Photo Upload — shown when any eye has RGP characteristic */}
            {hasAnyRgp && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="card border-2 border-amber-200 bg-amber-50/30"
                >
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                            <Camera className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">Фото для RGP</h2>
                            <p className="text-sm text-gray-500">Прикрепите фото/скан для индивидуального изготовления</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {isRgpOD && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">OD (Правый глаз)</label>
                                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-amber-300 rounded-xl cursor-pointer hover:border-amber-400 hover:bg-amber-50 transition-colors">
                                    <Camera className="w-8 h-8 text-amber-400 mb-2" />
                                    <span className="text-sm text-amber-600 font-medium">
                                        {rgpPhotos.od ? rgpPhotos.od.name : 'Загрузить фото'}
                                    </span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) setRgpPhotos(prev => ({ ...prev, od: file }));
                                        }}
                                    />
                                </label>
                            </div>
                        )}
                        {isRgpOS && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">OS (Левый глаз)</label>
                                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-amber-300 rounded-xl cursor-pointer hover:border-amber-400 hover:bg-amber-50 transition-colors">
                                    <Camera className="w-8 h-8 text-amber-400 mb-2" />
                                    <span className="text-sm text-amber-600 font-medium">
                                        {rgpPhotos.os ? rgpPhotos.os.name : 'Загрузить фото'}
                                    </span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) setRgpPhotos(prev => ({ ...prev, os: file }));
                                        }}
                                    />
                                </label>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

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

            {/* Additional Products (solutions, accessories only — lenses are auto-selected from characteristic) */}
            {additionalProducts.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.32 }}
                    className="card"
                >
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                            <ShoppingCart className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">Доп. товары</h2>
                            <p className="text-sm text-gray-500">Растворы, аксессуары и другое</p>
                        </div>
                    </div>

                    {/* Category groups (excluding lens) */}
                    {['solution', 'accessory'].map(cat => {
                        const catProducts = additionalProducts.filter(p => p.category === cat);
                        if (catProducts.length === 0) return null;
                        const CatIcon = CATEGORY_ICONS[cat] || Package;
                        return (
                            <div key={cat} className="mb-4 last:mb-0">
                                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                    <CatIcon className="w-4 h-4" />
                                    {CATEGORY_LABELS[cat] || cat}
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {catProducts.map(product => {
                                        const selected = selectedProducts.find(s => s.productId === product.id);
                                        return (
                                            <div
                                                key={product.id}
                                                className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${selected
                                                    ? 'border-primary-500 bg-primary-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-sm text-gray-900 truncate">{product.name}</div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {canSeePrices && product.price !== undefined && (
                                                            <span className="text-xs font-semibold text-gray-600">
                                                                {product.price.toLocaleString('ru-RU')} ₸/{product.unit}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {selected ? (
                                                    <div className="flex items-center gap-2 ml-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => updateProductQty(product.id, -1)}
                                                            className="w-7 h-7 rounded-lg bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                                                        >
                                                            <Minus className="w-3.5 h-3.5" />
                                                        </button>
                                                        <span className="text-sm font-bold w-6 text-center">{selected.qty}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => updateProductQty(product.id, 1)}
                                                            className="w-7 h-7 rounded-lg bg-primary-500 hover:bg-primary-600 text-white flex items-center justify-center transition-colors"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => addProduct(product)}
                                                        className="ml-3 w-7 h-7 rounded-lg bg-gray-100 hover:bg-primary-100 hover:text-primary-600 flex items-center justify-center transition-colors text-gray-400"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </motion.div>
            )}

            {/* Price Summary — hidden only for clinic doctors (optic_doctor) */}
            {canSeePrices && basePrice > 0 && (
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
                        {/* Lens prices from characteristic */}
                        {odLensProduct && (odLensProduct.price ?? 0) > 0 && (
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">OD: {odLensProduct.name} × {odQty}</span>
                                <span className="font-medium text-gray-900">{odLensPrice.toLocaleString('ru-RU')} ₸</span>
                            </div>
                        )}
                        {osLensProduct && (osLensProduct.price ?? 0) > 0 && (
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">OS: {osLensProduct.name} × {osQty}</span>
                                <span className="font-medium text-gray-900">{osLensPrice.toLocaleString('ru-RU')} ₸</span>
                            </div>
                        )}
                        {(isRgpOD || isRgpOS) && (
                            <div className="flex justify-between items-center text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                                <span>RGP — цена индивидуальная</span>
                                <span className="font-medium">по запросу</span>
                            </div>
                        )}

                        {/* Additional products */}
                        {selectedProducts.map(sp => (
                            <div key={sp.productId} className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">{sp.name}: {sp.qty} × {sp.price.toLocaleString('ru-RU')} ₸</span>
                                <span className="font-medium text-gray-900">
                                    {(sp.qty * sp.price).toLocaleString('ru-RU')} ₸
                                </span>
                            </div>
                        ))}

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
            )}

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
