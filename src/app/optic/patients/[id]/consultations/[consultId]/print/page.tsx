import { notFound } from 'next/navigation';
import prisma from '@/lib/db/prisma';
import { auth } from '@/auth';

export default async function ConsultationPrintPage({ params }: { params: { id: string, consultId: string } }) {
    const session = await auth();
    if (!session?.user) return notFound();

    const patient = await prisma.patient.findUnique({
        where: { id: params.id },
    });

    const consultation = await prisma.consultation.findUnique({
        where: { id: params.consultId },
        include: { doctor: true }
    });

    if (!patient || !consultation) return notFound();

    const fmt = (val: number | null | undefined) => {
        if (val == null) return '—';
        return val.toString();
    };

    const opticName = session?.user?.profile?.opticName || session?.user?.profile?.clinic || 'Оптика';
    const doctorName = consultation.doctor?.fullName || session?.user?.profile?.fullName || 'Врач не указан';

    return (
        <div className="bg-white p-4 sm:p-8 max-w-4xl mx-auto min-h-screen text-black print:p-0 print:m-0 print:max-w-none" style={{ fontFamily: 'Arial, sans-serif' }}>
            <style>{`
                @media print {
                    @page { margin: 1cm; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .avoid-break { page-break-inside: avoid; break-inside: avoid; }
                }
            `}</style>
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-6">
                <div>
                    <h1 className="text-2xl font-bold uppercase tracking-wider mb-2">Медицинская выписка</h1>
                    <p className="font-medium text-lg">{opticName}</p>
                    <p className="text-sm text-gray-500">Консультация оптометриста/офтальмолога</p>
                    <p className="text-sm text-gray-500 mt-1">Врач: <span className="font-medium text-black">{doctorName}</span></p>
                </div>
                <div className="text-right">
                    <p className="font-semibold text-lg">{patient.name}</p>
                    <p className="text-sm">ИИН: {patient.iin || '—'}</p>
                    <p className="text-sm">Дата рождения: {patient.birthDate ? new Date(patient.birthDate).toLocaleDateString('ru-RU') : '—'}</p>
                    <p className="text-sm">Телефон: {patient.phone}</p>
                </div>
            </div>

            {/* Visit Info */}
            <div className="flex justify-between items-center bg-gray-100 p-4 rounded-lg mb-8">
                <div>
                    <p className="text-sm text-gray-600">Дата приема:</p>
                    <p className="font-medium">{new Date(consultation.visitDate).toLocaleDateString('ru-RU')}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-600">Тип приема:</p>
                    <p className="font-medium">
                        {consultation.type === 'exam' ? 'Первичный осмотр' : 
                         consultation.type === 'follow_up' ? 'Повторный приём' : 
                         consultation.type === 'fitting' ? 'Подбор линз' : 'Другое'}
                    </p>
                </div>
                <div>
                    <p className="text-sm text-gray-600">Врач/Оптометрист:</p>
                    <p className="font-medium">{doctorName}</p>
                </div>
            </div>

            {/* Metrics */}
            <div className="space-y-6">
                {(consultation.visualAcuityOD != null || consultation.visualAcuityOS != null || consultation.intraocularPressureOD != null) && (
                    <div className="avoid-break">
                        <h2 className="text-lg font-bold border-b border-gray-200 pb-2 mb-4">Основные показатели</h2>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="py-2 text-gray-500 font-medium">Показатель</th>
                                    <th className="py-2 font-bold text-center">OD (Правый)</th>
                                    <th className="py-2 font-bold text-center">OS (Левый)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-gray-100">
                                    <td className="py-3 text-gray-700">Острота зрения (Visus)</td>
                                    <td className="py-3 text-center font-mono">{fmt(consultation.visualAcuityOD)}</td>
                                    <td className="py-3 text-center font-mono">{fmt(consultation.visualAcuityOS)}</td>
                                </tr>
                                <tr className="border-b border-gray-100">
                                    <td className="py-3 text-gray-700">ВГД (мм рт. ст.)</td>
                                    <td className="py-3 text-center font-mono">{fmt(consultation.intraocularPressureOD)}</td>
                                    <td className="py-3 text-center font-mono">{fmt(consultation.intraocularPressureOS)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Topography */}
                {(consultation.k1OD != null || consultation.k1OS != null) && (
                    <div className="avoid-break">
                        <h2 className="text-lg font-bold border-b border-gray-200 pb-2 mb-4">Кератометрия / Топография</h2>
                        <table className="w-full text-sm border border-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="p-2 border border-gray-200">Глаз</th>
                                    <th className="p-2 border border-gray-200">K1</th>
                                    <th className="p-2 border border-gray-200">K2</th>
                                    <th className="p-2 border border-gray-200">Axis</th>
                                    <th className="p-2 border border-gray-200">Astig</th>
                                    <th className="p-2 border border-gray-200">Pachy</th>
                                    <th className="p-2 border border-gray-200">e-value</th>
                                </tr>
                            </thead>
                            <tbody className="text-center">
                                <tr>
                                    <td className="p-2 border border-gray-200 font-bold">OD</td>
                                    <td className="p-2 border border-gray-200">{fmt(consultation.k1OD)}</td>
                                    <td className="p-2 border border-gray-200">{fmt(consultation.k2OD)}</td>
                                    <td className="p-2 border border-gray-200">{fmt(consultation.axisOD)}</td>
                                    <td className="p-2 border border-gray-200">{fmt(consultation.astigmatismOD)}</td>
                                    <td className="p-2 border border-gray-200">{fmt(consultation.pachymetryOD)}</td>
                                    <td className="p-2 border border-gray-200">{fmt(consultation.eccentricityOD)}</td>
                                </tr>
                                <tr>
                                    <td className="p-2 border border-gray-200 font-bold">OS</td>
                                    <td className="p-2 border border-gray-200">{fmt(consultation.k1OS)}</td>
                                    <td className="p-2 border border-gray-200">{fmt(consultation.k2OS)}</td>
                                    <td className="p-2 border border-gray-200">{fmt(consultation.axisOS)}</td>
                                    <td className="p-2 border border-gray-200">{fmt(consultation.astigmatismOS)}</td>
                                    <td className="p-2 border border-gray-200">{fmt(consultation.pachymetryOS)}</td>
                                    <td className="p-2 border border-gray-200">{fmt(consultation.eccentricityOS)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}

                {(consultation.refractionOD || consultation.refractionOS) && (
                    <div className="avoid-break">
                        <h2 className="text-lg font-bold border-b border-gray-200 pb-2 mb-4">Рефрактометрия</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="font-semibold mb-1">OD (Правый)</p>
                                <p className="bg-gray-50 p-2 rounded">{consultation.refractionOD || '—'}</p>
                            </div>
                            <div>
                                <p className="font-semibold mb-1">OS (Левый)</p>
                                <p className="bg-gray-50 p-2 rounded">{consultation.refractionOS || '—'}</p>
                            </div>
                        </div>
                    </div>
                )}

                {(consultation.lensFittingOD || consultation.lensFittingOS) && (
                    <div className="avoid-break">
                        <h2 className="text-lg font-bold border-b border-gray-200 pb-2 mb-4">Подбор линз</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="font-semibold mb-1">OD (Правый)</p>
                                <p className="bg-gray-50 p-2 rounded">{consultation.lensFittingOD || '—'}</p>
                            </div>
                            <div>
                                <p className="font-semibold mb-1">OS (Левый)</p>
                                <p className="bg-gray-50 p-2 rounded">{consultation.lensFittingOS || '—'}</p>
                            </div>
                        </div>
                    </div>
                )}

                {consultation.diagnosis && (
                    <div className="avoid-break">
                        <h2 className="text-lg font-bold border-b border-gray-200 pb-2 mb-2">Диагноз</h2>
                        <p className="whitespace-pre-wrap">{consultation.diagnosis}</p>
                    </div>
                )}

                {consultation.treatment && (
                    <div className="avoid-break">
                        <h2 className="text-lg font-bold border-b border-gray-200 pb-2 mb-2">Рекомендации / План лечения</h2>
                        <p className="whitespace-pre-wrap">{consultation.treatment}</p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="mt-16 pt-8 border-t border-gray-200 flex justify-between avoid-break">
                <div>
                    {consultation.nextVisit && (
                        <p className="text-sm">
                            <span className="text-gray-500">Следующий визит: </span>
                            <strong>{new Date(consultation.nextVisit).toLocaleDateString('ru-RU')}</strong>
                        </p>
                    )}
                </div>
                <div className="text-center w-64">
                    <div className="border-b border-black mb-2 h-8"></div>
                    <p className="text-sm text-gray-500">Подпись врача ({doctorName})</p>
                </div>
            </div>

            {/* Auto Print Script */}
            <script
                dangerouslySetInnerHTML={{
                    __html: `window.onload = function() { window.print(); }`
                }}
            />
        </div>
    );
}
