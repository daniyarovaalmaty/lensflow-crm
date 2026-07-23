import { notFound } from 'next/navigation';
import prisma from '@/lib/db/prisma';
import { auth } from '@/auth';

export default async function PrescriptionPrintPage({ params }: { params: { id: string, rxId: string } }) {
    const session = await auth();
    if (!session?.user) return notFound();

    const patient = await prisma.patient.findUnique({
        where: { id: params.id },
    });

    const prescription = await prisma.prescription.findUnique({
        where: { id: params.rxId },
        include: { doctor: true }
    });

    if (!patient || !prescription) return notFound();

    const fmt = (val: number | string | null | undefined, plus = true) => {
        if (val == null) return '';
        if (typeof val !== 'number') return val;
        return (plus && val > 0 ? '+' : '') + val.toFixed(2);
    };

    const typeLabels: Record<string, string> = {
        glasses: 'Очки', contacts: 'Контактные линзы', 'ortho-k': 'Орто-К'
    };

    const opticName = session?.user?.profile?.opticName || session?.user?.profile?.clinic || 'Оптика';
    const doctorName = prescription.doctor?.fullName || session?.user?.profile?.fullName || 'Врач не указан';

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
                    <h1 className="text-2xl font-bold uppercase tracking-wider mb-2">Рецепт на {typeLabels[prescription.type] || 'оптику'}</h1>
                    <p className="font-medium text-lg">{opticName}</p>
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
                    <p className="text-sm text-gray-600">Дата выписки:</p>
                    <p className="font-medium">{new Date(prescription.prescribedAt).toLocaleDateString('ru-RU')}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-600">Врач/Оптометрист:</p>
                    <p className="font-medium">{doctorName}</p>
                </div>
            </div>

            {/* Medical Info */}
            <div className="space-y-6 mb-8 avoid-break">
                <div>
                    <h2 className="text-lg font-bold border-b border-gray-200 pb-2 mb-4">Медицинские данные</h2>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                        {(prescription.complaints || patient.complaints) && (
                            <div className="col-span-2">
                                <span className="font-semibold">Жалобы:</span> {(prescription.complaints || patient.complaints)}
                            </div>
                        )}
                        {(prescription.diseaseHistory || patient.anamnesisDisease) && (
                            <div className="col-span-2">
                                <span className="font-semibold">Анамнез заболевания:</span> {(prescription.diseaseHistory || patient.anamnesisDisease)}
                            </div>
                        )}
                        {(prescription.medicalHistory || patient.anamnesisLife) && (
                            <div className="col-span-2">
                                <span className="font-semibold">Анамнез жизни:</span> {(prescription.medicalHistory || patient.anamnesisLife)}
                            </div>
                        )}
                        {patient.allergies && (
                            <div>
                                <span className="font-semibold">Аллергоанамнез:</span> {patient.allergies}
                            </div>
                        )}
                        {patient.heredity && (
                            <div>
                                <span className="font-semibold">Наследственность:</span> {patient.heredity}
                            </div>
                        )}
                        {patient.medications && (
                            <div>
                                <span className="font-semibold">Прием медикаментов:</span> {patient.medications}
                            </div>
                        )}
                        {patient.surgeries && (
                            <div>
                                <span className="font-semibold">Операции:</span> {patient.surgeries}
                            </div>
                        )}
                        {prescription.refraction && (
                            <div className="col-span-2">
                                <span className="font-semibold">Рефракция:</span> {prescription.refraction}
                            </div>
                        )}
                        {prescription.cycloplegia && (
                            <div className="col-span-2">
                                <span className="font-semibold">Циклоплегия:</span> {prescription.cycloplegia}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Metrics */}
            <div className="space-y-6 avoid-break">
                <div>
                    <h2 className="text-lg font-bold border-b border-gray-200 pb-2 mb-4">Параметры коррекции</h2>
                    <table className="w-full text-center border-collapse border border-black text-sm">
                        <thead>
                            <tr className="bg-gray-100 border-b border-black">
                                <th className="py-2 px-2 border-r border-black font-bold">Глаз</th>
                                <th className="py-2 px-2 border-r border-black font-bold">Sph</th>
                                <th className="py-2 px-2 border-r border-black font-bold">Cyl</th>
                                <th className="py-2 px-2 border-r border-black font-bold">Ax</th>
                                <th className="py-2 px-2 border-r border-black font-bold">Add</th>
                                {prescription.type !== 'contacts' && prescription.type !== 'ortho-k' && (
                                    <>
                                        <th className="py-2 px-2 border-r border-black font-bold">PD (Даль)</th>
                                        <th className="py-2 px-2 border-r border-black font-bold">PD (Близь)</th>
                                        <th className="py-2 px-2 border-r border-black font-bold">Призма</th>
                                    </>
                                )}
                                {(prescription.type === 'contacts' || prescription.type === 'ortho-k') && (
                                    <>
                                        <th className="py-2 px-2 border-r border-black font-bold">BC</th>
                                        <th className="py-2 px-2 border-r border-black font-bold">DIA</th>
                                    </>
                                )}
                                <th className="py-2 px-2 font-bold">Острота (Visus)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-gray-300">
                                <td className="py-3 px-2 border-r border-black font-bold">OD (Правый)</td>
                                <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.odSph) || '—'}</td>
                                <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.odCyl) || '—'}</td>
                                <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.odAx, false) ? `${Math.round(prescription.odAx!)}°` : '—'}</td>
                                <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.odAdd) || '—'}</td>
                                {prescription.type !== 'contacts' && prescription.type !== 'ortho-k' && (
                                    <>
                                        <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.odPd, false) || '—'}</td>
                                        <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.odPdNear, false) || '—'}</td>
                                        <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.odPrism, false) || '—'}</td>
                                    </>
                                )}
                                {(prescription.type === 'contacts' || prescription.type === 'ortho-k') && (
                                    <>
                                        <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.odBc, false) || '—'}</td>
                                        <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.odDia, false) || '—'}</td>
                                    </>
                                )}
                                <td className="py-3 px-2 font-mono">{fmt(prescription.visualAcuityODAfter, false) || '—'}</td>
                            </tr>
                            <tr>
                                <td className="py-3 px-2 border-r border-black font-bold">OS (Левый)</td>
                                <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.osSph) || '—'}</td>
                                <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.osCyl) || '—'}</td>
                                <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.osAx, false) ? `${Math.round(prescription.osAx!)}°` : '—'}</td>
                                <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.osAdd) || '—'}</td>
                                {prescription.type !== 'contacts' && prescription.type !== 'ortho-k' && (
                                    <>
                                        <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.osPd, false) || '—'}</td>
                                        <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.osPdNear, false) || '—'}</td>
                                        <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.osPrism, false) || '—'}</td>
                                    </>
                                )}
                                {(prescription.type === 'contacts' || prescription.type === 'ortho-k') && (
                                    <>
                                        <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.osBc, false) || '—'}</td>
                                        <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.osDia, false) || '—'}</td>
                                    </>
                                )}
                                <td className="py-3 px-2 font-mono">{fmt(prescription.visualAcuityOSAfter, false) || '—'}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {prescription.notes && (
                    <div className="mt-6 avoid-break">
                        <h2 className="text-lg font-bold border-b border-gray-200 pb-2 mb-4">Примечание / Рекомендации</h2>
                        <p className="whitespace-pre-wrap">{prescription.notes}</p>
                    </div>
                )}
            </div>

            {/* Footer Signatures */}
            <div className="mt-16 pt-8 border-t border-gray-300 grid grid-cols-2 gap-8 text-sm avoid-break">
                <div>
                    <p className="mb-8 font-medium">Подпись врача ({doctorName}):</p>
                    <div className="border-b border-black w-64"></div>
                </div>
                <div>
                    <p className="mb-8 font-medium">Подпись пациента (с рецептом ознакомлен):</p>
                    <div className="border-b border-black w-64"></div>
                </div>
            </div>

            {/* Print Auto-Dialog */}
            <script dangerouslySetInnerHTML={{ __html: 'window.onload = function() { window.print(); }' }} />
        </div>
    );
}
