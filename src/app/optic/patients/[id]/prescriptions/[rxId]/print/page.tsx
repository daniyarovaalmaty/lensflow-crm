export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { notFound } from 'next/navigation';
import prisma from '@/lib/db/prisma';
import { auth } from '@/auth';

function cleanClinicAddress(rawAddress: string | null | undefined): string {
    if (!rawAddress) return 'г. Алматы, Райымбека 217';
    const addr = rawAddress.trim();
    if (addr.toLowerCase().includes('актобе') || addr.toLowerCase().includes('ктобе') || addr.toLowerCase().includes('тайбеков')) {
        return 'г. Актобе, ул. Е. Тайбекова, дом 10А';
    }
    return addr;
}

function calculateAge(birthDateStr: string | Date | null | undefined): string {
    if (!birthDateStr) return '';
    const birth = new Date(birthDateStr);
    if (isNaN(birth.getTime())) return '';
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    if (age < 0) return '';
    
    const lastDigit = age % 10;
    const lastTwo = age % 100;
    let word = 'лет';
    if (lastTwo >= 11 && lastTwo <= 19) {
        word = 'лет';
    } else if (lastDigit === 1) {
        word = 'год';
    } else if (lastDigit >= 2 && lastDigit <= 4) {
        word = 'года';
    }
    return `(${age} ${word})`;
}

