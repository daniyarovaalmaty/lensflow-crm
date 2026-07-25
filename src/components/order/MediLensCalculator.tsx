'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calculator, ChevronDown, ChevronUp, ArrowRight, Check,
    Upload, FileText, Sparkles, AlertCircle, Info, ShieldCheck, RefreshCw, Eye, Camera
} from 'lucide-react';
import {
    calculateMountfordPrimary, evaluateMountfordAdjustment,
    type PatientEyeInput, type MountfordCalculatedResult
} from '@/lib/calculator/mountfordFormulas';
import { recommendD50TrialLens, type TrialLensSpec } from '@/lib/calculator/d50Matrix';
import { parseTopographerFile, type ParsedTopographyData } from '@/lib/calculator/topographerParser';
import { findEmpiricalMatchingFit } from '@/lib/calc/patientFittingDataset';

interface MediLensCalculatorProps {
    onApplyToEye: (eye: 'od' | 'os', data: any) => void;
}

interface EyeState {
    sph: string;
    cyl: string;
    fk: string;
    ks: string;
    tor: string; // Direct TOR or computed TOR
    v1: string;  // Vertical Top
    v2: string;  // Vertical Bottom
    h1: string;  // Horizontal Left
    h2: string;  // Horizontal Right
    ex: string;
    hvid: string;

    // Overrefraction & Fit adjustment
    fitAssessment: 'optimal' | 'tight' | 'loose' | 'decentration_up' | 'decentration_down' | 'decentration_lateral';
    overSph: string;
    overCyl: string;
}

const defaultEyeState: EyeState = {
    sph: '',
    cyl: '',
    fk: '',
    ks: '',
    tor: '',
    v1: '',
    v2: '',
    h1: '',
    h2: '',
    ex: '',
    hvid: '',
    fitAssessment: 'optimal',
    overSph: '',
    overCyl: '',
};

