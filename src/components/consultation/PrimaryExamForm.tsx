'use client';

import React, { useState, useEffect } from 'react';
import { Stethoscope, Activity, CheckSquare, Square, Eye, FileText, Sparkles, RefreshCw } from 'lucide-react';

export interface PrimaryExamData {
    complaints?: string;
    anamnesisDisease?: string;
    anamnesisLife?: {
        allergyChecked?: boolean;
        allergyText?: string;
        heredityChecked?: boolean;
        heredityText?: string;
        medicationChecked?: boolean;
        medicationText?: string;
        dispensaryChecked?: boolean;
        dispensaryText?: string;
        surgeryChecked?: boolean;
        surgeryText?: string;
    };
    lastCorrection?: {
        odGlasses?: string;
        osGlasses?: string;
        odContacts?: string;
        osContacts?: string;
        odNear?: string;
        osNear?: string;
    };
    refraction?: {
        odSph?: string; odCyl?: string; odAx?: string;
        osSph?: string; osCyl?: string; osAx?: string;
    };
    cycloplegia?: {
        odSph?: string; odCyl?: string; odAx?: string;
        osSph?: string; osCyl?: string; osAx?: string;
    };
    keratometry?: {
        odK1?: string; odK2?: string;
        osK1?: string; osK2?: string;
    };
    visUncorrected?: {
        odDistance?: string; odNear?: string; dominantEye?: 'OD' | 'OS' | '';
        osDistance?: string; osNear?: string;
    };
    visCorrected?: {
        odSph?: string; odCyl?: string; odAx?: string; odVisus?: string; odAdd?: string; odNear?: string;
        osSph?: string; osCyl?: string; osAx?: string; osVisus?: string; osAdd?: string; osNear?: string;
    };
    eccentricity?: {
        odHoriz?: string; odVert?: string;
        osHoriz?: string; osVert?: string;
    };
    pzo?: {
        od?: string;
        os?: string;
    };
    biomicroscopy?: string;
    diagnosis?: string;
    recommendations?: string;
}

interface PrimaryExamFormProps {
    initialData?: PrimaryExamData;
    onChange?: (data: PrimaryExamData) => void;
    readOnly?: boolean;
}

const DEFAULT_BIOMICROSCOPY = `OU- веки и слезные органы без изменений, конъюнктива бледно-розовая, склера - белая, роговица - прозрачная, блестящая, передняя камера - средней глубины, равномерная, влага ПК прозрачная, радужка - структурна, зрачок - правильной округлой формы, реакция на свет – живая, хрусталик – прозрачный.`;