export default async function PrescriptionPrintPage({ params }: { params: { id: string, rxId: string } }) {
    const session = await auth();
    if (!session?.user) return notFound();

    const patient = await prisma.patient.findUnique({
        where: { id: params.id },
        include: { organization: true }
    });

    const prescription = await prisma.prescription.findUnique({
        where: { id: params.rxId },
        include: { doctor: true }
    });

    if (!patient || !prescription) return notFound();

    const fmt = (val: number | string | null | undefined, plus = true) => {
        if (val == null || val === '' || val === '—') return '—';
        const num = typeof val === 'string' ? parseFloat(val) : val;
        if (isNaN(num)) return String(val);
        return (plus && num > 0 ? '+' : '') + num.toFixed(2);
    };

    const typeLabels: Record<string, string> = {
        glasses: 'ОЧКИ', contacts: 'КОНТАКТНЫЕ ЛИНЗЫ', 'ortho-k': 'ОРТО-К ЛИНЗЫ'
    };

    const org = patient.organization;
    const profile = session.user.profile || {};

    const clinicName = org?.name || profile.opticName || profile.clinic || 'Бала Vision';
    const clinicAddress = cleanClinicAddress(org?.actualAddress || org?.address);
    const clinicBin = org?.inn ? `БИН: ${org.inn}` : '';
    const doctorName = prescription.doctor?.fullName || profile.fullName || 'Врач-офтальмолог';

    const formattedBirthDate = patient.birthDate 
        ? `${new Date(patient.birthDate).toLocaleDateString('ru-RU')} ${calculateAge(patient.birthDate)}` 
        : '—';

    const nowFormatted = new Date().toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

    return (
        <div className="bg-white p-4 sm:p-8 max-w-4xl mx-auto min-h-screen text-slate-900 print:p-0 print:m-0 print:max-w-none font-sans">
            <style>{`
                @media print {
                    @page { margin: 8mm 10mm; size: A4 portrait; }
                    * { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white !important; font-size: 11px !important; line-height: 1.4 !important; color: #0f172a !important; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important; }
                    .print-table th, .print-table td { padding: 4px 8px !important; font-size: 10.5px !important; }
                }
            `}</style>

            {/* Шапка организации (Округлые края) */}
            <div className="bg-slate-50/90 border-l-4 border-blue-600 p-4 sm:p-5 mb-6 rounded-2xl border-y border-r border-slate-200 flex justify-between items-center font-sans">
                <div>
                    <h1 className="text-xl font-bold tracking-wide text-blue-950 uppercase leading-none font-sans">
                        РЕЦЕПТ НА {typeLabels[prescription.type] || 'ОПТИКУ'}
                    </h1>
                    <p className="text-blue-600 font-semibold text-sm mt-1 font-sans">{clinicName}</p>
                </div>
                <div className="text-right text-xs text-slate-600 max-w-[60%] space-y-0.5 font-sans">
                    <p className="font-medium text-slate-800 leading-snug">📍 {clinicAddress}</p>
                    {clinicBin && <p className="font-mono text-slate-600">{clinicBin}</p>}
                </div>
            </div>

            {/* Данные пациента (Паспортная часть - округлые формы) */}
            <div className="mb-6 bg-slate-50/70 rounded-2xl p-4 sm:p-6 border border-slate-200 font-sans">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200/80">
                    <span className="text-blue-600 text-base">👤</span>
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide font-sans">Паспортная часть</h2>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:text-sm font-sans">
                    <div>
                        <span className="font-medium text-slate-500 uppercase text-[9.5px] block">ФИО пациента:</span> 
                        <strong className="text-base text-slate-950 font-bold">{patient.name}</strong>
                    </div>
                    <div>
                        <span className="font-medium text-slate-500 uppercase text-[9.5px] block">Дата рождения (возраст):</span> 
                        <strong className="text-sm text-slate-900 font-bold">{formattedBirthDate}</strong>
                    </div>
                    {patient.city && (
                        <div>
                            <span className="font-medium text-slate-500 uppercase text-[9.5px] block">Город:</span> 
                            <strong className="text-xs text-slate-900 font-semibold">{patient.city}</strong>
                        </div>
                    )}
                    <div>
                        <span className="font-medium text-slate-500 uppercase text-[9.5px] block">Дата выписки рецепта:</span> 
                        <strong className="text-xs text-blue-900 font-bold">
                            {new Date(prescription.prescribedAt).toLocaleDateString('ru-RU')}
                        </strong>
                    </div>
                </div>
            </div>

            {/* Параметры оптической коррекции */}
            <div className="mb-6 font-sans">
                <div className="flex items-center gap-1.5 mb-2 pb-1 border-b border-slate-200/80">
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide font-sans">Параметры оптической коррекции</h2>
                </div>
                <div className="rounded-xl overflow-hidden border border-slate-200">
                    <table className="w-full text-center border-collapse print-table text-xs font-sans">
                        <thead>
                            <tr className="bg-slate-100/90 font-bold text-slate-800">
                                <th className="border-r border-b border-slate-200 p-1.5 uppercase">Глаз</th>
                                <th className="border-r border-b border-slate-200 p-1.5 uppercase">Sph (Сфера)</th>
                                <th className="border-r border-b border-slate-200 p-1.5 uppercase">Cyl (Цилиндр)</th>
                                <th className="border-r border-b border-slate-200 p-1.5 uppercase">Ax (Ось °)</th>
                                <th className="border-r border-b border-slate-200 p-1.5 uppercase">Add (Адд)</th>
                                <th className="border-r border-b border-slate-200 p-1.5 uppercase">DP (РЦ мм)</th>
                                <th className="border-r border-b border-slate-200 p-1.5 uppercase">BC (База)</th>
                                <th className="border-b border-slate-200 p-1.5 uppercase">DIA (Диам.)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="border-r border-b border-slate-200 p-1.5 font-bold text-blue-700">OD (Правый)</td>
                                <td className="border-r border-b border-slate-200 p-1.5 font-semibold">{fmt(prescription.odSph)}</td>
                                <td className="border-r border-b border-slate-200 p-1.5 font-semibold">{fmt(prescription.odCyl)}</td>
                                <td className="border-r border-b border-slate-200 p-1.5 font-semibold">{prescription.odAx ? `${prescription.odAx}°` : '—'}</td>
                                <td className="border-r border-b border-slate-200 p-1.5 font-semibold">{fmt(prescription.odAdd)}</td>
                                <td className="border-r border-b border-slate-200 p-1.5 font-semibold">{fmt(prescription.odPd, false)}</td>
                                <td className="border-r border-b border-slate-200 p-1.5 font-semibold">{fmt(prescription.odBc, false)}</td>
                                <td className="border-b border-slate-200 p-1.5 font-semibold">{fmt(prescription.odDia, false)}</td>
                            </tr>
                            <tr>
                                <td className="border-r border-slate-200 p-1.5 font-bold text-teal-700">OS (Левый)</td>
                                <td className="border-r border-slate-200 p-1.5 font-semibold">{fmt(prescription.osSph)}</td>
                                <td className="border-r border-slate-200 p-1.5 font-semibold">{fmt(prescription.osCyl)}</td>
                                <td className="border-r border-slate-200 p-1.5 font-semibold">{prescription.osAx ? `${prescription.osAx}°` : '—'}</td>
                                <td className="border-r border-slate-200 p-1.5 font-semibold">{fmt(prescription.osAdd)}</td>
                                <td className="border-r border-slate-200 p-1.5 font-semibold">{fmt(prescription.osPd, false)}</td>
                                <td className="border-r border-slate-200 p-1.5 font-semibold">{fmt(prescription.osBc, false)}</td>
                                <td className="p-1.5 font-semibold">{fmt(prescription.osDia, false)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                {prescription.notes && (
                    <div className="mt-3 p-3 bg-slate-50/80 border border-slate-200/80 rounded-xl text-xs">
                        <strong className="text-slate-900 uppercase text-[9.5px] block">Особые примечания:</strong>
                        <p className="text-slate-800 font-medium mt-0.5">{prescription.notes}</p>
                    </div>
                )}
            </div>

            {/* Подписи врача (Лаконичный вид) */}
            <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-end text-xs font-sans">
                <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200">
                    <p className="font-bold text-slate-800 text-[10px]">Сформирован: {nowFormatted}</p>
                    <p className="text-[9px] text-slate-500 font-medium mt-0.5">Медицинская система LensFlow CRM</p>
                </div>
                <div className="text-right font-sans">
                    <div className="flex gap-4 items-end">
                        <div className="text-center min-w-[150px]">
                            <span className="font-semibold text-slate-900 text-xs block pb-0.5 border-b border-slate-300">
                                {doctorName}
                            </span>
                            <span className="text-[8.5px] text-slate-500 uppercase tracking-wider block mt-0.5 font-medium">Врач (ФИО)</span>
                        </div>
                        <div className="text-center w-24">
                            <span className="block pb-0.5 border-b border-slate-300 min-h-[16px]"></span>
                            <span className="text-[8.5px] text-slate-500 uppercase tracking-wider block mt-0.5 font-medium">Подпись</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