export function MediLensCalculator({ onApplyToEye }: MediLensCalculatorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'primary' | 'fit' | 'matrix'>('primary');
    const [appliedLenses, setAppliedLenses] = useState<{ od: string | null; os: string | null }>({ od: null, os: null });
    const [topographerFileStatus, setTopographerFileStatus] = useState<string | null>(null);
    const [isParsingFile, setIsParsingFile] = useState(false);

    const [odState, setOdState] = useState<EyeState>({ ...defaultEyeState });
    const [osState, setOsState] = useState<EyeState>({ ...defaultEyeState });

    const handleInputChange = (eye: 'od' | 'os', field: keyof EyeState, value: string) => {
        if (eye === 'od') {
            setOdState(prev => ({ ...prev, [field]: value }));
        } else {
            setOsState(prev => ({ ...prev, [field]: value }));
        }
    };

    // Handle Topographer File Upload
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsParsingFile(true);
        setTopographerFileStatus(null);

        try {
            const parsed = await parseTopographerFile(file);
            let importedCount = 0;

            if (parsed.od && (parsed.od.fk || parsed.od.ex)) {
                setOdState(prev => ({
                    ...prev,
                    fk: parsed.od?.fk ? String(parsed.od.fk) : prev.fk,
                    ks: parsed.od?.ks ? String(parsed.od.ks) : prev.ks,
                    ex: parsed.od?.ex ? String(parsed.od.ex) : prev.ex,
                    hvid: parsed.od?.hvid ? String(parsed.od.hvid) : prev.hvid,
                }));
                importedCount++;
            }

            if (parsed.os && (parsed.os.fk || parsed.os.ex)) {
                setOsState(prev => ({
                    ...prev,
                    fk: parsed.os?.fk ? String(parsed.os.fk) : prev.fk,
                    ks: parsed.os?.ks ? String(parsed.os.ks) : prev.ks,
                    ex: parsed.os?.ex ? String(parsed.os.ex) : prev.ex,
                    hvid: parsed.os?.hvid ? String(parsed.os.hvid) : prev.hvid,
                }));
                importedCount++;
            }

            if (importedCount > 0) {
                setTopographerFileStatus(`Файл "${file.name}" успешно загружен! (${parsed.sourceType})`);
            } else {
                setTopographerFileStatus(`Файл "${file.name}" прочитан, но автозаполнение не удалось. Проверьте формат.`);
            }
        } catch (e) {
            console.error('Failed to parse topographer file', e);
            setTopographerFileStatus(`Ошибка при чтении файла "${file.name}".`);
        } finally {
            setIsParsingFile(false);
        }
    };

    // Compute Mountford & D50 Matrix calculations for single eye
    const getEyeCalculation = (state: EyeState) => {
        const sph = parseFloat(state.sph) || 0;
        const cyl = parseFloat(state.cyl) || 0;
        const fk = parseFloat(state.fk);
        const torVal = parseFloat(state.tor);
        const tor = (!isNaN(torVal) && torVal > 0) ? torVal : undefined;
        const v1 = parseFloat(state.v1);
        const v2 = parseFloat(state.v2);
        const h1 = parseFloat(state.h1);
        const h2 = parseFloat(state.h2);

        const ks = parseFloat(state.ks) || (tor !== undefined ? fk + tor : fk);
        const ex = parseFloat(state.ex);
        const hvid = parseFloat(state.hvid) || 11.6;

        if (isNaN(fk) || isNaN(ex)) return null;

        const input: PatientEyeInput = {
            sph, cyl, fk, ks, tor,
            v1: !isNaN(v1) ? v1 : undefined,
            v2: !isNaN(v2) ? v2 : undefined,
            h1: !isNaN(h1) ? h1 : undefined,
            h2: !isNaN(h2) ? h2 : undefined,
            ex, hvid
        };
        const mountfordRes = calculateMountfordPrimary(input);
        const d50Recommendation = recommendD50TrialLens({ fk, ks: mountfordRes.cornealAstigmatism + fk, ex, hvid });

        // Evaluate fit adjustment if fitAssessment != optimal or overrefraction entered
        const overSph = parseFloat(state.overSph) || 0;
        const overCyl = parseFloat(state.overCyl) || 0;

        const adjustmentRes = evaluateMountfordAdjustment({
            fitAssessment: state.fitAssessment,
            overRefractionSph: overSph,
            overRefractionCyl: overCyl,
            currentFk: fk,
            currentEx: ex,
            currentDia: mountfordRes.targetDiameter,
            currentSe: mountfordRes.spheroEquivalent,
        });

        const empiricalMatch = findEmpiricalMatchingFit(fk, ks, mountfordRes.cornealAstigmatism);

        return {
            mountford: mountfordRes,
            d50: d50Recommendation,
            adjustment: adjustmentRes,
            empirical: empiricalMatch,
        };
    };

    const odCalc = getEyeCalculation(odState);
    const osCalc = getEyeCalculation(osState);

    const applyLensToOrder = (eye: 'od' | 'os', lensSpec: TrialLensSpec, calcData: any) => {
        const torVal = lensSpec.toricity === 'T0.0' ? null : (lensSpec.toricityVal ? String(lensSpec.toricityVal) : String(calcData.mountford.cornealAstigmatism || 1.0));
        const payload = {
            characteristic: lensSpec.toricity === 'T0.0' ? 'spherical' : 'toric',
            base_curve: String(lensSpec.fk),
            target_power: String(calcData.mountford.spheroEquivalent),
            toricity: lensSpec.toricity,
            tor: torVal,
            diameter: String(lensSpec.dia),
            eccentricity: String(lensSpec.ex),
            trial_code: lensSpec.code,
        };

        onApplyToEye(eye, payload);
        setAppliedLenses(prev => ({ ...prev, [eye]: lensSpec.code }));
        setTimeout(() => setAppliedLenses(prev => ({ ...prev, [eye]: null })), 2500);
    };

    const applyAdjustedToOrder = (eye: 'od' | 'os', calcData: any) => {
        const adj = calcData.adjustment;
        const tor = calcData.d50.primaryLens.toricity;
        const payload = {
            characteristic: tor === 'T0.0' ? 'spherical' : 'toric',
            base_curve: String(adj.adjustedFk),
            target_power: String(adj.adjustedTargetPower),
            toricity: tor,
            tor: tor === 'T0.0' ? null : String(calcData.d50.primaryLens.toricityVal || 1.0),
            diameter: String(adj.adjustedDia),
            eccentricity: String(adj.adjustedEx),
        };

        onApplyToEye(eye, payload);
        setAppliedLenses(prev => ({ ...prev, [eye]: 'adjusted' }));
        setTimeout(() => setAppliedLenses(prev => ({ ...prev, [eye]: null })), 2500);
    };

    return (
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm mb-6 overflow-hidden transition-all">
            {/* Header / Toggle Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-4 sm:p-5 flex items-center justify-between bg-gradient-to-r from-indigo-50/80 via-white to-blue-50/50 hover:from-indigo-100/80 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
                        <Calculator className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-bold text-gray-900">Умный калькулятор MediLens</h2>
                            <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> Набор ДК 50 + J. Mountford
                            </span>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                            Расчёт орто-линз по топографу, сагиттальной высоте и матрице примерочного набора
                        </p>
                    </div>
                </div>
                <div className="w-9 h-9 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-500">
                    {isOpen ? <ChevronUp className="w-5 h-5 text-indigo-600" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 sm:p-6 border-t border-gray-100 bg-gray-50/30">

                            {/* File & Photo Upload Banner */}
                            <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-600 rounded-2xl p-4 sm:p-5 text-white mb-6 shadow-md shadow-indigo-100 flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
                                        <Camera className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                                            <span>Загрузить фото или файл с топографа</span>
                                            <span className="bg-white/20 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
                                                AI OCR Сканер
                                            </span>
                                        </h3>
                                        <p className="text-xs text-indigo-100 mt-0.5">
                                            Сделайте фото экрана топографа на телефон или загрузите файл (.jpg, .png, .des, .csv, .txt)
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 shrink-0 w-full md:w-auto">
                                    <label className="cursor-pointer bg-white text-indigo-700 hover:bg-indigo-50 font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2 flex-1 md:flex-none">
                                        {isParsingFile ? (
                                            <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                                        ) : (
                                            <Camera className="w-4 h-4 text-indigo-600" />
                                        )}
                                        <span>Загрузить фото / скан</span>
                                        <input
                                            type="file"
                                            accept="image/*,.heic,.heif,.jpg,.jpeg,.png,.webp,.pdf,.des,.csv,.txt,.xml"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                            </div>

                            {topographerFileStatus && (
                                <div className={`p-3.5 rounded-xl mb-6 text-xs font-semibold flex items-center gap-2 shadow-sm ${topographerFileStatus.includes('успешно') || topographerFileStatus.includes('Распознано') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
                                    <Info className="w-4 h-4 shrink-0" />
                                    <span>{topographerFileStatus}</span>
                                </div>
                            )}

                            {/* Tabs */}
                            <div className="flex bg-gray-200/70 p-1 rounded-xl mb-6 w-max mx-auto border border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('primary')}
                                    className={`px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${activeTab === 'primary' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                                >
                                    1. Первичный подбор & Набор ДК 50
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('fit')}
                                    className={`px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${activeTab === 'fit' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                                >
                                    2. Оценка посадки & Оверрефракция
                                </button>
                            </div>

                            {/* Tab 1: Primary Fitting */}
                            {activeTab === 'primary' && (
                                <div className="grid lg:grid-cols-2 gap-6">
                                    {(['od', 'os'] as const).map(eye => {
                                        const state = eye === 'od' ? odState : osState;
                                        const calc = eye === 'od' ? odCalc : osCalc;
                                        const eyeTitle = eye === 'od' ? 'OD (Правый глаз)' : 'OS (Левый глаз)';

                                        return (
                                            <div key={eye} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                                                <div className="flex items-center justify-between border-b pb-3 mb-4">
                                                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                                        <Eye className="w-4 h-4 text-indigo-600" />
                                                        {eyeTitle}
                                                    </h3>
                                                    <span className="text-xs text-gray-500">Первичные данные</span>
                                                </div>

                                                {/* Refraction & Topography Inputs */}
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                                                    <div>
                                                        <label className="text-xs font-semibold text-gray-500">Sph (Сфера)</label>
                                                        <input
                                                            type="number"
                                                            step="any"
                                                            value={state.sph}
                                                            onChange={e => handleInputChange(eye, 'sph', e.target.value)}
                                                            className="input text-sm h-9 bg-gray-50 focus:bg-white"
                                                            placeholder="-3.50"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-semibold text-gray-500">Cyl (Цилиндр)</label>
                                                        <input
                                                            type="number"
                                                            step="any"
                                                            value={state.cyl}
                                                            onChange={e => handleInputChange(eye, 'cyl', e.target.value)}
                                                            className="input text-sm h-9 bg-gray-50 focus:bg-white"
                                                            placeholder="-0.75"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold text-indigo-600">Flat K (Fk / Km) *</label>
                                                        <input
                                                            type="number"
                                                            step="any"
                                                            value={state.fk}
                                                            onChange={e => handleInputChange(eye, 'fk', e.target.value)}
                                                            className="input border-indigo-300 focus:border-indigo-600 text-sm h-9 font-semibold"
                                                            placeholder="42.50"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-semibold text-gray-700">Steep K (Ks / Kr)</label>
                                                        <input
                                                            type="number"
                                                            step="any"
                                                            value={state.ks}
                                                            onChange={e => handleInputChange(eye, 'ks', e.target.value)}
                                                            className="input text-sm h-9"
                                                            placeholder="43.75"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold text-violet-600">Tor (Периф. астигм.)</label>
                                                        <input
                                                            type="number"
                                                            step="any"
                                                            value={state.tor}
                                                            onChange={e => handleInputChange(eye, 'tor', e.target.value)}
                                                            className="input border-violet-300 focus:border-violet-600 text-sm h-9 font-semibold"
                                                            placeholder="1.68"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold text-indigo-600">Flat Ex (ex / Em) *</label>
                                                        <input
                                                            type="number"
                                                            step="any"
                                                            value={state.ex}
                                                            onChange={e => handleInputChange(eye, 'ex', e.target.value)}
                                                            className="input border-indigo-300 focus:border-indigo-600 text-sm h-9 font-semibold"
                                                            placeholder="0.52"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-semibold text-gray-700">HVID (Диаметр, мм)</label>
                                                        <input
                                                            type="number"
                                                            step="any"
                                                            value={state.hvid}
                                                            onChange={e => handleInputChange(eye, 'hvid', e.target.value)}
                                                            className="input text-sm h-9"
                                                            placeholder="11.6"
                                                        />
                                                    </div>
                                                </div>

                                                 {/* 4-Point Peripheral Meridian TOR Calculator */}
                                                 <div className="mb-5 bg-violet-50/50 border border-violet-100 rounded-xl p-3">
                                                     <div className="flex items-center justify-between mb-2">
                                                         <span className="text-xs font-bold text-violet-900 flex items-center gap-1">
                                                             <Calculator className="w-3.5 h-3.5 text-violet-600" />
                                                             Расчет TOR по крайним точкам роговицы (Меридианы)
                                                         </span>
                                                         <span className="text-[10px] text-violet-600 font-semibold bg-violet-100 px-2 py-0.5 rounded-full">
                                                             ((V1+V2)/2) - ((H1+H2)/2)
                                                         </span>
                                                     </div>
                                                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2 items-end">
                                                          <div className="flex flex-col justify-between">
                                                              <label className="text-[11px] font-medium text-gray-600 leading-tight mb-1 min-h-[28px] flex items-end">⬆️ Верт. Верх (V1)</label>
                                                              <input
                                                                  type="number"
                                                                  step="any"
                                                                  value={state.v1}
                                                                  onChange={e => handleInputChange(eye, 'v1', e.target.value)}
                                                                  className="input text-xs h-8 bg-white border-violet-200 w-full"
                                                                  placeholder="43.50"
                                                              />
                                                          </div>
                                                          <div className="flex flex-col justify-between">
                                                              <label className="text-[11px] font-medium text-gray-600 leading-tight mb-1 min-h-[28px] flex items-end">⬇️ Верт. Низ (V2)</label>
                                                              <input
                                                                  type="number"
                                                                  step="any"
                                                                  value={state.v2}
                                                                  onChange={e => handleInputChange(eye, 'v2', e.target.value)}
                                                                  className="input text-xs h-8 bg-white border-violet-200 w-full"
                                                                  placeholder="43.70"
                                                              />
                                                          </div>
                                                          <div className="flex flex-col justify-between">
                                                              <label className="text-[11px] font-medium text-gray-600 leading-tight mb-1 min-h-[28px] flex items-end">⬅️ Гориз. Лево (H1)</label>
                                                              <input
                                                                  type="number"
                                                                  step="any"
                                                                  value={state.h1}
                                                                  onChange={e => handleInputChange(eye, 'h1', e.target.value)}
                                                                  className="input text-xs h-8 bg-white border-violet-200 w-full"
                                                                  placeholder="42.00"
                                                              />
                                                          </div>
                                                          <div className="flex flex-col justify-between">
                                                              <label className="text-[11px] font-medium text-gray-600 leading-tight mb-1 min-h-[28px] flex items-end">➡️ Гориз. Право (H2)</label>
                                                              <input
                                                                  type="number"
                                                                  step="any"
                                                                  value={state.h2}
                                                                  onChange={e => handleInputChange(eye, 'h2', e.target.value)}
                                                                  className="input text-xs h-8 bg-white border-violet-200 w-full"
                                                                  placeholder="41.80"
                                                              />
                                                          </div>
                                                      </div>

                                                     {calc?.mountford.computedTorDetail && (
                                                         <div className="text-xs bg-white rounded-lg p-2 border border-violet-200 text-violet-900 font-bold flex items-center justify-between">
                                                             <span>Верт. ср: {calc.mountford.computedTorDetail.vAvg.toFixed(2)} D | Гориз. ср: {calc.mountford.computedTorDetail.hAvg.toFixed(2)} D</span>
                                                             <span className="bg-violet-600 text-white px-2 py-0.5 rounded text-xs font-black">
                                                                 TOR = {calc.mountford.computedTorDetail.tor.toFixed(2)} D
                                                             </span>
                                                         </div>
                                                     )}
                                                 </div>

                                                {/* Calculated Results & D50 Matrix Recommendation */}
                                                {calc ? (
                                                    <div className="space-y-4 pt-2">

                                                        {/* Primary Physics Summary */}
                                                        <div className="bg-indigo-50/60 rounded-xl p-3 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2 text-indigo-950 font-medium">
                                                            <div>SE: <span className="font-bold">{calc.mountford.spheroEquivalent.toFixed(2)} D</span></div>
                                                            <div>Астигм $\Delta K$: <span className="font-bold">{calc.mountford.cornealAstigmatism.toFixed(2)} D</span></div>
                                                            <div>Sag роговицы: <span className="font-bold">{calc.mountford.sagCorneaMicrons} мкм</span></div>
                                                            <div>BOZR (мм): <span className="font-bold">{calc.mountford.bozrMm.toFixed(2)} мм</span></div>
                                                        </div>

                                                        {/* RECOMMENDED TRIAL LENS BADGE */}
                                                        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-500/80 rounded-xl p-4 shadow-sm relative overflow-hidden">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-xs font-black uppercase text-emerald-700 tracking-wider flex items-center gap-1">
                                                                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                                                    Рекомендуемая линза из набора ДК 50
                                                                </span>
                                                                <span className="bg-emerald-600 text-white font-black text-xs px-2.5 py-0.5 rounded-full">
                                                                    Код: {calc.d50.primaryLens.code}
                                                                </span>
                                                            </div>

                                                            <div className="text-sm font-bold text-gray-900 mb-2">
                                                                {calc.d50.primaryLens.fk.toFixed(1)} / -4.0 {calc.d50.primaryLens.toricity} / DIA {calc.d50.primaryLens.dia.toFixed(1)} Ex {calc.d50.primaryLens.ex.toFixed(2)}
                                                            </div>

                                                            <div className="text-xs text-gray-600 space-y-1 mb-3 bg-white/70 rounded-lg p-2 border border-emerald-100">
                                                                {calc.d50.reasoning.map((r, idx) => (
                                                                    <div key={idx}>• {r}</div>
                                                                ))}
                                                            </div>

                                                            <button
                                                                type="button"
                                                                onClick={() => applyLensToOrder(eye, calc.d50.primaryLens, calc)}
                                                                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm ${appliedLenses[eye] === calc.d50.primaryLens.code ? 'bg-green-600 text-white' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                                                            >
                                                                {appliedLenses[eye] === calc.d50.primaryLens.code ? (
                                                                    <><Check className="w-4 h-4" /> Линза {calc.d50.primaryLens.code} перенесена в заказ!</>
                                                                ) : (
                                                                    <><ArrowRight className="w-4 h-4" /> Перенести линзу {calc.d50.primaryLens.code} в Заказ ({eye.toUpperCase()})</>
                                                                )}
                                                            </button>
                                                        </div>

                                                        {/* EMPIRICAL RECOMMENDATION FROM DR. AIGERIM SHORAEVA (NEW EYE) */}
                                                        {calc.empirical && (
                                                            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4 shadow-sm relative">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <span className="text-xs font-black uppercase text-purple-800 tracking-wider flex items-center gap-1.5">
                                                                        <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" />
                                                                        Рекомендация от Айгерим Шораевой (New Eye)
                                                                    </span>
                                                                    <span className="bg-purple-600 text-white font-black text-xs px-2.5 py-0.5 rounded-full">
                                                                        {calc.empirical.similarityScore}% Совпадение
                                                                    </span>
                                                                </div>

                                                                <div className="text-xs text-gray-700 font-medium mb-3">
                                                                    Обучено на базе 231 пациента клиники New Eye | Аналогичный случай: <span className="font-bold text-gray-900">Пациент {calc.empirical.matchedPatient.patientName}</span> (Flat K: {calc.empirical.matchedPatient.flatK.toFixed(2)} D, Steep K: {calc.empirical.matchedPatient.steepK.toFixed(2)} D)
                                                                </div>

                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                                                                    <div className="bg-white/80 rounded-lg p-2.5 border border-purple-100">
                                                                        <div className="text-[10px] font-bold uppercase text-purple-600 mb-1">1. Примеренная линза в клинике (Осмотр 1):</div>
                                                                        <div className="text-xs font-black text-gray-900 break-words">{calc.empirical.recommendedTrialLens}</div>
                                                                    </div>
                                                                    <div className={`rounded-lg p-2.5 border shadow-sm ${calc.empirical.isFromSuitcase ? 'bg-amber-50/80 border-amber-300' : 'bg-white/95 border-indigo-300'}`}>
                                                                        <div className={`text-[10px] font-bold uppercase mb-1 ${calc.empirical.isFromSuitcase ? 'text-amber-800' : 'text-indigo-600'}`}>
                                                                            {calc.empirical.isFromSuitcase ? '🧳 Выдана из чемодана (набора):' : '📝 Оформлен заказ:'}
                                                                        </div>
                                                                        <div className={`text-xs font-black break-words ${calc.empirical.isFromSuitcase ? 'text-amber-950' : 'text-indigo-900'}`}>
                                                                            {calc.empirical.recommendedFinalLens}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="text-xs text-purple-900 bg-purple-100/70 rounded-lg p-2 font-medium">
                                                                    💡 {calc.empirical.recommendedAdjustment}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Alternative Trial Lens Options */}
                                                        {calc.d50.alternativeLenses.length > 0 && (
                                                            <div>
                                                                <div className="text-xs font-bold text-gray-500 mb-2">Альтернативные варианты в наборе:</div>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    {calc.d50.alternativeLenses.map(alt => (
                                                                        <button
                                                                            key={alt.code}
                                                                            type="button"
                                                                            onClick={() => applyLensToOrder(eye, alt, calc)}
                                                                            className="p-2 border border-gray-200 rounded-lg bg-gray-50 hover:bg-indigo-50 hover:border-indigo-300 text-left transition-all text-xs"
                                                                        >
                                                                            <div className="font-bold text-indigo-700">Линза {alt.code}</div>
                                                                            <div className="text-gray-600 font-medium">Fk {alt.fk.toFixed(1)} | DIA {alt.dia}</div>
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                    </div>
                                                ) : (
                                                    <div className="p-4 bg-gray-50 rounded-xl text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                                                        <AlertCircle className="w-4 h-4 text-amber-500" />
                                                        <span>Заполните Fk и ex (или загрузите файл топографа) для расчёта.</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Tab 2: Fluorescein Assessment & Over-Refraction */}
                            {activeTab === 'fit' && (
                                <div className="grid lg:grid-cols-2 gap-6">
                                    {(['od', 'os'] as const).map(eye => {
                                        const state = eye === 'od' ? odState : osState;
                                        const calc = eye === 'od' ? odCalc : osCalc;
                                        const eyeTitle = eye === 'od' ? 'OD (Правый глаз)' : 'OS (Левый глаз)';

                                        return (
                                            <div key={eye} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                                                <h3 className="font-bold text-gray-900 border-b pb-3 mb-4 flex items-center justify-between">
                                                    <span>{eyeTitle}</span>
                                                    <span className="text-xs font-normal text-gray-500">Коррекция по Маунтфорду</span>
                                                </h3>

                                                <div className="space-y-4 mb-5">

                                                    {/* Fluorescein Fit Option Buttons */}
                                                    <div>
                                                        <label className="text-xs font-bold text-gray-700 mb-2 block">
                                                            Оценка флюоресцеиновой посадки / топограммы:
                                                        </label>
                                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                                            {[
                                                                { id: 'optimal', label: '1. Норма (Bull\'s eye)', desc: 'Оптимальный сагиттал' },
                                                                { id: 'tight', label: '2. Тугая посадка', desc: 'Fk -0.50 D, ex +0.05' },
                                                                { id: 'loose', label: '3. Свободная посадка', desc: 'Fk +0.50 D, ex -0.05' },
                                                                { id: 'decentration_up', label: '4. Децентрация вверх', desc: 'Smiley face (Fk +0.50 D)' },
                                                                { id: 'decentration_down', label: '5. Децентрация вниз', desc: 'Frowny face (Fk -0.50 D)' },
                                                                { id: 'decentration_lateral', label: '6. Децентрация вбок', desc: 'DIA +0.2 мм / Торика' },
                                                            ].map(opt => (
                                                                <button
                                                                    key={opt.id}
                                                                    type="button"
                                                                    onClick={() => handleInputChange(eye, 'fitAssessment', opt.id as any)}
                                                                    className={`p-2.5 rounded-xl border text-left transition-all ${state.fitAssessment === opt.id ? 'bg-indigo-50 border-indigo-500 text-indigo-900 font-bold shadow-sm' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'}`}
                                                                >
                                                                    <div className="font-bold">{opt.label}</div>
                                                                    <div className="text-[11px] opacity-75">{opt.desc}</div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Over-refraction Inputs */}
                                                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                                                        <div className="text-xs font-bold text-gray-700 mb-2">Оверрефракция в диагностической линзе:</div>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="text-[11px] text-gray-500 font-semibold">Over Sph (D)</label>
                                                                <input
                                                                    type="number"
                                                                    step="any"
                                                                    value={state.overSph}
                                                                    onChange={e => handleInputChange(eye, 'overSph', e.target.value)}
                                                                    className="input text-xs h-8 bg-white"
                                                                    placeholder="0.00"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-[11px] text-gray-500 font-semibold">Over Cyl (D)</label>
                                                                <input
                                                                    type="number"
                                                                    step="any"
                                                                    value={state.overCyl}
                                                                    onChange={e => handleInputChange(eye, 'overCyl', e.target.value)}
                                                                    className="input text-xs h-8 bg-white"
                                                                    placeholder="0.00"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                </div>

                                                {/* Adjusted Output Parameters */}
                                                {calc ? (
                                                    <div className="bg-indigo-900 text-white rounded-xl p-4 space-y-3">
                                                        <div className="text-xs font-bold text-indigo-200 uppercase tracking-wider">
                                                            Итоговые откорректированные параметры заказа:
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                                                            <div>Base Curve (Fk): <span className="text-indigo-300">{calc.adjustment.adjustedFk.toFixed(2)} D</span></div>
                                                            <div>Целевая сила (TP): <span className="text-indigo-300">{calc.adjustment.adjustedTargetPower.toFixed(2)} D</span></div>
                                                            <div>Диаметр (DIA): <span className="text-indigo-300">{calc.adjustment.adjustedDia.toFixed(1)} мм</span></div>
                                                            <div>Эксцентриситет (ex): <span className="text-indigo-300">{calc.adjustment.adjustedEx.toFixed(2)}</span></div>
                                                        </div>

                                                        <div className="text-[11px] text-indigo-100 bg-indigo-950/60 p-2 rounded-lg space-y-1">
                                                            {calc.adjustment.explanation.map((exp, idx) => (
                                                                <div key={idx}>• {exp}</div>
                                                            ))}
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={() => applyAdjustedToOrder(eye, calc)}
                                                            className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md ${appliedLenses[eye] === 'adjusted' ? 'bg-green-500 text-white' : 'bg-white text-indigo-900 hover:bg-indigo-50'}`}
                                                        >
                                                            {appliedLenses[eye] === 'adjusted' ? (
                                                                <><Check className="w-4 h-4" /> Итоговые параметры перенесены!</>
                                                            ) : (
                                                                <><ArrowRight className="w-4 h-4" /> Перенести итоговые параметры в Заказ ({eye.toUpperCase()})</>
                                                            )}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="p-3 bg-gray-50 text-xs text-gray-500 text-center rounded-xl">
                                                        Заполните первичные данные во вкладке 1.
                                                    </div>
                                                )}

                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
