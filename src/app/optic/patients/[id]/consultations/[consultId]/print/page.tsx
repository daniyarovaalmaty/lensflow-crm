export const dynamic = 'force-dynamic';
import { notFound } from 'next/navigation';
import prisma from '@/lib/db/prisma';
import { auth } from '@/auth';

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

export default async function ConsultationPrintPage({ params }: { params: { id: string, consultId: string } }) {
    const session = await auth();
    if (!session?.user) return notFound();

    const patient = await prisma.patient.findUnique({
        where: { id: params.id },
        include: { organization: true }
    });

    const consultation = await prisma.consultation.findUnique({
        where: { id: params.consultId },
        include: { doctor: true }
    });

    if (!patient || !consultation) return notFound();

    const org = patient.organization;
    const profile = session.user.profile || {};

    const clinicName = org?.name || profile.opticName || profile.clinic || 'Бала Vision';
    let clinicAddress = org?.actualAddress || org?.address || 'г. Алматы, Райымбека 217';
    if (clinicAddress.startsWith('ктобе')) {
        clinicAddress = 'г. Актобе' + clinicAddress.slice(5);
    }
    const clinicBin = org?.inn ? `БИН: ${org.inn}` : '';
    const doctorName = consultation.doctor?.fullName || profile.fullName || 'Врач не указан';

    const formattedBirthDate = patient.birthDate 
        ? `${new Date(patient.birthDate).toLocaleDateString('ru-RU')} ${calculateAge(patient.birthDate)}` 
        : '—';

    const nowFormatted = new Date().toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

    const fmt = (val: number | null | undefined) => (val == null ? '—' : String(val));

    return (
        <div className="bg-white p-4 sm:p-8 max-w-4xl mx-auto min-h-screen text-slate-900 print:p-0 print:m-0 print:max-w-none font-sans">
            <style>{`
                @media print {
                    @page { margin: 1.2cm; size: A4; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .avoid-break { page-break-inside: avoid; break-inside: avoid; }
                }
            `}</style>

            {/* Header: Left Blue Vertical Line, No Circular Icon */}
            <div className="flex justify-between items-start border-l-[5px] border-blue-600 pl-4 py-2 mb-6 bg-slate-50/70 p-4 rounded-r-xl border-y border-r border-slate-200">
                <div>
                    <h1 className="text-xl font-bold uppercase tracking-wider text-blue-900 leading-none">
                        МЕДИЦИНСКАЯ ВЫПИСКА ПРИЁМА
                    </h1>
                    <p className="text-sm font-semibold text-blue-600 mt-1">{clinicName}</p>
                </div>
                <div className="text-right text-xs text-slate-600 space-y-0.5 max-w-[60%]">
                    <p className="font-medium text-slate-800 leading-snug">
                        📍 {clinicAddress}
                    </p>
                    {clinicBin && <p className="font-mono text-slate-600">{clinicBin}</p>}
                    {org?.phone && <p>Тел: {org.phone}</p>}
                </div>
            </div>

            {/* Patient Block */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2 mb-3">
                    <span className="text-blue-600 text-sm">👤</span>
                    <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">ПАЦИЕНТ</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-semibold">ФИО</p>
                        <p className="font-bold text-slate-900 text-base">{patient.name}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-semibold">ДАТА РОЖДЕНИЯ</p>
                        <p className="font-semibold text-slate-800">{formattedBirthDate}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-semibold">ИИН</p>
                        <p className="font-mono text-slate-800">{patient.iin || '—'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-semibold">ДАТА ПРИЁМА</p>
                        <p className="font-semibold text-blue-900">
                            {new Date(consultation.visitDate).toLocaleDateString('ru-RU')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Examination Metrics */}
            <div className="border border-slate-200 rounded-xl p-4 mb-6 avoid-break bg-white shadow-xs">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-2 mb-3">
                    ОФТАЛЬМОЛОГИЧЕСКОЕ ОБСЛЕДОВАНИЕ
                </h3>
                <table className="w-full text-xs text-left border-collapse mb-4">
                    <thead>
                        <tr className="bg-slate-50 text-slate-600 border-y border-slate-200">
                            <th className="py-2 px-3 font-bold">Показатель</th>
                            <th className="py-2 px-3 font-bold text-center">OD (Правый глаз)</th>
                            <th className="py-2 px-3 font-bold text-center">OS (Левый глаз)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                        <tr>
                            <td className="py-2 px-3 font-sans font-medium text-slate-700">Острота зрения (Visus)</td>
                            <td className="py-2 px-3 text-center">{fmt(consultation.visualAcuityOD)}</td>
                            <td className="py-2 px-3 text-center">{fmt(consultation.visualAcuityOS)}</td>
                        </tr>
                        <tr>
                            <td className="py-2 px-3 font-sans font-medium text-slate-700">ВГД (мм рт. ст.)</td>
                            <td className="py-2 px-3 text-center">{fmt(consultation.intraocularPressureOD)}</td>
                            <td className="py-2 px-3 text-center">{fmt(consultation.intraocularPressureOS)}</td>
                        </tr>
                        <tr>
                            <td className="py-2 px-3 font-sans font-medium text-slate-700">Кератометрия Flat K / Steep K</td>
                            <td className="py-2 px-3 text-center">{fmt(consultation.k1OD)} / {fmt(consultation.k2OD)} D</td>
                            <td className="py-2 px-3 text-center">{fmt(consultation.k1OS)} / {fmt(consultation.k2OS)} D</td>
                        </tr>
                        <tr>
                            <td className="py-2 px-3 font-sans font-medium text-slate-700">Эксцентриситет (Ex)</td>
                            <td className="py-2 px-3 text-center">{fmt(consultation.eccentricityOD)}</td>
                            <td className="py-2 px-3 text-center">{fmt(consultation.eccentricityOS)}</td>
                        </tr>
                    </tbody>
                </table>

                {consultation.biomicroscopy && (
                    <div className="mb-3">
                        <p className="text-xs font-bold text-slate-900 uppercase">Биомикроскопия / Передний отрезок:</p>
                        <p className="text-xs text-slate-800 mt-0.5">{consultation.biomicroscopy}</p>
                    </div>
                )}
                {consultation.diagnosis && (
                    <div className="mb-3">
                        <p className="text-xs font-bold text-slate-900 uppercase">Диагноз:</p>
                        <p className="text-sm font-semibold text-blue-950 mt-0.5">{consultation.diagnosis}</p>
                    </div>
                )}
                {consultation.treatment && (
                    <div>
                        <p className="text-xs font-bold text-slate-900 uppercase">Назначенное лечение / Рекомендации:</p>
                        <p className="text-xs text-slate-800 mt-0.5">{consultation.treatment}</p>
                    </div>
                )}
            </div>

            {/* Document Timestamp & Signature Block */}
            <div className="mt-8 pt-6 border-t-2 border-slate-200 flex justify-between items-end avoid-break">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
                    <p className="text-slate-500 uppercase font-semibold text-[10px]">ДОКУМЕНТ СФОРМИРОВАН</p>
                    <p className="font-bold text-slate-900 text-sm mt-0.5">{nowFormatted}</p>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium">Сформировано в медицинской системе LensFlow CRM</p>
                </div>

                <div className="text-right">
                    <p className="text-xs text-slate-500 uppercase font-semibold mb-6">ВРАЧ (ФИО, ПОДПИСЬ)</p>
                    <div className="flex items-center gap-3">
                        <div className="w-48 border-b-2 border-slate-400"></div>
                        <span className="font-bold text-sm text-slate-900">/ {doctorName}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
