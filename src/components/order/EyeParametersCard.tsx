'use client';

import { useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { Eye, Camera } from 'lucide-react';
import type { UseFormRegister, UseFormWatch, UseFormSetValue, FieldErrors } from 'react-hook-form';
import type { CreateOrderDTO } from '@/types/order';
import { CharacteristicLabels, ColorsByDk } from '@/types/order';

// ==================== Dropdown Ranges ====================
function generateRange(min: number, max: number, step: number, decimals: number): string[] {
    const arr: string[] = [];
    for (let v = min; v <= max + step / 2; v += step) {
        arr.push(v.toFixed(decimals));
    }
    return arr;
}

// Pre-compute all option arrays once
const TP_OPTIONS = generateRange(-25, 25, 0.25, 2);       // 201 options
const DIA_OPTIONS = generateRange(8.0, 13.0, 0.1, 1);      // 51 options
const E_OPTIONS = generateRange(0.30, 0.70, 0.01, 2);      // 41 options
const APICAL_OPTIONS = generateRange(-9, 9, 0.5, 1);       // 37 options
const QTY_OPTIONS = ['0', ...Array.from({ length: 10 }, (_, i) => String(i + 1))];

// ==================== Component ====================
interface EyeParametersCardProps {
    eye: 'od' | 'os';
    label: string;
    register: UseFormRegister<CreateOrderDTO>;
    errors: FieldErrors<CreateOrderDTO>;
    watch: UseFormWatch<CreateOrderDTO>;
    setValue: UseFormSetValue<CreateOrderDTO>;
    disabled?: boolean;
    rgpFile?: File | null;
    onRgpFileChange?: (file: File | null) => void;
}

export function EyeParametersCard({
    eye,
    label,
    register,
    errors,
    watch,
    setValue,
    disabled = false,
    rgpFile,
    onRgpFileChange,
}: EyeParametersCardProps) {
    const dkValue = watch(`config.eyes.${eye}.dk`);
    const characteristic = watch(`config.eyes.${eye}.characteristic`);
    const isRgp = watch(`config.eyes.${eye}.isRgp`) || false;
    const isTrial = dkValue === '50';
    const isSpherical = characteristic === 'spherical';

    // Track previous Dk value to only reset color on manual Dk changes
    const prevDkRef = useRef(dkValue);

    const availableColors = useMemo(() => {
        if (!dkValue) return [];
        return ColorsByDk[dkValue] || [];
    }, [dkValue]);

    useEffect(() => {
        setValue(`config.eyes.${eye}.trial`, isTrial);
    }, [dkValue, isTrial, eye, setValue]);

    // Only reset color when user manually changes Dk AND the current color is not valid for the new Dk
    useEffect(() => {
        if (prevDkRef.current && prevDkRef.current !== dkValue) {
            const currentColor = watch(`config.eyes.${eye}.color`);
            const newAvailable = dkValue ? (ColorsByDk[dkValue] || []) : [];
            // Only clear if the current color isn't valid for the new Dk
            if (currentColor && !newAvailable.includes(currentColor)) {
                setValue(`config.eyes.${eye}.color`, '');
            }
        }
        prevDkRef.current = dkValue;
    }, [dkValue, eye, setValue, watch]);

    const eyeColor = eye === 'od' ? 'blue' : 'purple';
    const borderAccent = eye === 'od' ? 'border-l-blue-400' : 'border-l-purple-400';

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`card border-l-4 ${borderAccent} relative ${disabled ? 'opacity-50' : ''}`}
        >
            {disabled && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 rounded-xl">
                    <span className="text-sm font-semibold text-gray-400 bg-gray-100 px-4 py-2 rounded-full">Не заказывается</span>
                </div>
            )}
            {/* Header */}
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${eye === 'od' ? 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600' : 'bg-gradient-to-br from-purple-50 to-purple-100 text-purple-600'}`}>
                    <Eye className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-base font-bold text-gray-900">{label}</h3>
                    <p className="text-xs text-gray-400">Параметры ортокератологической линзы</p>
                </div>
            </div>

            {/* Row 1: Характеристика + RGP checkbox + Km + TP + DIA */}
            <div className="space-y-5">
                <div className={`grid grid-cols-2 ${isRgp ? 'sm:grid-cols-3' : 'sm:grid-cols-4'} gap-3`}>
                    {/* Характеристика */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Характеристика <span className="text-red-500">*</span></label>
                        <select {...register(`config.eyes.${eye}.characteristic`)} className="input">
                            <option value="">— выберите —</option>
                            {Object.entries(CharacteristicLabels).map(([val, lbl]) => (
                                <option key={val} value={val}>{lbl}</option>
                            ))}
                        </select>
                    </div>

                    {/* RGP checkbox */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">RGP</label>
                        <div
                            onClick={() => setValue(`config.eyes.${eye}.isRgp`, !isRgp)}
                            className={`flex items-center h-[42px] px-3 rounded-lg border cursor-pointer transition-colors ${isRgp ? 'bg-amber-50 border-amber-300' : 'bg-gray-50 border-gray-200 hover:border-gray-300'}`}
                        >
                            <input
                                type="checkbox"
                                {...register(`config.eyes.${eye}.isRgp`)}
                                className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                            />
                            <span className={`ml-2 text-sm font-medium ${isRgp ? 'text-amber-700' : 'text-gray-400'}`}>
                                {isRgp ? 'Да' : 'Нет'}
                            </span>
                        </div>
                    </div>

                    {/* Km — hidden for RGP */}
                    {!isRgp && (
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Km <span className="text-red-500">*</span></label>
                            <input
                                type="number"
                                step="any"
                                {...register(`config.eyes.${eye}.km`, { valueAsNumber: true })}
                                className="input"
                                placeholder="44.50"
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">TP</label>
                        <input
                            type="number"
                            step="any"
                            {...register(`config.eyes.${eye}.tp`, { valueAsNumber: true })}
                            className="input"
                            placeholder="0.00"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">DIA <span className="text-red-500">*</span></label>
                        <input
                            type="number"
                            step="any"
                            {...register(`config.eyes.${eye}.dia`, { valueAsNumber: true })}
                            className="input"
                            placeholder="10.6"
                        />
                    </div>
                </div>

                {/* Row 2: E + Тог. + Dk + Пробная + Цвет */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {/* E — single for spherical, double (slash) for toric/RGP */}
                    <div className={isSpherical ? '' : 'col-span-2 sm:col-span-2'}>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                            {isSpherical ? 'E' : 'E (дробь)'}
                        </label>
                        {isSpherical ? (
                            <input
                                type="number"
                                step="any"
                                {...register(`config.eyes.${eye}.e1`, { valueAsNumber: true })}
                                className="input"
                                placeholder="0.00"
                            />
                        ) : (
                            <div className="flex items-center gap-1.5">
                                <input
                                    type="number"
                                    step="any"
                                    {...register(`config.eyes.${eye}.e1`, { valueAsNumber: true })}
                                    className="input"
                                    placeholder="0.00"
                                />
                                <span className="text-lg font-bold text-gray-400 flex-shrink-0">/</span>
                                <input
                                    type="number"
                                    step="any"
                                    {...register(`config.eyes.${eye}.e2`, { valueAsNumber: true })}
                                    className="input"
                                    placeholder="0.00"
                                />
                            </div>
                        )}
                    </div>

                    {/* Тог. — hidden for spherical */}
                    {!isSpherical && (
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Тог.</label>
                            <input
                                type="number"
                                step="any"
                                {...register(`config.eyes.${eye}.tor`, { valueAsNumber: true })}
                                className="input"
                                placeholder="0.00"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Dk <span className="text-red-500">*</span></label>
                        <select {...register(`config.eyes.${eye}.dk`)} className="input">
                            <option value="">—</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                            <option value="125">125</option>
                            <option value="180">180</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Пробная</label>
                        <div className={`flex items-center h-[42px] px-3 rounded-lg border transition-colors ${isTrial ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                            <input
                                type="checkbox"
                                {...register(`config.eyes.${eye}.trial`)}
                                checked={isTrial}
                                readOnly
                                className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                            <span className={`ml-2 text-sm font-medium ${isTrial ? 'text-green-700' : 'text-gray-400'}`}>
                                {isTrial ? 'Да' : 'Нет'}
                            </span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Цвет</label>
                        <select {...register(`config.eyes.${eye}.color`)} className="input" disabled={!dkValue}>
                            <option value="">{dkValue ? '— выберите —' : 'Выберите Dk'}</option>
                            {availableColors.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>

                {/* Row 3: Апик. клиренс + Фактор компр. + Кол-во */}
                <div className="grid grid-cols-3 gap-3">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Апик. клиренс</label>
                        <input
                            type="number"
                            step="any"
                            {...register(`config.eyes.${eye}.apical_clearance`, { valueAsNumber: true })}
                            className="input"
                            placeholder="0.00"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Фактор компр.</label>
                        <input
                            type="number"
                            step="any"
                            {...register(`config.eyes.${eye}.compression_factor`, { valueAsNumber: true })}
                            className="input"
                            placeholder="0.00"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Кол-во</label>
                        <select {...register(`config.eyes.${eye}.qty`)} className="input">
                            {QTY_OPTIONS.map(v => <option key={v} value={v}>{v === '0' ? '0 (не заказ.)' : v}</option>)}
                        </select>
                    </div>
                </div>

                {/* RGP File Upload — only shown when isRgp is checked */}
                {isRgp && (
                    <div className="border border-amber-200 bg-amber-50/50 rounded-xl p-4">
                        <label className="block text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                            <Camera className="w-4 h-4" />
                            Файл RGP для {eye.toUpperCase()}
                        </label>
                        {rgpFile ? (
                            <div className="flex items-center gap-3 bg-white rounded-lg border border-amber-200 p-3">
                                <span className="text-2xl">📎</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-700 truncate">{rgpFile.name}</p>
                                    <p className="text-xs text-gray-400">{(rgpFile.size / 1024).toFixed(0)} KB</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onRgpFileChange?.(null)}
                                    className="text-xs text-red-500 hover:text-red-700 font-medium"
                                >
                                    Удалить
                                </button>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center gap-2 py-4 border-2 border-dashed border-amber-300 rounded-lg cursor-pointer hover:bg-amber-50 transition-colors">
                                <Camera className="w-6 h-6 text-amber-400" />
                                <span className="text-sm text-amber-600 font-medium">Нажмите для загрузки файла</span>
                                <span className="text-xs text-amber-400">JPG, PNG или PDF</span>
                                <input
                                    type="file"
                                    accept="image/*,.pdf"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) onRgpFileChange?.(file);
                                    }}
                                />
                            </label>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
}