export default function PrimaryExamForm({ initialData, onChange, readOnly = false }: PrimaryExamFormProps) {
    const [data, setData] = useState<PrimaryExamData>(() => ({
        complaints: initialData?.complaints ?? '',
        anamnesisDisease: initialData?.anamnesisDisease ?? '',
        anamnesisLife: {
            allergyChecked: initialData?.anamnesisLife?.allergyChecked ?? false,
            allergyText: initialData?.anamnesisLife?.allergyText ?? '',
            heredityChecked: initialData?.anamnesisLife?.heredityChecked ?? false,
            heredityText: initialData?.anamnesisLife?.heredityText ?? '',
            medicationChecked: initialData?.anamnesisLife?.medicationChecked ?? false,
            medicationText: initialData?.anamnesisLife?.medicationText ?? '',
            dispensaryChecked: initialData?.anamnesisLife?.dispensaryChecked ?? false,
            dispensaryText: initialData?.anamnesisLife?.dispensaryText ?? '',
            surgeryChecked: initialData?.anamnesisLife?.surgeryChecked ?? false,
            surgeryText: initialData?.anamnesisLife?.surgeryText ?? '',
        },
        lastCorrection: {
            odGlasses: initialData?.lastCorrection?.odGlasses ?? '',
            osGlasses: initialData?.lastCorrection?.osGlasses ?? '',
            odContacts: initialData?.lastCorrection?.odContacts ?? '',
            osContacts: initialData?.lastCorrection?.osContacts ?? '',
            odNear: initialData?.lastCorrection?.odNear ?? '',
            osNear: initialData?.lastCorrection?.osNear ?? '',
        },
        refraction: {
            odSph: initialData?.refraction?.odSph ?? '',
            odCyl: initialData?.refraction?.odCyl ?? '',
            odAx: initialData?.refraction?.odAx ?? '',
            osSph: initialData?.refraction?.osSph ?? '',
            osCyl: initialData?.refraction?.osCyl ?? '',
            osAx: initialData?.refraction?.osAx ?? '',
        },
        cycloplegia: {
            odSph: initialData?.cycloplegia?.odSph ?? '',
            odCyl: initialData?.cycloplegia?.odCyl ?? '',
            odAx: initialData?.cycloplegia?.odAx ?? '',
            osSph: initialData?.cycloplegia?.osSph ?? '',
            osCyl: initialData?.cycloplegia?.osCyl ?? '',
            osAx: initialData?.cycloplegia?.osAx ?? '',
        },
        keratometry: {
            odK1: initialData?.keratometry?.odK1 ?? '',
            odK2: initialData?.keratometry?.odK2 ?? '',
            osK1: initialData?.keratometry?.osK1 ?? '',
            osK2: initialData?.keratometry?.osK2 ?? '',
        },
        visUncorrected: {
            odDistance: initialData?.visUncorrected?.odDistance ?? '',
            odNear: initialData?.visUncorrected?.odNear ?? '',
            dominantEye: initialData?.visUncorrected?.dominantEye ?? '',
            osDistance: initialData?.visUncorrected?.osDistance ?? '',
            osNear: initialData?.visUncorrected?.osNear ?? '',
        },
        visCorrected: {
            odSph: initialData?.visCorrected?.odSph ?? '',
            odCyl: initialData?.visCorrected?.odCyl ?? '',
            odAx: initialData?.visCorrected?.odAx ?? '',
            odVisus: initialData?.visCorrected?.odVisus ?? '',
            odAdd: initialData?.visCorrected?.odAdd ?? '',
            odNear: initialData?.visCorrected?.odNear ?? '',
            osSph: initialData?.visCorrected?.osSph ?? '',
            osCyl: initialData?.visCorrected?.osCyl ?? '',
            osAx: initialData?.visCorrected?.osAx ?? '',
            osVisus: initialData?.visCorrected?.osVisus ?? '',
            osAdd: initialData?.visCorrected?.osAdd ?? '',
            osNear: initialData?.visCorrected?.osNear ?? '',
        },
        eccentricity: {
            odHoriz: initialData?.eccentricity?.odHoriz ?? '',
            odVert: initialData?.eccentricity?.odVert ?? '',
            osHoriz: initialData?.eccentricity?.osHoriz ?? '',
            osVert: initialData?.eccentricity?.osVert ?? '',
        },
        pzo: {
            od: initialData?.pzo?.od ?? '',
            os: initialData?.pzo?.os ?? '',
        },
        biomicroscopy: initialData?.biomicroscopy ?? '',
        diagnosis: initialData?.diagnosis ?? '',
    }));

    useEffect(() => {
        if (onChange) {
            onChange(data);
        }
    }, []);

    const updateField = (path: string, val: any) => {
        if (readOnly) return;
        setData(prev => {
            const parts = path.split('.');
            if (parts.length === 1) {
                const next = { ...prev, [parts[0]]: val };
                if (onChange) onChange(next);
                return next;
            }
            if (parts.length === 2) {
                const subObj = { ...((prev as any)[parts[0]] || {}), [parts[1]]: val };
                const next = { ...prev, [parts[0]]: subObj };
                if (onChange) onChange(next);
                return next;
            }
            return prev;
        });
    };

    // Calculate K1 - K2 diff
    const calcKDiff = (k1?: string, k2?: string) => {
        const v1 = parseFloat(k1 || '');
        const v2 = parseFloat(k2 || '');
        if (isNaN(v1) || isNaN(v2)) return '—';
        return Math.abs(v1 - v2).toFixed(2);
    };

    const inputCls = "w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-50 disabled:text-gray-500";
    const cellCls = "p-2 border border-slate-200 align-middle text-xs";
    const headerCls = "p-2 border border-slate-200 bg-slate-50 font-bold text-slate-700 text-xs text-center uppercase tracking-wider";

    return (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden text-slate-800 font-sans text-xs">
            {/* Header Title */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 px-6 py-4 text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                        <Stethoscope className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold tracking-wide uppercase">ПЕРВИЧНЫЙ ОСМОТР ВРАЧА-ОФТАЛЬМОЛОГА</h2>
                        <p className="text-xs text-blue-200">Медицинский протокол обследования глаз</p>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* 1. Жалобы */}
                <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-start border-b border-slate-100 pb-4">
                    <label className="font-bold text-slate-700 md:col-span-1 pt-2 uppercase tracking-wide text-xs">Жалобы:</label>
                    <div className="md:col-span-5">
                        <textarea
                            disabled={readOnly}
                            value={data.complaints}
                            onChange={e => updateField('complaints', e.target.value)}
                            className="w-full border border-gray-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none"
                            rows={2}
                            
                        />
                    </div>
                </div>

                {/* 2. Анамнез заболевания */}
                <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-start border-b border-slate-100 pb-4">
                    <label className="font-bold text-slate-700 md:col-span-1 pt-2 uppercase tracking-wide text-xs">Анамнез заболевания:</label>
                    <div className="md:col-span-5">
                        <textarea
                            disabled={readOnly}
                            value={data.anamnesisDisease}
                            onChange={e => updateField('anamnesisDisease', e.target.value)}
                            className="w-full border border-gray-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none"
                            rows={2}
                            
                        />
                    </div>
                </div>

                {/* 3. Анамнез жизни */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2 font-bold text-slate-700 uppercase tracking-wider text-xs border-b border-slate-200 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-blue-600" />
                        Анамнез жизни
                    </div>
                    <div className="p-4 space-y-3">
                        {/* Аллергоанамнез */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center border-b border-slate-100 pb-2">
                            <span className="font-semibold text-slate-700">Аллергоанамнез:</span>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    disabled={readOnly}
                                    checked={!data.anamnesisLife?.allergyChecked}
                                    onChange={e => updateField('anamnesisLife.allergyChecked', !e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span>не отягощен</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer col-span-2">
                                <input
                                    type="checkbox"
                                    disabled={readOnly}
                                    checked={data.anamnesisLife?.allergyChecked || false}
                                    onChange={e => updateField('anamnesisLife.allergyChecked', e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span>отягощен:</span>
                                <input
                                    type="text"
                                    disabled={readOnly || !data.anamnesisLife?.allergyChecked}
                                    value={data.anamnesisLife?.allergyText || ''}
                                    onChange={e => updateField('anamnesisLife.allergyText', e.target.value)}
                                    
                                    className={inputCls}
                                />
                            </label>
                        </div>

                        {/* Наследственность */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center border-b border-slate-100 pb-2">
                            <span className="font-semibold text-slate-700">Наследственность:</span>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    disabled={readOnly}
                                    checked={!data.anamnesisLife?.heredityChecked}
                                    onChange={e => updateField('anamnesisLife.heredityChecked', !e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span>не отягощена</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer col-span-2">
                                <input
                                    type="checkbox"
                                    disabled={readOnly}
                                    checked={data.anamnesisLife?.heredityChecked || false}
                                    onChange={e => updateField('anamnesisLife.heredityChecked', e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span>отягощена:</span>
                                <input
                                    type="text"
                                    disabled={readOnly || !data.anamnesisLife?.heredityChecked}
                                    value={data.anamnesisLife?.heredityText || ''}
                                    onChange={e => updateField('anamnesisLife.heredityText', e.target.value)}
                                    
                                    className={inputCls}
                                />
                            </label>
                        </div>

                        {/* Прием медикаментов */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center border-b border-slate-100 pb-2">
                            <span className="font-semibold text-slate-700">Прием медикаментов:</span>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    disabled={readOnly}
                                    checked={!data.anamnesisLife?.medicationChecked}
                                    onChange={e => updateField('anamnesisLife.medicationChecked', !e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span>не принимает</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer col-span-2">
                                <input
                                    type="checkbox"
                                    disabled={readOnly}
                                    checked={data.anamnesisLife?.medicationChecked || false}
                                    onChange={e => updateField('anamnesisLife.medicationChecked', e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span>принимает:</span>
                                <input
                                    type="text"
                                    disabled={readOnly || !data.anamnesisLife?.medicationChecked}
                                    value={data.anamnesisLife?.medicationText || ''}
                                    onChange={e => updateField('anamnesisLife.medicationText', e.target.value)}
                                    
                                    className={inputCls}
                                />
                            </label>
                        </div>

                        {/* Состоит на диспансерном учете */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center border-b border-slate-100 pb-2">
                            <span className="font-semibold text-slate-700">Диспансерный учет:</span>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    disabled={readOnly}
                                    checked={!data.anamnesisLife?.dispensaryChecked}
                                    onChange={e => updateField('anamnesisLife.dispensaryChecked', !e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span>нет</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer col-span-2">
                                <input
                                    type="checkbox"
                                    disabled={readOnly}
                                    checked={data.anamnesisLife?.dispensaryChecked || false}
                                    onChange={e => updateField('anamnesisLife.dispensaryChecked', e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span>да:</span>
                                <input
                                    type="text"
                                    disabled={readOnly || !data.anamnesisLife?.dispensaryChecked}
                                    value={data.anamnesisLife?.dispensaryText || ''}
                                    onChange={e => updateField('anamnesisLife.dispensaryText', e.target.value)}
                                    
                                    className={inputCls}
                                />
                            </label>
                        </div>

                        {/* Операции */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
                            <span className="font-semibold text-slate-700">Операции:</span>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    disabled={readOnly}
                                    checked={!data.anamnesisLife?.surgeryChecked}
                                    onChange={e => updateField('anamnesisLife.surgeryChecked', !e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span>не было</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer col-span-2">
                                <input
                                    type="checkbox"
                                    disabled={readOnly}
                                    checked={data.anamnesisLife?.surgeryChecked || false}
                                    onChange={e => updateField('anamnesisLife.surgeryChecked', e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span>да:</span>
                                <input
                                    type="text"
                                    disabled={readOnly || !data.anamnesisLife?.surgeryChecked}
                                    value={data.anamnesisLife?.surgeryText || ''}
                                    onChange={e => updateField('anamnesisLife.surgeryText', e.target.value)}
                                    
                                    className={inputCls}
                                />
                            </label>
                        </div>
                    </div>
                </div>

                {/* 4. Таблица: Последняя коррекция */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2 font-bold text-slate-700 uppercase tracking-wider text-xs border-b border-slate-200">
                        Последняя коррекция
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-center border-collapse">
                            <thead>
                                <tr>
                                    <th className={headerCls}>Глаз</th>
                                    <th className={headerCls}>Очки для дали</th>
                                    <th className={headerCls}>Контактные линзы</th>
                                    <th className={headerCls}>Очки для близи</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className={`${cellCls} font-bold text-blue-600 bg-blue-50/40 w-20`}>OD</td>
                                    <td className={cellCls}>
                                        <input disabled={readOnly} type="text" value={data.lastCorrection?.odGlasses || ''} onChange={e => updateField('lastCorrection.odGlasses', e.target.value)}  className={inputCls} />
                                    </td>
                                    <td className={cellCls}>
                                        <input disabled={readOnly} type="text" value={data.lastCorrection?.odContacts || ''} onChange={e => updateField('lastCorrection.odContacts', e.target.value)}  className={inputCls} />
                                    </td>
                                    <td className={cellCls}>
                                        <input disabled={readOnly} type="text" value={data.lastCorrection?.odNear || ''} onChange={e => updateField('lastCorrection.odNear', e.target.value)}  className={inputCls} />
                                    </td>
                                </tr>
                                <tr>
                                    <td className={`${cellCls} font-bold text-teal-600 bg-teal-50/40 w-20`}>OS</td>
                                    <td className={cellCls}>
                                        <input disabled={readOnly} type="text" value={data.lastCorrection?.osGlasses || ''} onChange={e => updateField('lastCorrection.osGlasses', e.target.value)}  className={inputCls} />
                                    </td>
                                    <td className={cellCls}>
                                        <input disabled={readOnly} type="text" value={data.lastCorrection?.osContacts || ''} onChange={e => updateField('lastCorrection.osContacts', e.target.value)}  className={inputCls} />
                                    </td>
                                    <td className={cellCls}>
                                        <input disabled={readOnly} type="text" value={data.lastCorrection?.osNear || ''} onChange={e => updateField('lastCorrection.osNear', e.target.value)}  className={inputCls} />
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 5. Рефракция и 6. Циклоплегия */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Рефракция */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-slate-50 px-4 py-2 font-bold text-slate-700 uppercase tracking-wider text-xs border-b border-slate-200">
                            Рефракция
                        </div>
                        <table className="w-full text-center border-collapse">
                            <thead>
                                <tr>
                                    <th className={headerCls}>Глаз</th>
                                    <th className={headerCls}>Dsph</th>
                                    <th className={headerCls}>Dcyl</th>
                                    <th className={headerCls}>axis</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className={`${cellCls} font-bold text-blue-600 bg-blue-50/40 w-16`}>OD</td>
                                    <td className={cellCls}><input disabled={readOnly} type="text" value={data.refraction?.odSph || ''} onChange={e => updateField('refraction.odSph', e.target.value)}  className={inputCls} /></td>
                                    <td className={cellCls}><input disabled={readOnly} type="text" value={data.refraction?.odCyl || ''} onChange={e => updateField('refraction.odCyl', e.target.value)}  className={inputCls} /></td>
                                    <td className={cellCls}><input disabled={readOnly} type="text" value={data.refraction?.odAx || ''} onChange={e => updateField('refraction.odAx', e.target.value)}  className={inputCls} /></td>
                                </tr>
                                <tr>
                                    <td className={`${cellCls} font-bold text-teal-600 bg-teal-50/40 w-16`}>OS</td>
                                    <td className={cellCls}><input disabled={readOnly} type="text" value={data.refraction?.osSph || ''} onChange={e => updateField('refraction.osSph', e.target.value)}  className={inputCls} /></td>
                                    <td className={cellCls}><input disabled={readOnly} type="text" value={data.refraction?.osCyl || ''} onChange={e => updateField('refraction.osCyl', e.target.value)}  className={inputCls} /></td>
                                    <td className={cellCls}><input disabled={readOnly} type="text" value={data.refraction?.osAx || ''} onChange={e => updateField('refraction.osAx', e.target.value)}  className={inputCls} /></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Циклоплегия */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-slate-50 px-4 py-2 font-bold text-slate-700 uppercase tracking-wider text-xs border-b border-slate-200">
                            Циклоплегия
                        </div>
                        <table className="w-full text-center border-collapse">
                            <thead>
                                <tr>
                                    <th className={headerCls}>Глаз</th>
                                    <th className={headerCls}>Dsph</th>
                                    <th className={headerCls}>Dcyl</th>
                                    <th className={headerCls}>axis</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className={`${cellCls} font-bold text-blue-600 bg-blue-50/40 w-16`}>OD</td>
                                    <td className={cellCls}><input disabled={readOnly} type="text" value={data.cycloplegia?.odSph || ''} onChange={e => updateField('cycloplegia.odSph', e.target.value)}  className={inputCls} /></td>
                                    <td className={cellCls}><input disabled={readOnly} type="text" value={data.cycloplegia?.odCyl || ''} onChange={e => updateField('cycloplegia.odCyl', e.target.value)}  className={inputCls} /></td>
                                    <td className={cellCls}><input disabled={readOnly} type="text" value={data.cycloplegia?.odAx || ''} onChange={e => updateField('cycloplegia.odAx', e.target.value)}  className={inputCls} /></td>
                                </tr>
                                <tr>
                                    <td className={`${cellCls} font-bold text-teal-600 bg-teal-50/40 w-16`}>OS</td>
                                    <td className={cellCls}><input disabled={readOnly} type="text" value={data.cycloplegia?.osSph || ''} onChange={e => updateField('cycloplegia.osSph', e.target.value)}  className={inputCls} /></td>
                                    <td className={cellCls}><input disabled={readOnly} type="text" value={data.cycloplegia?.osCyl || ''} onChange={e => updateField('cycloplegia.osCyl', e.target.value)}  className={inputCls} /></td>
                                    <td className={cellCls}><input disabled={readOnly} type="text" value={data.cycloplegia?.osAx || ''} onChange={e => updateField('cycloplegia.osAx', e.target.value)}  className={inputCls} /></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 7. Кератометрия */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2 font-bold text-slate-700 uppercase tracking-wider text-xs border-b border-slate-200">
                        Кератометрия
                    </div>
                    <table className="w-full text-center border-collapse">
                        <thead>
                            <tr>
                                <th className={headerCls}>OD: K1</th>
                                <th className={headerCls}>K2</th>
                                <th className={headerCls}>K1-K2</th>
                                <th className={headerCls}>OS: K1</th>
                                <th className={headerCls}>K2</th>
                                <th className={headerCls}>K1-K2</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className={cellCls}>
                                    <input disabled={readOnly} type="text" value={data.keratometry?.odK1 || ''} onChange={e => updateField('keratometry.odK1', e.target.value)}  className={inputCls} />
                                </td>
                                <td className={cellCls}>
                                    <input disabled={readOnly} type="text" value={data.keratometry?.odK2 || ''} onChange={e => updateField('keratometry.odK2', e.target.value)}  className={inputCls} />
                                </td>
                                <td className={`${cellCls} font-bold text-blue-700 bg-blue-50/50`}>
                                    {calcKDiff(data.keratometry?.odK1, data.keratometry?.odK2)}
                                </td>
                                <td className={cellCls}>
                                    <input disabled={readOnly} type="text" value={data.keratometry?.osK1 || ''} onChange={e => updateField('keratometry.osK1', e.target.value)}  className={inputCls} />
                                </td>
                                <td className={cellCls}>
                                    <input disabled={readOnly} type="text" value={data.keratometry?.osK2 || ''} onChange={e => updateField('keratometry.osK2', e.target.value)}  className={inputCls} />
                                </td>
                                <td className={`${cellCls} font-bold text-teal-700 bg-teal-50/50`}>
                                    {calcKDiff(data.keratometry?.osK1, data.keratometry?.osK2)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* 8. Vis без коррекции и 9. Vis с коррекцией */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Vis без коррекции */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-slate-50 px-4 py-2 font-bold text-slate-700 uppercase tracking-wider text-xs border-b border-slate-200">
                            Vis без коррекции
                        </div>
                        <table className="w-full text-center border-collapse">
                            <thead>
                                <tr>
                                    <th className={headerCls}>Глаз</th>
                                    <th className={headerCls}>Вдаль</th>
                                    <th className={headerCls}>Вблизи</th>
                                    <th className={headerCls}>Domin.</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className={`${cellCls} font-bold text-blue-600 bg-blue-50/40 w-16`}>OD</td>
                                    <td className={cellCls}><input disabled={readOnly} type="text" value={data.visUncorrected?.odDistance || ''} onChange={e => updateField('visUncorrected.odDistance', e.target.value)}  className={inputCls} /></td>
                                    <td className={cellCls}><input disabled={readOnly} type="text" value={data.visUncorrected?.odNear || ''} onChange={e => updateField('visUncorrected.odNear', e.target.value)}  className={inputCls} /></td>
                                    <td className={cellCls}>
                                        <input
                                            type="radio"
                                            name="dominantEye"
                                            disabled={readOnly}
                                            checked={data.visUncorrected?.dominantEye === 'OD'}
                                            onChange={() => updateField('visUncorrected.dominantEye', 'OD')}
                                            className="text-blue-600 focus:ring-blue-500"
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td className={`${cellCls} font-bold text-teal-600 bg-teal-50/40 w-16`}>OS</td>
                                    <td className={cellCls}><input disabled={readOnly} type="text" value={data.visUncorrected?.osDistance || ''} onChange={e => updateField('visUncorrected.osDistance', e.target.value)}  className={inputCls} /></td>
                                    <td className={cellCls}><input disabled={readOnly} type="text" value={data.visUncorrected?.osNear || ''} onChange={e => updateField('visUncorrected.osNear', e.target.value)}  className={inputCls} /></td>
                                    <td className={cellCls}>
                                        <input
                                            type="radio"
                                            name="dominantEye"
                                            disabled={readOnly}
                                            checked={data.visUncorrected?.dominantEye === 'OS'}
                                            onChange={() => updateField('visUncorrected.dominantEye', 'OS')}
                                            className="text-teal-600 focus:ring-teal-500"
                                        />
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Vis с коррекцией */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-slate-50 px-4 py-2 font-bold text-slate-700 uppercase tracking-wider text-xs border-b border-slate-200">
                            Vis с коррекцией
                        </div>
                        <table className="w-full text-center border-collapse">
                            <thead>
                                <tr>
                                    <th className={headerCls}>Глаз</th>
                                    <th className={headerCls}>Dsph</th>
                                    <th className={headerCls}>Dcyl</th>
                                    <th className={headerCls}>axis</th>
                                    <th className={headerCls}>visus</th>
                                    <th className={headerCls}>адд</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className={`${cellCls} font-bold text-blue-600 bg-blue-50/40 w-12`}>OD</td>
                                    <td className={cellCls}><input disabled={readOnly} type="text" value={data.visCorrected?.odSph || ''} onChange={e => updateField('visCorrected.odSph', e.target.value)} className={inputCls} /></td>
                                    <td className={cellCls}><input disabled={readOnly} type="text" value={data.visCorrected?.odCyl || ''} onChange={e => updateField('visCorrected.odCyl', e.target.value)} className={inputCls} /></td>
                                    <td className={cellCls}><input disabled={readOnly} type="text" value={data.visCorrected?.odAx || ''} onChange={e => updateField('visCorrected.odAx', e.target.value)} className={inputCls} /></td>
                                    <td className={cellCls}><input disabled={readOnly} type="text" value={data.visCorrected?.odVisus || ''} onChange={e => updateField('visCorrected.odVisus', e.target.value)} className={inputCls} /></td>
                                    <td className={cellCls}><input disabled={readOnly} type="text" value={data.visCorrected?.odAdd || ''} onChange={e => updateField('visCorrected.odAdd', e.target.value)} className={inputCls} /></td>
                                </tr>
                                <tr>
                                    <td className={`${cellCls} font-bold text-teal-600 bg-teal-50/40 w-12`}>OS</td>
                                    <td className={cellCls}><input disabled={readOnly} type="text" value={data.visCorrected?.osSph || ''} onChange={e => updateField('visCorrected.osSph', e.target.value)} className={inputCls} /></td>
                                    <td className={cellCls}><input disabled={readOnly} type="text" value={data.visCorrected?.osCyl || ''} onChange={e => updateField('visCorrected.osCyl', e.target.value)} className={inputCls} /></td>
                                    <td className={cellCls}><input disabled={readOnly} type="text" value={data.visCorrected?.osAx || ''} onChange={e => updateField('visCorrected.osAx', e.target.value)} className={inputCls} /></td>
                                    <td className={cellCls}><input disabled={readOnly} type="text" value={data.visCorrected?.osVisus || ''} onChange={e => updateField('visCorrected.osVisus', e.target.value)} className={inputCls} /></td>
                                    <td className={cellCls}><input disabled={readOnly} type="text" value={data.visCorrected?.osAdd || ''} onChange={e => updateField('visCorrected.osAdd', e.target.value)} className={inputCls} /></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 10. Эксцентриситет и 11. ПЗО */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Эксцентриситет */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-slate-50 px-4 py-2 font-bold text-slate-700 uppercase tracking-wider text-xs border-b border-slate-200">
                            Эксцентриситет
                        </div>
                        <table className="w-full text-center border-collapse">
                            <thead>
                                <tr>
                                    <th className={headerCls}>Глаз</th>
                                    <th className={headerCls}>Горизонтальный (гор.)</th>
                                    <th className={headerCls}>Вертикальный (верт.)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className={`${cellCls} font-bold text-blue-600 bg-blue-50/40 w-16`}>OD</td>
                                    <td className={cellCls}><input disabled={readOnly} type="text" value={data.eccentricity?.odHoriz || ''} onChange={e => updateField('eccentricity.odHoriz', e.target.value)}  className={inputCls} /></td>
                                    <td className={cellCls}><input disabled={readOnly} type="text" value={data.eccentricity?.odVert || ''} onChange={e => updateField('eccentricity.odVert', e.target.value)}  className={inputCls} /></td>
                                </tr>
                                <tr>
                                    <td className={`${cellCls} font-bold text-teal-600 bg-teal-50/40 w-16`}>OS</td>
                                    <td className={cellCls}><input disabled={readOnly} type="text" value={data.eccentricity?.osHoriz || ''} onChange={e => updateField('eccentricity.osHoriz', e.target.value)}  className={inputCls} /></td>
                                    <td className={cellCls}><input disabled={readOnly} type="text" value={data.eccentricity?.osVert || ''} onChange={e => updateField('eccentricity.osVert', e.target.value)}  className={inputCls} /></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* ПЗО */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-slate-50 px-4 py-2 font-bold text-slate-700 uppercase tracking-wider text-xs border-b border-slate-200">
                            ПЗО (Переднее-задняя ось / Длина глаза)
                        </div>
                        <table className="w-full text-center border-collapse">
                            <thead>
                                <tr>
                                    <th className={headerCls}>Глаз</th>
                                    <th className={headerCls}>Значение ПЗО (мм)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className={`${cellCls} font-bold text-blue-600 bg-blue-50/40 w-16`}>OD</td>
                                    <td className={cellCls}><input disabled={readOnly} type="text" value={data.pzo?.od || ''} onChange={e => updateField('pzo.od', e.target.value)}  className={inputCls} /></td>
                                </tr>
                                <tr>
                                    <td className={`${cellCls} font-bold text-teal-600 bg-teal-50/40 w-16`}>OS</td>
                                    <td className={cellCls}><input disabled={readOnly} type="text" value={data.pzo?.os || ''} onChange={e => updateField('pzo.os', e.target.value)}  className={inputCls} /></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 12. Биомикроскопия */}
                <div className="space-y-1">
                    <div className="flex justify-between items-center">
                        <label className="font-bold text-slate-700 uppercase tracking-wide text-xs">Биомикроскопия:</label>
                        {!readOnly && (
                            <button
                                type="button"
                                onClick={() => updateField('biomicroscopy', DEFAULT_BIOMICROSCOPY)}
                                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                            >
                                <Sparkles className="w-3.5 h-3.5" /> Сбросить на стандартный нормальный текст
                            </button>
                        )}
                    </div>
                    <textarea
                        disabled={readOnly}
                        value={data.biomicroscopy || ''}
                        onChange={e => updateField('biomicroscopy', e.target.value)}
                        className="w-full border border-gray-200 rounded-xl p-3 text-xs leading-relaxed focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none bg-white"
                        rows={3}
                    />
                </div>

                {/* 13. Диагноз */}
                <div className="space-y-1">
                    <label className="font-bold text-red-600 uppercase tracking-wide text-xs">Диагноз:</label>
                    <textarea
                        disabled={readOnly}
                        value={data.diagnosis || ''}
                        onChange={e => updateField('diagnosis', e.target.value)}
                        className="w-full border border-red-200 bg-red-50/30 rounded-xl p-3 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none resize-none"
                        rows={2}
                        
                    />
                </div>

                {/* 14. Рекомендации */}
                <div className="space-y-1">
                    <label className="font-bold text-emerald-700 uppercase tracking-wide text-xs">Рекомендации:</label>
                    <textarea
                        disabled={readOnly}
                        value={data.recommendations || ''}
                        onChange={e => updateField('recommendations', e.target.value)}
                        className="w-full border border-emerald-200 bg-emerald-50/30 rounded-xl p-3 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none"
                        rows={2}
                        
                    />
                </div>
            </div>
        </div>
    );
}
