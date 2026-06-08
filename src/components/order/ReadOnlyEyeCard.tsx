'use client';

import { Eye } from 'lucide-react';
import { CharacteristicLabels, Characteristic } from '@/types/order';

interface ReadOnlyEyeCardProps {
    eye: 'od' | 'os';
    label: string;
    config: any;
    qty: number;
}

export function ReadOnlyEyeCard({ eye, label, config, qty }: ReadOnlyEyeCardProps) {
    const isRgp = config.isRgp || false;
    const isMyOrthoK = config.myorthok || false;
    const characteristic = config.characteristic as Characteristic;
    const isTrial = config.dk === '50' || config.trial;
    
    const eyeColor = eye === 'od' ? 'blue' : 'purple';
    const borderAccent = eye === 'od' ? 'border-l-blue-400' : 'border-l-purple-400';

    const bgGradient = eye === 'od' ? 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600' : 'bg-gradient-to-br from-purple-50 to-purple-100 text-purple-600';

    return (
        <div className={`card border-l-4 ${borderAccent} relative bg-white`}>
            {/* Header */}
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${bgGradient}`}>
                    <Eye className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-base font-bold text-gray-900">{label}</h3>
                    <p className="text-xs text-gray-400">Параметры ортокератологической линзы</p>
                </div>
            </div>

            <div className="space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Характеристика</div>
                        <div className="text-sm font-medium text-gray-900">
                            {characteristic ? (CharacteristicLabels[characteristic] || characteristic) : '—'}
                        </div>
                    </div>

                    <div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">RGP</div>
                        <div className="text-sm font-medium text-gray-900">
                            {isRgp ? <span className="text-orange-600 font-semibold bg-orange-50 px-2 py-0.5 rounded">Да</span> : 'Нет'}
                        </div>
                    </div>

                    <div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">MyOrthoK</div>
                        <div className="text-sm font-medium text-gray-900">
                            {isMyOrthoK ? <span className="text-teal-600 font-semibold bg-teal-50 px-2 py-0.5 rounded">Да</span> : 'Нет'}
                        </div>
                    </div>

                    <div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Km</div>
                        <div className="text-sm font-medium text-gray-900">{isRgp ? '—' : (config.km ?? '—')}</div>
                    </div>

                    <div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">TP</div>
                        <div className="text-sm font-medium text-gray-900">{config.tp ?? '—'}</div>
                    </div>

                    <div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">DIA</div>
                        <div className="text-sm font-medium text-gray-900">{config.dia ?? '—'}</div>
                    </div>

                    <div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">E (Дробь)</div>
                        <div className="text-sm font-medium text-gray-900">
                            {config.e1 != null ? `${config.e1} ${config.e2 != null ? '/ ' + config.e2 : ''}` : '—'}
                        </div>
                    </div>

                    {(config.sph != null || config.cyl != null || config.ax != null) && (
                        <>
                            <div>
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">SPH</div>
                                <div className="text-sm font-medium text-gray-900">{config.sph ?? '—'}</div>
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">CYL</div>
                                <div className="text-sm font-medium text-gray-900">{config.cyl ?? '—'}</div>
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">AX</div>
                                <div className="text-sm font-medium text-gray-900">{config.ax ?? '—'}</div>
                            </div>
                        </>
                    )}

                    <div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Тор.</div>
                        <div className="text-sm font-medium text-gray-900">{config.tor ?? '—'}</div>
                    </div>

                    <div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Dk</div>
                        <div className="text-sm font-medium text-gray-900">{config.dk ?? '—'}</div>
                    </div>

                    <div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Пробная</div>
                        <div className="text-sm font-medium text-gray-900">{isTrial ? 'Да' : 'Нет'}</div>
                    </div>

                    <div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Цвет</div>
                        <div className="text-sm font-medium text-gray-900">{config.color || '—'}</div>
                    </div>

                    <div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Апик. клиренс</div>
                        <div className="text-sm font-medium text-gray-900">{config.apical_clearance ?? '—'}</div>
                    </div>

                    <div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Фактор компр.</div>
                        <div className="text-sm font-medium text-gray-900">{config.compression_factor ?? '—'}</div>
                    </div>

                    <div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Кол-во</div>
                        <div className="text-sm font-bold text-gray-900">{qty}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
