'use client';

import { useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { Eye } from 'lucide-react';
import type { UseFormRegister, UseFormWatch, UseFormSetValue, FieldErrors } from 'react-hook-form';
import type { CreateOrderDTO } from '@/types/order';
import { CharacteristicLabels, ColorsByDk } from '@/types/order';

// ==================== Dropdown Ranges ====================
function generateRange(min: number, max: number, step: number, decimals: number): string[] {
    const result: string[] = [];
    const epsilon = step / 100;
    for (let v = min; v <= max + epsilon; v += step) {
        result.push(v.toFixed(decimals));
    }
    return result;
}

// Pre-compute all option arrays once
const TP_OPTIONS = generateRange(-25, 25, 0.25, 2);       // 201 options
const DIA_OPTIONS = generateRange(8.0, 13.0, 0.1, 1);      // 51 options
const E_OPTIONS = generateRange(0, 1.0, 0.01, 2);          // 101 options
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
}

export function EyeParametersCard({
    eye,
    label,
    register,
    errors,
    watch,
    setValue,
}: EyeParametersCardProps) {
    const dkValue = watch(`config.eyes.${eye}.dk`);
    const characteristic = watch(`config.eyes.${eye}.characteristic`);
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
            className={`card border-l-4 ${borderAccent}`}
        >
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

            {/* Row 1: Характеристика + Km + TP + DIA */}
            <div className="space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="col-span-2 sm:col-span-1">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Характеристика</label>
                        <select {...register(`config.eyes.${eye}.characteristic`)} className="input">
                            <option value="">— выберите —</option>
                            {Object.entries(CharacteristicLabels).map(([val, lbl]) => (
                                <option key={val} value={val}>{lbl}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Km</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0.2"
                            max="55"
                            {...register(`config.eyes.${eye}.km`, { valueAsNumber: true })}
                            className="input"
                            placeholder="44.50"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">TP</label>
                        <select {...register(`config.eyes.${eye}.tp`, { valueAsNumber: true })} className="input">
                            <option value="">—</option>
                            {TP_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">DIA</label>
                        <select {...register(`config.eyes.${eye}.dia`, { valueAsNumber: true })} className="input">
                            <option value="">—</option>
                            {DIA_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
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
                            <select {...register(`config.eyes.${eye}.e1`, { valueAsNumber: true })} className="input">
                                <option value="">—</option>
                                {E_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                        ) : (
                            <div className="flex items-center gap-1.5">
                                <select {...register(`config.eyes.${eye}.e1`, { valueAsNumber: true })} className="input">
                                    <option value="">—</option>
                                    {E_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                                <span className="text-lg font-bold text-gray-400 flex-shrink-0">/</span>
                                <select {...register(`config.eyes.${eye}.e2`, { valueAsNumber: true })} className="input">
                                    <option value="">—</option>
                                    {E_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Тог. — hidden for spherical */}
                    {!isSpherical && (
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Тог.</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="6"
                                {...register(`config.eyes.${eye}.tor`, { valueAsNumber: true })}
                                className="input"
                                placeholder="0.00"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Dk</label>
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
                        <select {...register(`config.eyes.${eye}.apical_clearance`, { valueAsNumber: true })} className="input">
                            <option value="">—</option>
                            {APICAL_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Фактор компр.</label>
                        <input
                            type="number"
                            step="0.01"
                            min="-4.5"
                            max="4.5"
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
            </div>
        </motion.div>
    );
}
