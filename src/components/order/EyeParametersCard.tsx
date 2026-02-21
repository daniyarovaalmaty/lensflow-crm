'use client';

import { useEffect, useMemo } from 'react';
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
const QTY_OPTIONS = Array.from({ length: 10 }, (_, i) => String(i + 1));

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

    const availableColors = useMemo(() => {
        if (!dkValue) return [];
        return ColorsByDk[dkValue] || [];
    }, [dkValue]);

    useEffect(() => {
        setValue(`config.eyes.${eye}.trial`, isTrial);
    }, [dkValue, isTrial, eye, setValue]);

    useEffect(() => {
        setValue(`config.eyes.${eye}.color`, '');
    }, [dkValue, eye, setValue]);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card"
        >
            <div className="flex items-center gap-3 mb-6">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${eye === 'od' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                    <Eye className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{label}</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">

                {/* Характеристика */}
                <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Характеристика</label>
                    <select {...register(`config.eyes.${eye}.characteristic`)} className="input">
                        <option value="">— выберите —</option>
                        {Object.entries(CharacteristicLabels).map(([val, lbl]) => (
                            <option key={val} value={val}>{lbl}</option>
                        ))}
                    </select>
                </div>

                {/* MyOrtho-k */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">MyOrtho-k</label>
                    <div className="flex items-center h-[42px] px-3 rounded-lg border border-gray-200 bg-gray-50">
                        <input
                            type="checkbox"
                            {...register(`config.eyes.${eye}.myorthok`)}
                            className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-600">Да</span>
                    </div>
                </div>

                {/* Km — number input (0.20–55.00, step 0.01) — too many options for a dropdown */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Km</label>
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

                {/* TP — dropdown (-25.00–25.00, step 0.25) */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">TP</label>
                    <select {...register(`config.eyes.${eye}.tp`, { valueAsNumber: true })} className="input">
                        <option value="">—</option>
                        {TP_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                </div>

                {/* DIA — dropdown (8.0–13.0, step 0.1) */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">DIA</label>
                    <select {...register(`config.eyes.${eye}.dia`, { valueAsNumber: true })} className="input">
                        <option value="">—</option>
                        {DIA_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                </div>

                {/* E — single for spherical, double (slash) for toric/RGP */}
                <div className={isSpherical ? '' : 'col-span-2'}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        {isSpherical ? 'E' : 'E (дробь)'}
                    </label>
                    {isSpherical ? (
                        <select {...register(`config.eyes.${eye}.e1`, { valueAsNumber: true })} className="input">
                            <option value="">—</option>
                            {E_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                    ) : (
                        <div className="flex items-center gap-1">
                            <select {...register(`config.eyes.${eye}.e1`, { valueAsNumber: true })} className="input">
                                <option value="">—</option>
                                {E_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                            <span className="text-lg font-bold text-gray-500 px-1">/</span>
                            <select {...register(`config.eyes.${eye}.e2`, { valueAsNumber: true })} className="input">
                                <option value="">—</option>
                                {E_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                {/* Тог. — number input (0.00–6.00, step 0.01) — hidden for spherical */}
                {!isSpherical && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Тог.</label>
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

                {/* Dk */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Dk</label>
                    <select {...register(`config.eyes.${eye}.dk`)} className="input">
                        <option value="">—</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                        <option value="125">125</option>
                        <option value="180">180</option>
                    </select>
                </div>

                {/* Пробная — auto from Dk */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Пробная</label>
                    <div className={`flex items-center h-[42px] px-3 rounded-lg border ${isTrial ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'}`}>
                        <input
                            type="checkbox"
                            {...register(`config.eyes.${eye}.trial`)}
                            checked={isTrial}
                            readOnly
                            className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        <span className={`ml-2 text-sm font-medium ${isTrial ? 'text-green-700' : 'text-gray-400'}`}>
                            {isTrial ? 'Да' : 'Нет'}
                        </span>
                    </div>
                </div>

                {/* Цвет — depends on Dk */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Цвет</label>
                    <select {...register(`config.eyes.${eye}.color`)} className="input" disabled={!dkValue}>
                        <option value="">{dkValue ? '— выберите —' : 'Выберите Dk'}</option>
                        {availableColors.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                {/* Апикальный клиренс — dropdown (-9.0–9.0, step 0.5) */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Апик. клиренс</label>
                    <select {...register(`config.eyes.${eye}.apical_clearance`, { valueAsNumber: true })} className="input">
                        <option value="">—</option>
                        {APICAL_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                </div>

                {/* Фактор компрессии — number input (-4.50–4.50, step 0.01) */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Фактор компр.</label>
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

                {/* Кол-во — dropdown (1–10) */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Кол-во</label>
                    <select {...register(`config.eyes.${eye}.qty`, { valueAsNumber: true })} className="input">
                        {QTY_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                </div>
            </div>
        </motion.div>
    );
}
