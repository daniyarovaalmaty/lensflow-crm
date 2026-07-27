export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { notFound } from 'next/navigation';
import prisma from '@/lib/db/prisma';
import { auth } from '@/auth';
import { PrimaryExamData } from '@/components/consultation/PrimaryExamForm';

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

const fmt = (v: any, plus = true) => {
    if (v == null || v === '' || v === '—') return '—';
    const num = typeof v === 'string' ? parseFloat(v) : v;
    if (isNaN(num)) return String(v);
    return (plus && num > 0 ? '+' : '') + num.toFixed(2);
};

const hasTableData = (obj: any): boolean => {
    if (!obj || typeof obj !== 'object') return false;
    return Object.values(obj).some(val => {
        if (val == null) return false;
        if (typeof val === 'number') return true;
        if (typeof val === 'boolean') return val;
        if (typeof val === 'string') return val.trim() !== '' && val.trim() !== '—';
        return false;
    });
};

export default async function FullPatientMedicalCardPrintPage({ params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user) return notFound();

    const patient = await prisma.patient.findUnique({
        where: { id: params.id },
        include: {
            organization: true,
            consultations: {
                include: { doctor: true },
                orderBy: { visitDate: 'desc' }
            },
            prescriptions: {
                include: { doctor: true },
                orderBy: { prescribedAt: 'desc' }
            }
        }
    });

    if (!patient) return notFound();

    const org = patient.organization;
    const profile = session.user.profile || {};
    
    const clinicName = org?.name || profile.opticName || profile.clinic || 'Бала Vision';
    const clinicAddress = cleanClinicAddress(org?.actualAddress || org?.address);
    const clinicBin = org?.inn ? `БИН: ${org.inn}` : '';

    const formattedBirthDate = patient.birthDate 
        ? `${new Date(patient.birthDate).toLocaleDateString('ru-RU')} ${calculateAge(patient.birthDate)}` 
        : '—';

    const latestConsultation = patient.consultations[0];
    const latestDoctorName = latestConsultation?.doctor?.fullName || profile.fullName || 'Врач-офтальмолог';

    const nowFormatted = new Date().toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

    const metadata = ((patient as any).metadata as any) || {};
    const examFromConsults = patient.consultations.find((c: any) => c.primaryExamDetails)?.primaryExamDetails;
    const rawSavedExam = metadata.primaryExam || examFromConsults || (latestConsultation as any)?.primaryExamDetails || {};
    const rx = patient.prescriptions[0];

    const DEFAULT_BIOMICROSCOPY = 'OU- веки и слезные органы без изменений, конъюнктива бледно-розовая, склера - белая, роговица - прозрачная, блестящая, передняя камера - средней глубины, равномерная, влага ПК прозрачная, радужка - структурна, зрачок - правильной округлой формы, реакция на свет – живая, хрусталик – прозрачный.';

    const savedExam: PrimaryExamData = {
        complaints: rawSavedExam.complaints 
            || (patient as any)?.complaints 
            || (Array.isArray((patient as any)?.complaints) ? (patient as any).complaints.join(', ') : '')
            || latestConsultation?.notes
            || '',
        anamnesisDisease: rawSavedExam.anamnesisDisease 
            || (patient as any)?.anamnesisDisease 
            || (Array.isArray((patient as any)?.anamnesisDisease) ? (patient as any).anamnesisDisease.join(', ') : '')
            || '',
        anamnesisLife: rawSavedExam.anamnesisLife || {},
        lastCorrection: rawSavedExam.lastCorrection || {},
        refraction: rawSavedExam.refraction || {},
        cycloplegia: rawSavedExam.cycloplegia || {},
        keratometry: rawSavedExam.keratometry || (latestConsultation?.k1OD || latestConsultation?.k1OS ? {
            odK1: latestConsultation.k1OD ? String(latestConsultation.k1OD) : '',
            odK2: latestConsultation.k2OD ? String(latestConsultation.k2OD) : '',
            osK1: latestConsultation.k1OS ? String(latestConsultation.k1OS) : '',
            osK2: latestConsultation.k2OS ? String(latestConsultation.k2OS) : '',
        } : {}),
        visUncorrected: rawSavedExam.visUncorrected || (latestConsultation?.visualAcuityOD || latestConsultation?.visualAcuityOS ? {
            odDistance: latestConsultation.visualAcuityOD ? String(latestConsultation.visualAcuityOD) : '',
            osDistance: latestConsultation.visualAcuityOS ? String(latestConsultation.visualAcuityOS) : '',
        } : {}),
        visCorrected: rawSavedExam.visCorrected || {},
        eccentricity: rawSavedExam.eccentricity || (latestConsultation?.eccentricityOD || latestConsultation?.eccentricityOS ? {
            odHoriz: latestConsultation.eccentricityOD ? String(latestConsultation.eccentricityOD) : '',
            osHoriz: latestConsultation.eccentricityOS ? String(latestConsultation.eccentricityOS) : '',
        } : {}),
        pzo: rawSavedExam.pzo || {},
        biomicroscopy: typeof rawSavedExam.biomicroscopy === 'string' && rawSavedExam.biomicroscopy.trim()
            ? rawSavedExam.biomicroscopy
            : ((latestConsultation as any)?.biomicroscopy || DEFAULT_BIOMICROSCOPY),
        diagnosis: rawSavedExam.diagnosis || latestConsultation?.diagnosis || '',
        recommendations: rawSavedExam.recommendations || latestConsultation?.treatment || ''
    };

    const complaints = savedExam.complaints;
    const anamnesisDisease = savedExam.anamnesisDisease;
    const biomicroscopyText = savedExam.biomicroscopy;
    const diagnosis = savedExam.diagnosis;
    const recommendations = savedExam.recommendations;

    const visCorr = savedExam.visCorrected;
    const lastCorr = savedExam.lastCorrection;
    const hasRxData = rx || visCorr?.odSph || visCorr?.osSph || lastCorr?.odGlasses || lastCorr?.osGlasses;

    const hasAnamnesisLife = savedExam?.anamnesisLife && (
        savedExam.anamnesisLife.allergyChecked || 
        savedExam.anamnesisLife.heredityChecked || 
        savedExam.anamnesisLife.medicationChecked || 
        savedExam.anamnesisLife.dispensaryChecked || 
        savedExam.anamnesisLife.surgeryChecked
    );

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
                    <h1 className="text-xl font-bold tracking-wide text-blue-950 uppercase leading-none font-sans">ПЕРВИЧНЫЙ ОСМОТР ВРАЧА-ОФТАЛЬМОЛОГА</h1>
                    <p className="text-blue-600 font-semibold text-sm mt-1 font-sans">Медицинский протокол обследования глаз | {clinicName}</p>
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
                    {patient.phone && (
                        <div>
                            <span className="font-medium text-slate-500 uppercase text-[9.5px] block">Телефон:</span> 
                            <strong className="text-xs text-slate-900 font-semibold">{patient.phone}</strong>
                        </div>
                    )}
                    {patient.notes && (
                        <div className="col-span-2 mt-1 bg-amber-50/80 p-2.5 rounded-xl border border-amber-200 text-xs">
                            <strong className="text-amber-900 uppercase text-[9.5px] block">Особые заметки:</strong> 
                            <p className="text-slate-800 font-medium mt-0.5">{patient.notes}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Первичный осмотр врача-офтальмолога (ВСЕ 14 РАЗДЕЛОВ) */}
            <div className="mb-6 border border-slate-200 rounded-2xl p-4 bg-white text-xs text-slate-800 space-y-3 font-sans">
                <div className="border-b border-slate-200 pb-2">
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide font-sans">ПЕРВИЧНЫЙ ОСМОТР ВРАЧА-ОФТАЛЬМОЛОГА</h2>
                </div>

                {complaints && (
                    <div>
                        <span className="font-semibold text-slate-500 uppercase text-[10px] block mb-1">1. Жалобы:</span>
                        <p className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-xs leading-relaxed font-medium">{complaints}</p>
                    </div>
                )}

                {anamnesisDisease && (
                    <div>
                        <span className="font-semibold text-slate-500 uppercase text-[10px] block mb-1">2. Анамнез заболевания (Anamnesis morbi):</span>
                        <p className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-xs leading-relaxed font-medium">{anamnesisDisease}</p>
                    </div>
                )}

                {hasAnamnesisLife && (
                    <div>
                        <span className="font-semibold text-slate-500 uppercase text-[10px] block mb-1">3. Анамнез жизни:</span>
                        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-xs font-medium">
                            <div><strong>Аллергоанамнез:</strong> {savedExam?.anamnesisLife?.allergyChecked ? `отягощен (${savedExam.anamnesisLife.allergyText || '—'})` : 'не отягощен'}</div>
                            <div><strong>Наследственность:</strong> {savedExam?.anamnesisLife?.heredityChecked ? `отягощена (${savedExam.anamnesisLife.heredityText || '—'})` : 'не отягощена'}</div>
                            <div><strong>Прием медикаментов:</strong> {savedExam?.anamnesisLife?.medicationChecked ? `принимает (${savedExam.anamnesisLife.medicationText || '—'})` : 'не принимает'}</div>
                            <div><strong>Диспансерный учет:</strong> {savedExam?.anamnesisLife?.dispensaryChecked ? `да (${savedExam.anamnesisLife.dispensaryText || '—'})` : 'нет'}</div>
                            <div className="col-span-2"><strong>Операции:</strong> {savedExam?.anamnesisLife?.surgeryChecked ? `да (${savedExam.anamnesisLife.surgeryText || '—'})` : 'не было'}</div>
                        </div>
                    </div>
                )}

                {/* 4. Последняя коррекция */}
                {hasTableData(savedExam?.lastCorrection) && (
                    <div>
                        <span className="font-semibold text-slate-500 uppercase text-[10px] block mb-1">4. Последняя коррекция:</span>
                        <div className="rounded-xl overflow-hidden border border-slate-200">
                            <table className="w-full text-center border-collapse print-table text-xs">
                                <thead>
                                    <tr className="bg-slate-100/90 font-bold text-slate-800">
                                        <th className="border-r border-b border-slate-200 p-1.5">Глаз</th>
                                        <th className="border-r border-b border-slate-200 p-1.5">Очки для дали</th>
                                        <th className="border-r border-b border-slate-200 p-1.5">Контактные линзы</th>
                                        <th className="border-b border-slate-200 p-1.5">Очки для близи</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="border-r border-b border-slate-200 p-1.5 font-bold text-blue-700">OD</td>
                                        <td className="border-r border-b border-slate-200 p-1.5">{savedExam?.lastCorrection?.odGlasses || '—'}</td>
                                        <td className="border-r border-b border-slate-200 p-1.5">{savedExam?.lastCorrection?.odContacts || '—'}</td>
                                        <td className="border-b border-slate-200 p-1.5">{savedExam?.lastCorrection?.odNear || '—'}</td>
                                    </tr>
                                    <tr>
                                        <td className="border-r border-slate-200 p-1.5 font-bold text-teal-700">OS</td>
                                        <td className="border-r border-slate-200 p-1.5">{savedExam?.lastCorrection?.osGlasses || '—'}</td>
                                        <td className="border-r border-slate-200 p-1.5">{savedExam?.lastCorrection?.osContacts || '—'}</td>
                                        <td className="p-1.5">{savedExam?.lastCorrection?.osNear || '—'}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 5. Рефракция и Циклоплегия */}
                {(hasTableData(savedExam?.refraction) || hasTableData(savedExam?.cycloplegia)) && (
                    <div className="grid grid-cols-2 gap-3">
                        {hasTableData(savedExam?.refraction) && (
                            <div>
                                <span className="font-semibold text-slate-500 uppercase text-[10px] block mb-1">Рефракция:</span>
                                <div className="rounded-xl overflow-hidden border border-slate-200">
                                    <table className="w-full text-center border-collapse print-table text-xs">
                                        <thead>
                                            <tr className="bg-slate-100/90 font-bold text-slate-800">
                                                <th className="border-r border-b border-slate-200 p-1">Глаз</th>
                                                <th className="border-r border-b border-slate-200 p-1">Dsph</th>
                                                <th className="border-r border-b border-slate-200 p-1">Dcyl</th>
                                                <th className="border-b border-slate-200 p-1">Axis</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td className="border-r border-b border-slate-200 p-1 font-bold text-blue-700">OD</td>
                                                <td className="border-r border-b border-slate-200 p-1">{savedExam?.refraction?.odSph || '—'}</td>
                                                <td className="border-r border-b border-slate-200 p-1">{savedExam?.refraction?.odCyl || '—'}</td>
                                                <td className="border-b border-slate-200 p-1">{savedExam?.refraction?.odAx || '—'}</td>
                                            </tr>
                                            <tr>
                                                <td className="border-r border-slate-200 p-1 font-bold text-teal-700">OS</td>
                                                <td className="border-r border-slate-200 p-1">{savedExam?.refraction?.osSph || '—'}</td>
                                                <td className="border-r border-slate-200 p-1">{savedExam?.refraction?.osCyl || '—'}</td>
                                                <td className="p-1">{savedExam?.refraction?.osAx || '—'}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {hasTableData(savedExam?.cycloplegia) && (
                            <div>
                                <span className="font-semibold text-slate-500 uppercase text-[10px] block mb-1">Циклоплегия:</span>
                                <div className="rounded-xl overflow-hidden border border-slate-200">
                                    <table className="w-full text-center border-collapse print-table text-xs">
                                        <thead>
                                            <tr className="bg-slate-100/90 font-bold text-slate-800">
                                                <th className="border-r border-b border-slate-200 p-1">Глаз</th>
                                                <th className="border-r border-b border-slate-200 p-1">Dsph</th>
                                                <th className="border-r border-b border-slate-200 p-1">Dcyl</th>
                                                <th className="border-b border-slate-200 p-1">Axis</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td className="border-r border-b border-slate-200 p-1 font-bold text-blue-700">OD</td>
                                                <td className="border-r border-b border-slate-200 p-1">{savedExam?.cycloplegia?.odSph || '—'}</td>
                                                <td className="border-r border-b border-slate-200 p-1">{savedExam?.cycloplegia?.odCyl || '—'}</td>
                                                <td className="border-b border-slate-200 p-1">{savedExam?.cycloplegia?.odAx || '—'}</td>
                                            </tr>
                                            <tr>
                                                <td className="border-r border-slate-200 p-1 font-bold text-teal-700">OS</td>
                                                <td className="border-r border-slate-200 p-1">{savedExam?.cycloplegia?.osSph || '—'}</td>
                                                <td className="border-r border-slate-200 p-1">{savedExam?.cycloplegia?.osCyl || '—'}</td>
                                                <td className="p-1">{savedExam?.cycloplegia?.osAx || '—'}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 6. Кератометрия */}
                {hasTableData(savedExam?.keratometry) && (
                    <div>
                        <span className="font-semibold text-slate-500 uppercase text-[10px] block mb-1">Кератометрия:</span>
                        <div className="rounded-xl overflow-hidden border border-slate-200">
                            <table className="w-full text-center border-collapse print-table text-xs">
                                <thead>
                                    <tr className="bg-slate-100/90 font-bold text-slate-800">
                                        <th className="border-r border-b border-slate-200 p-1" colSpan={3}>OD (Правый глаз)</th>
                                        <th className="border-b border-slate-200 p-1" colSpan={3}>OS (Левый глаз)</th>
                                    </tr>
                                    <tr className="bg-slate-50 font-semibold text-[11px]">
                                        <th className="border-r border-b border-slate-200 p-1">K1</th>
                                        <th className="border-r border-b border-slate-200 p-1">K2</th>
                                        <th className="border-r border-b border-slate-200 p-1">K1-K2</th>
                                        <th className="border-r border-b border-slate-200 p-1">K1</th>
                                        <th className="border-r border-b border-slate-200 p-1">K2</th>
                                        <th className="border-b border-slate-200 p-1">K1-K2</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="border-r border-slate-200 p-1">{savedExam?.keratometry?.odK1 || '—'}</td>
                                        <td className="border-r border-slate-200 p-1">{savedExam?.keratometry?.odK2 || '—'}</td>
                                        <td className="border-r border-slate-200 p-1 font-bold text-blue-700">
                                            {savedExam?.keratometry?.odK1 && savedExam?.keratometry?.odK2
                                                ? (parseFloat(savedExam.keratometry.odK2) - parseFloat(savedExam.keratometry.odK1)).toFixed(2)
                                                : '—'}
                                        </td>
                                        <td className="border-r border-slate-200 p-1">{savedExam?.keratometry?.osK1 || '—'}</td>
                                        <td className="border-r border-slate-200 p-1">{savedExam?.keratometry?.osK2 || '—'}</td>
                                        <td className="p-1 font-bold text-teal-700">
                                            {savedExam?.keratometry?.osK1 && savedExam?.keratometry?.osK2
                                                ? (parseFloat(savedExam.keratometry.osK2) - parseFloat(savedExam.keratometry.osK1)).toFixed(2)
                                                : '—'}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 7. Vis без коррекции & Vis с коррекцией */}
                {(hasTableData(savedExam?.visUncorrected) || hasTableData(savedExam?.visCorrected) || latestConsultation?.visualAcuityOD || latestConsultation?.visualAcuityOS) && (
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <span className="font-semibold text-slate-500 uppercase text-[10px] block mb-1">Vis без коррекции:</span>
                            <div className="rounded-xl overflow-hidden border border-slate-200">
                                <table className="w-full text-center border-collapse print-table text-xs">
                                    <thead>
                                        <tr className="bg-slate-100/90 font-bold text-slate-800">
                                            <th className="border-r border-b border-slate-200 p-1">Глаз</th>
                                            <th className="border-r border-b border-slate-200 p-1">Вдаль</th>
                                            <th className="border-r border-b border-slate-200 p-1">Вблизи</th>
                                            <th className="border-b border-slate-200 p-1">Домин.</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="border-r border-b border-slate-200 p-1 font-bold text-blue-700">OD</td>
                                            <td className="border-r border-b border-slate-200 p-1 font-bold">{savedExam?.visUncorrected?.odDistance || latestConsultation?.visualAcuityOD || '—'}</td>
                                            <td className="border-r border-b border-slate-200 p-1">{savedExam?.visUncorrected?.odNear || '—'}</td>
                                            <td className="border-b border-slate-200 p-1">{savedExam?.visUncorrected?.dominantEye === 'OD' ? '👁️' : '—'}</td>
                                        </tr>
                                        <tr>
                                            <td className="border-r border-slate-200 p-1 font-bold text-teal-700">OS</td>
                                            <td className="border-r border-slate-200 p-1 font-bold">{savedExam?.visUncorrected?.osDistance || latestConsultation?.visualAcuityOS || '—'}</td>
                                            <td className="border-r border-slate-200 p-1">{savedExam?.visUncorrected?.osNear || '—'}</td>
                                            <td className="p-1">{savedExam?.visUncorrected?.dominantEye === 'OS' ? '👁️' : '—'}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div>
                            <span className="font-semibold text-slate-500 uppercase text-[10px] block mb-1">Vis с коррекцией:</span>
                            <div className="rounded-xl overflow-hidden border border-slate-200">
                                <table className="w-full text-center border-collapse print-table text-xs">
                                    <thead>
                                        <tr className="bg-slate-100/90 font-bold text-slate-800">
                                            <th className="border-r border-b border-slate-200 p-1">Глаз</th>
                                            <th className="border-r border-b border-slate-200 p-1">Dsph</th>
                                            <th className="border-r border-b border-slate-200 p-1">Dcyl</th>
                                            <th className="border-r border-b border-slate-200 p-1">Axis</th>
                                            <th className="border-r border-b border-slate-200 p-1">Visus</th>
                                            <th className="border-b border-slate-200 p-1">Адд</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="border-r border-b border-slate-200 p-1 font-bold text-blue-700">OD</td>
                                            <td className="border-r border-b border-slate-200 p-1">{savedExam?.visCorrected?.odSph || '—'}</td>
                                            <td className="border-r border-b border-slate-200 p-1">{savedExam?.visCorrected?.odCyl || '—'}</td>
                                            <td className="border-r border-b border-slate-200 p-1">{savedExam?.visCorrected?.odAx || '—'}</td>
                                            <td className="border-r border-b border-slate-200 p-1 font-bold">{savedExam?.visCorrected?.odVisus || '—'}</td>
                                            <td className="border-b border-slate-200 p-1">{savedExam?.visCorrected?.odAdd || '—'}</td>
                                        </tr>
                                        <tr>
                                            <td className="border-r border-slate-200 p-1 font-bold text-teal-700">OS</td>
                                            <td className="border-r border-slate-200 p-1">{savedExam?.visCorrected?.osSph || '—'}</td>
                                            <td className="border-r border-slate-200 p-1">{savedExam?.visCorrected?.osCyl || '—'}</td>
                                            <td className="border-r border-slate-200 p-1">{savedExam?.visCorrected?.osAx || '—'}</td>
                                            <td className="border-r border-slate-200 p-1 font-bold">{savedExam?.visCorrected?.osVisus || '—'}</td>
                                            <td className="p-1">{savedExam?.visCorrected?.osAdd || '—'}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* 8. Эксцентриситет & 9. ПЗО */}
                {(hasTableData(savedExam?.eccentricity) || hasTableData(savedExam?.pzo)) && (
                    <div className="grid grid-cols-2 gap-3">
                        {hasTableData(savedExam?.eccentricity) && (
                            <div>
                                <span className="font-semibold text-slate-500 uppercase text-[10px] block mb-1">Эксцентриситет (Ex):</span>
                                <div className="rounded-xl overflow-hidden border border-slate-200">
                                    <table className="w-full text-center border-collapse print-table text-xs">
                                        <thead>
                                            <tr className="bg-slate-100/90 font-bold text-slate-800">
                                                <th className="border-r border-b border-slate-200 p-1">Глаз</th>
                                                <th className="border-r border-b border-slate-200 p-1">Горизонтальный</th>
                                                <th className="border-b border-slate-200 p-1">Вертикальный</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td className="border-r border-b border-slate-200 p-1 font-bold text-blue-700">OD</td>
                                                <td className="border-r border-b border-slate-200 p-1">{savedExam?.eccentricity?.odHoriz || '—'}</td>
                                                <td className="border-b border-slate-200 p-1">{savedExam?.eccentricity?.odVert || '—'}</td>
                                            </tr>
                                            <tr>
                                                <td className="border-r border-slate-200 p-1 font-bold text-teal-700">OS</td>
                                                <td className="border-r border-slate-200 p-1">{savedExam?.eccentricity?.osHoriz || '—'}</td>
                                                <td className="p-1">{savedExam?.eccentricity?.osVert || '—'}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {hasTableData(savedExam?.pzo) && (
                            <div>
                                <span className="font-semibold text-slate-500 uppercase text-[10px] block mb-1">ПЗО (Длина глаза мм):</span>
                                <div className="rounded-xl overflow-hidden border border-slate-200">
                                    <table className="w-full text-center border-collapse print-table text-xs">
                                        <thead>
                                            <tr className="bg-slate-100/90 font-bold text-slate-800">
                                                <th className="border-r border-b border-slate-200 p-1">Глаз</th>
                                                <th className="border-b border-slate-200 p-1">Значение ПЗО (мм)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td className="border-r border-b border-slate-200 p-1 font-bold text-blue-700">OD</td>
                                                <td className="border-b border-slate-200 p-1 font-semibold">{savedExam?.pzo?.od ? `${savedExam.pzo.od} мм` : '—'}</td>
                                            </tr>
                                            <tr>
                                                <td className="border-r border-slate-200 p-1 font-bold text-teal-700">OS</td>
                                                <td className="p-1 font-semibold">{savedExam?.pzo?.os ? `${savedExam.pzo.os} мм` : '—'}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {biomicroscopyText && (
                    <div>
                        <span className="font-semibold text-slate-500 uppercase text-[10px] block mb-1">Биомикроскопия (Передний отрезок):</span>
                        <p className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 leading-relaxed text-xs font-medium">{biomicroscopyText}</p>
                    </div>
                )}

                {diagnosis && (
                    <div className="p-3 bg-red-50/90 border border-red-200/80 rounded-xl">
                        <span className="text-red-900 uppercase text-[10px] font-bold block">Окончательный диагноз:</span>
                        <p className="text-red-950 font-bold text-xs mt-0.5">{diagnosis}</p>
                    </div>
                )}

                {recommendations && (
                    <div className="p-3 bg-emerald-50/90 border border-emerald-200/80 rounded-xl">
                        <span className="text-emerald-900 uppercase text-[10px] font-bold block">Назначения и рекомендации:</span>
                        <p className="text-emerald-950 font-medium text-xs mt-0.5 leading-relaxed">{recommendations}</p>
                    </div>
                )}
            </div>

            {/* РЕЦЕПТ / КОРРЕКЦИЯ ЗРЕНИЯ */}
            {hasRxData && (
                <div className="mb-6 font-sans">
                    <div className="flex items-center gap-1.5 mb-2 pb-1 border-b border-slate-200/80">
                        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide font-sans">Рецепт на коррекцию зрения</h2>
                    </div>
                    <div className="rounded-xl overflow-hidden border border-slate-200">
                        <table className="w-full text-center border-collapse print-table text-xs font-sans">
                            <thead>
                                <tr className="bg-slate-100/90 font-bold text-slate-800">
                                    <th className="border-r border-b border-slate-200 p-1.5 uppercase">Глаз</th>
                                    <th className="border-r border-b border-slate-200 p-1.5 uppercase">Sph (Сфера)</th>
                                    <th className="border-r border-b border-slate-200 p-1.5 uppercase">Cyl (Цилиндр)</th>
                                    <th className="border-r border-b border-slate-200 p-1.5 uppercase">Ax (Ось)</th>
                                    <th className="border-r border-b border-slate-200 p-1.5 uppercase">Add (Аддидация)</th>
                                    <th className="border-b border-slate-200 p-1.5 uppercase">PD (РЦ)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="border-r border-b border-slate-200 p-1.5 font-bold text-blue-700">OD (Правый)</td>
                                    <td className="border-r border-b border-slate-200 p-1.5 font-semibold">{fmt(rx?.odSph || visCorr?.odSph)}</td>
                                    <td className="border-r border-b border-slate-200 p-1.5 font-semibold">{fmt(rx?.odCyl || visCorr?.odCyl)}</td>
                                    <td className="border-r border-b border-slate-200 p-1.5 font-semibold">{rx?.odAx || visCorr?.odAx || '—'}</td>
                                    <td className="border-r border-b border-slate-200 p-1.5 font-semibold">{fmt(rx?.odAdd || visCorr?.odAdd)}</td>
                                    <td className="border-b border-slate-200 p-1.5 font-semibold">{fmt(rx?.odPd, false)}</td>
                                </tr>
                                <tr>
                                    <td className="border-r border-slate-200 p-1.5 font-bold text-teal-700">OS (Левый)</td>
                                    <td className="border-r border-slate-200 p-1.5 font-semibold">{fmt(rx?.osSph || visCorr?.osSph)}</td>
                                    <td className="border-r border-slate-200 p-1.5 font-semibold">{fmt(rx?.osCyl || visCorr?.osCyl)}</td>
                                    <td className="border-r border-slate-200 p-1.5 font-semibold">{rx?.osAx || visCorr?.osAx || '—'}</td>
                                    <td className="border-r border-slate-200 p-1.5 font-semibold">{fmt(rx?.osAdd || visCorr?.osAdd)}</td>
                                    <td className="p-1.5 font-semibold">{fmt(rx?.osPd, false)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

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
                                {latestDoctorName}
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
