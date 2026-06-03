'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, ChevronDown, ChevronUp, ArrowRight, Check } from 'lucide-react';

interface MediLensCalculatorProps {
    onApplyToEye: (eye: 'od' | 'os', data: any) => void;
}

interface CalcInputs {
    od: { sph: string; cyl: string; fk: string; ex: string; tor: string; hvid: string; };
    os: { sph: string; cyl: string; fk: string; ex: string; tor: string; hvid: string; };
}

export function MediLensCalculator({ onApplyToEye }: MediLensCalculatorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'primary' | 'recalc'>('primary');

    const [inputs, setInputs] = useState<CalcInputs>({
        od: { sph: '', cyl: '', fk: '', ex: '', tor: '', hvid: '' },
        os: { sph: '', cyl: '', fk: '', ex: '', tor: '', hvid: '' }
    });

    const [recalcInputs, setRecalcInputs] = useState({
        od: { fkOriginal: '', fkTrial: '', exTrial: '' },
        os: { fkOriginal: '', fkTrial: '', exTrial: '' }
    });

    const [appliedLenses, setAppliedLenses] = useState<{ od: string | null; os: string | null }>({ od: null, os: null });

    const handleInputChange = (eye: 'od' | 'os', field: keyof CalcInputs['od'], value: string) => {
        setInputs(prev => ({ ...prev, [eye]: { ...prev[eye], [field]: value } }));
    };

    const handleRecalcChange = (eye: 'od' | 'os', field: keyof typeof recalcInputs.od, value: string) => {
        setRecalcInputs(prev => ({ ...prev, [eye]: { ...prev[eye], [field]: value } }));
    };

    // Calculation Logic
    const calculateTor = (torInput: number) => {
        if (torInput >= 2) return 2;
        if (torInput >= 1.4) return 1.5;
        if (torInput < 1) return 0;
        return 1;
    };

    const calculateLenses = (eyeInputs: CalcInputs['od']) => {
        const fk = parseFloat(eyeInputs.fk);
        const ex = parseFloat(eyeInputs.ex);
        const torIn = parseFloat(eyeInputs.tor);
        const hvid = parseFloat(eyeInputs.hvid);

        if (isNaN(fk) || isNaN(ex) || isNaN(torIn) || isNaN(hvid)) return null;

        const tor = calculateTor(torIn);
        const characteristic = tor >= 1 ? 'toric' : 'spherical';
        const dia = hvid - 1;
        const fkRounded = Math.round(fk * 2) / 2;

        // Lens 1
        const lens1: any = { km: fkRounded, e1: 0.5, dia, characteristic };
        if (characteristic === 'toric') lens1.tor = tor;

        // Lens 2
        let ex2 = 0.5;
        if (ex > 0.54) ex2 = 0.55;
        else if (ex < 0.46) ex2 = 0.42;
        const lens2: any = { km: fkRounded, e1: ex2, dia, characteristic };
        if (characteristic === 'toric') lens2.tor = tor;

        // Lens 3
        let fk3 = fkRounded;
        if (ex > 0.55) fk3 = fkRounded - 0.5;
        else if (ex < 0.45) fk3 = fkRounded + 0.5;
        const lens3: any = { km: fk3, e1: 0.5, dia, characteristic };
        if (characteristic === 'toric') lens3.tor = tor;

        return { lens1, lens2, lens3 };
    };

    const calculateRecalc = (eye: 'od' | 'os') => {
        const data = recalcInputs[eye];
        const fkOrig = parseFloat(data.fkOriginal);
        const fkTrial = parseFloat(data.fkTrial);
        const exTrial = parseFloat(data.exTrial);

        if (isNaN(fkOrig) || isNaN(fkTrial) || isNaN(exTrial)) return null;

        const exResult = Math.round((exTrial + ((fkOrig - fkTrial) / 0.25) * 0.04) * 100) / 100;
        return exResult;
    };

    const lenses = {
        od: calculateLenses(inputs.od),
        os: calculateLenses(inputs.os)
    };

    const applyLens = (eye: 'od' | 'os', lensNum: number, lensData: any) => {
        onApplyToEye(eye, lensData);
        setAppliedLenses(prev => ({ ...prev, [eye]: `lens${lensNum}` }));
        setTimeout(() => setAppliedLenses(prev => ({ ...prev, [eye]: null })), 2000);
    };

    const applyRecalc = (eye: 'od' | 'os', exValue: number) => {
        onApplyToEye(eye, { e1: exValue });
        setAppliedLenses(prev => ({ ...prev, [eye]: 'recalc' }));
        setTimeout(() => setAppliedLenses(prev => ({ ...prev, [eye]: null })), 2000);
    };

    return (
        <div className="card mb-6 border-l-4 border-l-indigo-500 overflow-hidden">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                        <Calculator className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                        <h2 className="text-lg font-bold text-gray-900">Калькулятор MediLens</h2>
                        <p className="text-sm text-gray-500">Подбор параметров ночных линз</p>
                    </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                    {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
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
                        <div className="pt-6 border-t border-gray-100 mt-6">
                            
                            {/* Tabs */}
                            <div className="flex bg-gray-100 p-1 rounded-xl mb-6 w-max mx-auto">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('primary')}
                                    className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'primary' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Основной подбор
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('recalc')}
                                    className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'recalc' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Пересчет Eccentricity
                                </button>
                            </div>

                            {activeTab === 'primary' && (
                                <div className="grid md:grid-cols-2 gap-6">
                                    {(['od', 'os'] as const).map(eye => (
                                        <div key={eye} className="border border-gray-200 rounded-2xl p-5 bg-gray-50/50">
                                            <h3 className="text-base font-bold text-gray-900 mb-4 uppercase text-center border-b pb-2">{eye === 'od' ? 'OD (Правый)' : 'OS (Левый)'}</h3>
                                            <div className="grid grid-cols-2 gap-3 mb-6">
                                                <div className="col-span-2 sm:col-span-1"><label className="text-xs font-semibold text-gray-500">Sph</label><input type="number" step="any" value={inputs[eye].sph} onChange={e => handleInputChange(eye, 'sph', e.target.value)} className="input text-sm h-9" placeholder="0.00" /></div>
                                                <div className="col-span-2 sm:col-span-1"><label className="text-xs font-semibold text-gray-500">Cyl</label><input type="number" step="any" value={inputs[eye].cyl} onChange={e => handleInputChange(eye, 'cyl', e.target.value)} className="input text-sm h-9" placeholder="0.00" /></div>
                                                <div className="col-span-2 flex items-center justify-between bg-white border border-gray-100 rounded-lg p-2 px-3 shadow-sm mb-1">
                                                    <span className="text-xs font-semibold text-gray-500">Spherical Equivalent (SE):</span>
                                                    <span className="text-sm font-bold text-gray-900">{(() => {
                                                        const sph = parseFloat(inputs[eye].sph) || 0;
                                                        const cyl = parseFloat(inputs[eye].cyl) || 0;
                                                        const se = sph + (cyl / 2);
                                                        return se ? (se > 0 ? '+' : '') + se.toFixed(2) : '0.00';
                                                    })()}</span>
                                                </div>
                                                <div><label className="text-xs font-semibold text-indigo-600">FK (Flat K)</label><input type="number" step="any" value={inputs[eye].fk} onChange={e => handleInputChange(eye, 'fk', e.target.value)} className="input border-indigo-200 focus:border-indigo-500 text-sm h-9" placeholder="43.85" /></div>
                                                <div><label className="text-xs font-semibold text-indigo-600">Eccentricity (ex)</label><input type="number" step="any" value={inputs[eye].ex} onChange={e => handleInputChange(eye, 'ex', e.target.value)} className="input border-indigo-200 focus:border-indigo-500 text-sm h-9" placeholder="0.56" /></div>
                                                <div><label className="text-xs font-semibold text-indigo-600">Tor (Периф. астиг.)</label><input type="number" step="any" value={inputs[eye].tor} onChange={e => handleInputChange(eye, 'tor', e.target.value)} className="input border-indigo-200 focus:border-indigo-500 text-sm h-9" placeholder="1.68" /></div>
                                                <div><label className="text-xs font-semibold text-indigo-600">HVID</label><input type="number" step="any" value={inputs[eye].hvid} onChange={e => handleInputChange(eye, 'hvid', e.target.value)} className="input border-indigo-200 focus:border-indigo-500 text-sm h-9" placeholder="11.5" /></div>
                                            </div>

                                            {lenses[eye] && (
                                                <div className="space-y-3">
                                                    {[
                                                        { num: 1, data: lenses[eye]!.lens1 },
                                                        { num: 2, data: lenses[eye]!.lens2 },
                                                        { num: 3, data: lenses[eye]!.lens3 }
                                                    ].map(({ num, data }) => (
                                                        <div key={num} className="bg-white border border-indigo-100 rounded-xl p-3 flex items-center justify-between shadow-sm">
                                                            <div>
                                                                <div className="text-xs font-bold text-indigo-500 mb-1">Линза {num} ({data.characteristic.toUpperCase()})</div>
                                                                <div className="flex gap-3 text-sm font-medium text-gray-800">
                                                                    <span>Km: {data.km.toFixed(2)}</span>
                                                                    <span>E: {data.e1.toFixed(2)}</span>
                                                                    {data.characteristic === 'toric' && <span>Tor: {data.tor}</span>}
                                                                    <span>DIA: {data.dia.toFixed(2)}</span>
                                                                </div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => applyLens(eye, num, data)}
                                                                className={`ml-3 shrink-0 flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${appliedLenses[eye] === `lens${num}` ? 'bg-green-100 text-green-600' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white'}`}
                                                                title="Применить к глазу"
                                                            >
                                                                {appliedLenses[eye] === `lens${num}` ? <Check className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {activeTab === 'recalc' && (
                                <div className="grid md:grid-cols-2 gap-6">
                                    {(['od', 'os'] as const).map(eye => {
                                        const recalcResult = calculateRecalc(eye);
                                        return (
                                            <div key={eye} className="border border-gray-200 rounded-2xl p-5 bg-gray-50/50">
                                                <h3 className="text-base font-bold text-gray-900 mb-4 uppercase text-center border-b pb-2">{eye === 'od' ? 'OD (Правый)' : 'OS (Левый)'}</h3>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                                                    <div><label className="text-xs font-semibold text-gray-500">FK исходный</label><input type="number" step="any" value={recalcInputs[eye].fkOriginal} onChange={e => handleRecalcChange(eye, 'fkOriginal', e.target.value)} className="input text-sm h-9" /></div>
                                                    <div><label className="text-xs font-semibold text-gray-500">FK пробной</label><input type="number" step="any" value={recalcInputs[eye].fkTrial} onChange={e => handleRecalcChange(eye, 'fkTrial', e.target.value)} className="input text-sm h-9" /></div>
                                                    <div><label className="text-xs font-semibold text-gray-500">ex пробной</label><input type="number" step="any" value={recalcInputs[eye].exTrial} onChange={e => handleRecalcChange(eye, 'exTrial', e.target.value)} className="input text-sm h-9" /></div>
                                                </div>
                                                
                                                {recalcResult !== null && (
                                                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between">
                                                        <div>
                                                            <div className="text-xs font-bold text-indigo-600 uppercase mb-1">Новое значение Eccentricity</div>
                                                            <div className="text-xl font-black text-indigo-900">E = {recalcResult.toFixed(2)}</div>
                                                        </div>
                                                        <button
                                                                type="button"
                                                                onClick={() => applyRecalc(eye, recalcResult)}
                                                                className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 ${appliedLenses[eye] === 'recalc' ? 'bg-green-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                                                            >
                                                                {appliedLenses[eye] === 'recalc' ? <><Check className="w-4 h-4"/> Применено</> : 'Применить'}
                                                        </button>
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
