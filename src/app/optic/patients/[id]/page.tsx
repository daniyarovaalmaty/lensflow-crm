'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
    ArrowLeft, User, Phone, Mail, Calendar, FileText, Edit2, Save, X,
    Plus, Eye, Stethoscope, ClipboardList, ChevronDown, ChevronUp, Trash2,
    Activity, Clock, ChevronRight, UploadCloud, Paperclip, Download, Printer, Wand2, LayoutDashboard, MapPin, Globe, Banknote, Search, Minus, ShoppingBag
} from 'lucide-react';
import Link from 'next/link';

// Helper to remove payment-related text (kaspi, ckk, terminals, etc) for doctors
const filterMedicalText = (text: string | null | undefined, userRole?: string) => {
    if (!text) return text;
    if (userRole !== 'doctor') return text; // Only filter for doctors to not hide from managers
    
    return text.split(/[.\n;]/).map(sentence => {
        const lower = sentence.toLowerCase();
        if (
            lower.includes('каспий') || lower.includes('kaspi') || lower.includes('каспи') ||
            lower.includes('терминал') || lower.includes('цкк') || 
            lower.includes('предоплата') || lower.includes('оплата') || 
            lower.includes('оплатить') || lower.includes('чек') ||
            lower.includes('наличными') || lower.includes('нал ')
        ) {
            // Check if it's separated by comma inside a single line
            const commaParts = sentence.split(',');
            const cleanCommaParts = commaParts.filter(p => {
                const lp = p.toLowerCase();
                return !(lp.includes('каспий') || lp.includes('kaspi') || lp.includes('каспи') || lp.includes('терминал') || lp.includes('цкк') || lp.includes('предоплата') || lp.includes('оплата') || lp.includes('оплатить') || lp.includes('чек') || lp.includes('наличными') || lp.includes('нал '));
            });
            if (cleanCommaParts.length === 0) return '';
            return cleanCommaParts.join(',');
        }
        return sentence;
    })
    .filter(s => s.trim().length > 0)
    .join('. ')
    .replace(/\.\s*\./g, '.') // cleanup double dots
    .trim();
};

interface Prescription {
    id: string;
    odSph: number | null; odCyl: number | null; odAx: number | null; odAdd: number | null; odPd: number | null;
    osSph: number | null; osCyl: number | null; osAx: number | null; osAdd: number | null; osPd: number | null;
    pdTotal: number | null; type: string; notes: string | null; prescribedAt: string;
}

interface Consultation {
    id: string;
    visitDate: string;
    type: string;
    diagnosis: string | null;
    treatment: string | null;
    nextVisit: string | null;
    intraocularPressureOD: number | null;
    intraocularPressureOS: number | null;
    visualAcuityOD: number | null;
    visualAcuityOS: number | null;
    k1OD: number | null; k2OD: number | null; axisOD: number | null; astigmatismOD: number | null; pachymetryOD: number | null; eccentricityOD: number | null;
    k1OS: number | null; k2OS: number | null; axisOS: number | null; astigmatismOS: number | null; pachymetryOS: number | null; eccentricityOS: number | null;
    lensFittingOD: string | null;
    lensFittingOS: string | null;
    refractionOD: string | null;
    refractionOS: string | null;
    notes: string | null;
    doctor: { fullName: string } | null;
}

interface PatientDetail {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    birthDate: string | null;
    gender: string | null;
    iin: string | null;
    address: string | null;
    profession: string | null;
    complaints: string | null;
    anamnesisDisease: string | null;
    anamnesisLife: string | null;
    allergies: string | null;
    heredity: string | null;
    medications: string | null;
    dispensary: string | null;
    surgeries: string | null;
    lastCorrection: string | null;
    notes: string | null;
    attachments: Array<{
        id: string; name: string; url: string; type: string; size: number; uploadedAt: string;
    }> | null;
    doctor: { id: string; fullName: string } | null;
    createdAt: string;
    prescriptions: Prescription[];
    orders: Array<{
        id: string; orderNumber: string; status: string; createdAt: string;
        totalPrice: number | null; isUrgent: boolean; source?: string | null;
    }>;
    sales?: any[];
}

const fmt = (v: number | null, plus = true) => {
    if (v == null) return '—';
    return (plus && v > 0 ? '+' : '') + v.toFixed(2);
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    new: { label: 'Новый', color: 'bg-blue-100 text-blue-700' },
    production: { label: 'В производстве', color: 'bg-amber-100 text-amber-700' },
    ready: { label: 'Готов', color: 'bg-green-100 text-green-700' },
    shipped: { label: 'Отгружен', color: 'bg-purple-100 text-purple-700' },
    cancelled: { label: 'Отменён', color: 'bg-red-100 text-red-700' },
};

function PrescriptionCard({ rx, onDelete }: { rx: Prescription; onDelete: () => void }) {
    const [expanded, setExpanded] = useState(false);
    const typeLabels: Record<string, string> = {
        glasses: '👓 Очки', contacts: '🔵 Контактные линзы', 'ortho-k': '🌙 Орто-К'
    };

    return (
        <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
            <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                        <Eye className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                        <p className="font-medium text-gray-900">{typeLabels[rx.type] || rx.type}</p>
                        <p className="text-xs text-gray-500">
                            {new Date(rx.prescribedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden sm:block text-right text-sm font-mono">
                        <p className="text-gray-700">OD: {fmt(rx.odSph)} {rx.odCyl ? fmt(rx.odCyl) : ''} {rx.odAx ? `${Math.round(rx.odAx)}°` : ''}</p>
                        <p className="text-gray-700">OS: {fmt(rx.osSph)} {rx.osCyl ? fmt(rx.osCyl) : ''} {rx.osAx ? `${Math.round(rx.osAx)}°` : ''}</p>
                    </div>
                    {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
            </div>

            {expanded && (
                <div className="border-t border-gray-100 p-4 bg-gray-50/50">
                    <div className="grid grid-cols-2 gap-6 mb-4">
                        {/* OD */}
                        <div>
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">OD (Правый)</h4>
                            <table className="w-full text-sm">
                                <tbody>
                                    {[['Sph', rx.odSph], ['Cyl', rx.odCyl], ['Ax', rx.odAx, false], ['Add', rx.odAdd], ['PD', rx.odPd, false]].map(([label, val, p = true]) => (
                                        <tr key={label as string}>
                                            <td className="text-gray-500 py-0.5 pr-3 w-10">{label}</td>
                                            <td className="font-mono font-medium text-gray-900">{fmt(val as number | null, p as boolean)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* OS */}
                        <div>
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">OS (Левый)</h4>
                            <table className="w-full text-sm">
                                <tbody>
                                    {[['Sph', rx.osSph], ['Cyl', rx.osCyl], ['Ax', rx.osAx, false], ['Add', rx.osAdd], ['PD', rx.osPd, false]].map(([label, val, p = true]) => (
                                        <tr key={label as string}>
                                            <td className="text-gray-500 py-0.5 pr-3 w-10">{label}</td>
                                            <td className="font-mono font-medium text-gray-900">{fmt(val as number | null, p as boolean)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {rx.pdTotal && <p className="text-sm text-gray-600 mb-2">PD общий: <span className="font-mono font-medium">{rx.pdTotal}</span> мм</p>}
                    {rx.notes && <p className="text-sm text-gray-600 italic">{rx.notes}</p>}
                    <div className="flex justify-end mt-3">
                        <button onClick={onDelete} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" /> Удалить рецепт
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function PatientDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const { data: session } = useSession();

    const [patient, setPatient] = useState<PatientDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<any>({});
    const [saving, setSaving] = useState(false);
    const [showRxForm, setShowRxForm] = useState(false);
    const [rxForm, setRxForm] = useState<any>({ type: 'glasses', prescribedAt: new Date().toISOString().split('T')[0] });
    const [savingRx, setSavingRx] = useState(false);

    // Consultations
    const [consultations, setConsultations] = useState<Consultation[]>([]);
    const [showConsultForm, setShowConsultForm] = useState(false);
    const [consultForm, setConsultForm] = useState<any>({
        visitDate: new Date().toISOString().split('T')[0],
        type: 'exam', diagnosis: '', treatment: '', nextVisit: '',
        intraocularPressureOD: '', intraocularPressureOS: '',
        visualAcuityOD: '', visualAcuityOS: '', notes: '',
        k1OD: '', k2OD: '', axisOD: '', astigmatismOD: '', pachymetryOD: '', eccentricityOD: '',
        k1OS: '', k2OS: '', axisOS: '', astigmatismOS: '', pachymetryOS: '', eccentricityOS: ''
    });
    const [savingConsult, setSavingConsult] = useState(false);
    const [expandedConsult, setExpandedConsult] = useState<string | null>(null);

    // Invoice Form (Send to Cashier)
    const [showInvoiceForm, setShowInvoiceForm] = useState(false);
    const [invoiceProducts, setInvoiceProducts] = useState<any[]>([]);
    const [invoiceCart, setInvoiceCart] = useState<any[]>([]);
    const [invoiceSearch, setInvoiceSearch] = useState('');
    const [invoiceCategoryFilter, setInvoiceCategoryFilter] = useState('all');
    const [savingInvoice, setSavingInvoice] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        fetch(`/api/patients/${id}`)
            .then(r => r.json())
            .then(data => { setPatient(data); setEditForm(data); })
            .finally(() => setIsLoading(false));

        fetch(`/api/patients/${id}/consultations`)
            .then(r => r.ok ? r.json() : [])
            .then(data => setConsultations(Array.isArray(data) ? data : []));
    }, [id]);

    const handleSave = async () => {
        setSaving(true);
        const res = await fetch(`/api/patients/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(editForm),
        });
        if (res.ok) {
            const updated = await res.json();
            setPatient(p => p ? { ...p, ...updated } : p);
            setIsEditing(false);
        }
        setSaving(false);
    };

    const handleAddRx = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingRx(true);
        const res = await fetch(`/api/patients/${id}/prescriptions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rxForm),
        });
        if (res.ok) {
            const rx = await res.json();
            setPatient(p => p ? { ...p, prescriptions: [rx, ...p.prescriptions] } : p);
            setShowRxForm(false);
            setRxForm({ type: 'glasses', prescribedAt: new Date().toISOString().split('T')[0] });
        }
        setSavingRx(false);
    };

    const handleDeleteRx = async (rxId: string) => {
        if (!confirm('Удалить рецепт?')) return;
        await fetch(`/api/prescriptions/${rxId}`, { method: 'DELETE' });
        setPatient(p => p ? { ...p, prescriptions: p.prescriptions.filter(r => r.id !== rxId) } : p);
    };

    const handleAddConsult = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingConsult(true);
        const res = await fetch(`/api/patients/${id}/consultations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(consultForm),
        });
        if (res.ok) {
            const c = await res.json();
            setConsultations(prev => [c, ...prev]);
            setShowConsultForm(false);
            setConsultForm({ 
                visitDate: new Date().toISOString().split('T')[0], type: 'exam', diagnosis: '', treatment: '', nextVisit: '', 
                intraocularPressureOD: '', intraocularPressureOS: '', visualAcuityOD: '', visualAcuityOS: '', notes: '',
                k1OD: '', k2OD: '', axisOD: '', astigmatismOD: '', pachymetryOD: '', eccentricityOD: '',
                k1OS: '', k2OS: '', axisOS: '', astigmatismOS: '', pachymetryOS: '', eccentricityOS: ''
            });
        }
        setSavingConsult(false);
    };

    const handleDeleteConsult = async (cId: string) => {
        if (!confirm('Удалить запись консультации?')) return;
        await fetch(`/api/consultations/${cId}`, { method: 'DELETE' });
        setConsultations(prev => prev.filter(c => c.id !== cId));
    };

    // Load products for invoice modal
    const handleOpenInvoice = async () => {
        setShowInvoiceForm(true);
        if (invoiceProducts.length === 0) {
            try {
                const res = await fetch('/api/optic/products');
                if (res.ok) setInvoiceProducts(await res.json());
            } catch (e) {
                console.error(e);
            }
        }
    };

    const addToInvoiceCart = (p: any) => {
        setInvoiceCart(prev => {
            const existing = prev.find(i => i.productId === p.id);
            if (existing) {
                return prev.map(i => i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { productId: p.id, name: p.name, unitPrice: p.retailPrice, quantity: 1 }];
        });
    };

    const updateInvoiceCartQty = (productId: string, delta: number) => {
        setInvoiceCart(prev => prev.map(i => {
            if (i.productId === productId) {
                const newQ = i.quantity + delta;
                return newQ > 0 ? { ...i, quantity: newQ } : i;
            }
            return i;
        }));
    };

    const removeInvoiceCart = (productId: string) => setInvoiceCart(prev => prev.filter(i => i.productId !== productId));

    const handleSubmitInvoice = async () => {
        if (!invoiceCart.length) return;
        setSavingInvoice(true);
        try {
            const res = await fetch('/api/optic/sales/draft', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patientId: id,
                    items: invoiceCart
                }),
            });
            if (res.ok) {
                alert('Счет успешно отправлен на кассу!');
                setShowInvoiceForm(false);
                setInvoiceCart([]);
            } else {
                alert('Ошибка при отправке счета');
            }
        } catch (e) {
            alert('Сетевая ошибка');
        } finally {
            setSavingInvoice(false);
        }
    };

    const calcAge = (birthDate: string | null) => {
        if (!birthDate) return '';
        const age = Math.floor((Date.now() - new Date(birthDate).getTime()) / 31557600000);
        return `${age} лет`;
    };

    const [parsingAi, setParsingAi] = useState(false);

    const handleAiParse = async (e: React.ChangeEvent<HTMLInputElement>, target: 'prescription' | 'consultation') => {
        const file = e.target.files?.[0];
        if (!file) return;

        setParsingAi(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64 = event.target?.result as string;
            try {
                const res = await fetch('/api/ai/parse-scan', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: base64 }),
                });

                if (res.ok) {
                    const parsed = await res.json();
                    const data = parsed.data || {};

                    if (target === 'prescription') {
                        setRxForm((f: any) => ({
                            ...f,
                            odSph: data.odSph ?? f.odSph, odCyl: data.odCyl ?? f.odCyl, odAx: data.odAx ?? f.odAx,
                            odAdd: data.odAdd ?? f.odAdd, odPd: data.odPd ?? f.odPd,
                            osSph: data.osSph ?? f.osSph, osCyl: data.osCyl ?? f.osCyl, osAx: data.osAx ?? f.osAx,
                            osAdd: data.osAdd ?? f.osAdd, osPd: data.osPd ?? f.osPd,
                            pdTotal: data.pdTotal ?? f.pdTotal
                        }));
                    } else {
                        setConsultForm((f: any) => ({
                            ...f,
                            visualAcuityOD: data.visualAcuityOD ?? f.visualAcuityOD,
                            visualAcuityOS: data.visualAcuityOS ?? f.visualAcuityOS,
                            intraocularPressureOD: data.intraocularPressureOD ?? f.intraocularPressureOD,
                            intraocularPressureOS: data.intraocularPressureOS ?? f.intraocularPressureOS,
                            k1OD: data.k1OD ?? f.k1OD, k2OD: data.k2OD ?? f.k2OD, axisOD: data.axisOD ?? f.axisOD,
                            astigmatismOD: data.astigmatismOD ?? f.astigmatismOD, pachymetryOD: data.pachymetryOD ?? f.pachymetryOD, eccentricityOD: data.eccentricityOD ?? f.eccentricityOD,
                            k1OS: data.k1OS ?? f.k1OS, k2OS: data.k2OS ?? f.k2OS, axisOS: data.axisOS ?? f.axisOS,
                            astigmatismOS: data.astigmatismOS ?? f.astigmatismOS, pachymetryOS: data.pachymetryOS ?? f.pachymetryOS, eccentricityOS: data.eccentricityOS ?? f.eccentricityOS
                        }));
                    }
                    
                    // Auto-upload to attachments
                    const newAttachment = {
                        id: Math.random().toString(36).substring(2, 9),
                        name: file.name,
                        url: base64,
                        type: file.type,
                        size: file.size,
                        uploadedAt: new Date().toISOString()
                    };
                    const updatedAttachments = [...(patient?.attachments || []), newAttachment];
                    await fetch(`/api/patients/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ attachments: updatedAttachments }),
                    });
                    setPatient(p => p ? { ...p, attachments: updatedAttachments } : p);

                } else {
                    alert('Ошибка при распознавании ИИ');
                }
            } catch (err) {
                console.error(err);
                alert('Сбой запроса к ИИ');
            } finally {
                setParsingAi(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const [uploadingFile, setUploadingFile] = useState(false);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingFile(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64 = event.target?.result as string;
            const newAttachment = {
                id: Math.random().toString(36).substring(2, 9),
                name: file.name,
                url: base64,
                type: file.type,
                size: file.size,
                uploadedAt: new Date().toISOString()
            };

            const updatedAttachments = [...(patient?.attachments || []), newAttachment];

            try {
                const res = await fetch(`/api/patients/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ attachments: updatedAttachments }),
                });
                if (res.ok) {
                    setPatient(p => p ? { ...p, attachments: updatedAttachments } : p);
                }
            } finally {
                setUploadingFile(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleDeleteAttachment = async (attId: string) => {
        if (!confirm('Удалить этот файл?')) return;
        const updatedAttachments = (patient?.attachments || []).filter(a => a.id !== attId);
        const res = await fetch(`/api/patients/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ attachments: updatedAttachments }),
        });
        if (res.ok) {
            setPatient(p => p ? { ...p, attachments: updatedAttachments } : p);
        }
    };

    if (isLoading) return (
        <div className="min-h-screen bg-surface flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
    );

    if (!patient) return <div className="min-h-screen bg-surface flex items-center justify-center"><p className="text-gray-500">Пациент не найден</p></div>;

    const RxField = ({ label, field }: { label: string; field: string }) => (
        <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
            <input
                type="text" inputMode="decimal"
                value={rxForm[field] ?? ''}
                onChange={e => {
                    const val = e.target.value.replace(',', '.').replace(/[^0-9.\-+]/g, '');
                    setRxForm((f: any) => ({ ...f, [field]: val }));
                }}
                className="input text-sm h-9 font-mono w-full"
                placeholder="0.00"
            />
        </div>
    );

    return (
        <div className="min-h-screen bg-surface">
            
            {/* --- ПЕЧАТНАЯ ФОРМА (Скрыта на экране, видна при печати) --- */}
            <div className="hidden print:block p-8 bg-white text-gray-800 font-sans w-full" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                {/* Header: Логотип и контакты клиники */}
                <div className="bg-gradient-to-r from-primary-50 to-white border-l-4 border-primary-500 p-6 mb-8 rounded-r-xl flex justify-between items-center shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center text-white shadow-md">
                            <Stethoscope className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-wider text-primary-900 uppercase">Медицинская карта</h1>
                            <p className="text-primary-600 font-medium mt-1">Офтальмологический центр LensFlow</p>
                        </div>
                    </div>
                    <div className="text-right text-sm text-gray-500 space-y-1">
                        <p className="flex items-center justify-end gap-2"><MapPin className="w-3.5 h-3.5 text-primary-400" /> г. Алматы, ул. Абая 1</p>
                        <p className="flex items-center justify-end gap-2"><Phone className="w-3.5 h-3.5 text-primary-400" /> +7 (777) 123-45-67</p>
                        <p className="flex items-center justify-end gap-2"><Globe className="w-3.5 h-3.5 text-primary-400" /> www.lensflow.kz</p>
                    </div>
                </div>

                {/* Данные пациента */}
                <div className="mb-8 bg-gray-50 rounded-2xl p-6 border border-gray-100">
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200">
                        <User className="w-5 h-5 text-primary-500" />
                        <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide">Пациент</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                        <div className="flex flex-col"><span className="text-xs font-bold text-gray-400 uppercase mb-1">ФИО</span> <strong className="text-lg text-gray-900">{patient.name}</strong></div>
                        <div className="flex flex-col"><span className="text-xs font-bold text-gray-400 uppercase mb-1">Дата рождения</span> <strong className="text-base text-gray-900">{patient.birthDate ? new Date(patient.birthDate).toLocaleDateString('ru-RU') : '—'} <span className="text-primary-600 font-medium">({calcAge(patient.birthDate)})</span></strong></div>
                        {session?.user?.role !== 'doctor' && session?.user?.subRole !== 'optic_doctor' && (
                            <>
                                <div className="flex flex-col"><span className="text-xs font-bold text-gray-400 uppercase mb-1">Телефон</span> <strong className="text-base text-gray-900">{patient.phone}</strong></div>
                                <div className="flex flex-col"><span className="text-xs font-bold text-gray-400 uppercase mb-1">Email</span> <strong className="text-base text-gray-900">{patient.email || '—'}</strong></div>
                            </>
                        )}
                        {patient.notes && (
                            <div className="col-span-2 mt-2 bg-orange-50/50 p-4 rounded-xl border border-orange-100">
                                <span className="text-xs font-bold text-orange-400 uppercase mb-1 block">Анамнез / Заметки</span>
                                <p className="text-gray-800 leading-relaxed">{patient.notes}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Последняя консультация (если есть) */}
                {consultations.length > 0 && (
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200">
                            <Activity className="w-5 h-5 text-teal-500" />
                            <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide">Последний визит</h2>
                        </div>
                        {(() => {
                            const c = consultations[0];
                            return (
                                <div className="text-sm">
                                    <div className="flex items-center gap-4 mb-4 bg-teal-50 text-teal-800 px-4 py-2 rounded-lg font-medium inline-flex">
                                        <Calendar className="w-4 h-4 text-teal-600" />
                                        <span>{new Date(c.visitDate).toLocaleDateString('ru-RU')}</span>
                                        {c.doctor && <span className="border-l border-teal-200 pl-4 ml-2">Врач: {c.doctor.fullName}</span>}
                                    </div>
                                    
                                    {(c.visualAcuityOD || c.visualAcuityOS || c.intraocularPressureOD || c.intraocularPressureOS) && (
                                        <div className="rounded-xl overflow-hidden border border-gray-200 mb-6">
                                            <table className="w-full text-center">
                                                <thead>
                                                    <tr className="bg-gray-50 border-b border-gray-200">
                                                        <th className="py-3 px-4 font-bold text-gray-500 uppercase text-xs tracking-wider">Показатель</th>
                                                        <th className="py-3 px-4 font-bold text-primary-600 uppercase text-xs tracking-wider bg-primary-50/50">OD (Правый)</th>
                                                        <th className="py-3 px-4 font-bold text-teal-600 uppercase text-xs tracking-wider bg-teal-50/50">OS (Левый)</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {(c.visualAcuityOD || c.visualAcuityOS) && (
                                                        <tr>
                                                            <td className="py-3 px-4 font-medium text-gray-600 text-left">Острота зрения (Visus)</td>
                                                            <td className="py-3 px-4 font-bold text-gray-900 bg-primary-50/20">{c.visualAcuityOD || '—'}</td>
                                                            <td className="py-3 px-4 font-bold text-gray-900 bg-teal-50/20">{c.visualAcuityOS || '—'}</td>
                                                        </tr>
                                                    )}
                                                    {(c.intraocularPressureOD || c.intraocularPressureOS) && (
                                                        <tr>
                                                            <td className="py-3 px-4 font-medium text-gray-600 text-left">ВГД (мм рт.ст.)</td>
                                                            <td className="py-3 px-4 font-bold text-gray-900 bg-primary-50/20">{c.intraocularPressureOD || '—'}</td>
                                                            <td className="py-3 px-4 font-bold text-gray-900 bg-teal-50/20">{c.intraocularPressureOS || '—'}</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {c.diagnosis && (
                                        <div className="mb-4">
                                            <span className="text-xs font-bold text-red-400 uppercase mb-1 block">Диагноз</span>
                                            <p className="text-gray-900 font-medium bg-red-50 p-3 rounded-lg border border-red-100">{c.diagnosis}</p>
                                        </div>
                                    )}
                                    {c.treatment && (
                                        <div className="mb-4">
                                            <span className="text-xs font-bold text-emerald-500 uppercase mb-1 block">Рекомендации / Лечение</span>
                                            <p className="text-gray-800 bg-emerald-50 p-3 rounded-lg border border-emerald-100">{c.treatment}</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                )}

                {/* Последний рецепт (если есть) */}
                {patient.prescriptions.length > 0 && (
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200">
                            <Eye className="w-5 h-5 text-indigo-500" />
                            <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide">Актуальный рецепт</h2>
                        </div>
                        {(() => {
                            const rx = patient.prescriptions[0];
                            return (
                                <div className="text-sm">
                                    <p className="mb-4 flex items-center gap-2"><span className="text-gray-400 font-medium">Выписан:</span> <strong className="text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md">{new Date(rx.prescribedAt).toLocaleDateString('ru-RU')}</strong></p>
                                    <div className="rounded-xl overflow-hidden border border-indigo-100 mb-4 shadow-sm">
                                        <table className="w-full text-center">
                                            <thead>
                                                <tr className="bg-indigo-50 border-b border-indigo-100">
                                                    <th className="py-3 px-3 font-bold text-indigo-800 uppercase text-xs tracking-wider">Глаз</th>
                                                    <th className="py-3 px-3 font-bold text-indigo-800 uppercase text-xs tracking-wider">Sph</th>
                                                    <th className="py-3 px-3 font-bold text-indigo-800 uppercase text-xs tracking-wider">Cyl</th>
                                                    <th className="py-3 px-3 font-bold text-indigo-800 uppercase text-xs tracking-wider">Ax</th>
                                                    <th className="py-3 px-3 font-bold text-indigo-800 uppercase text-xs tracking-wider">Add</th>
                                                    <th className="py-3 px-3 font-bold text-indigo-800 uppercase text-xs tracking-wider">PD</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-indigo-50">
                                                <tr>
                                                    <td className="py-3 px-3 font-bold text-primary-600 bg-white">OD</td>
                                                    <td className="py-3 px-3 font-medium bg-white">{fmt(rx.odSph)}</td>
                                                    <td className="py-3 px-3 font-medium bg-white">{fmt(rx.odCyl)}</td>
                                                    <td className="py-3 px-3 font-medium bg-white">{rx.odAx || '—'}</td>
                                                    <td className="py-3 px-3 font-medium bg-white">{fmt(rx.odAdd)}</td>
                                                    <td className="py-3 px-3 font-medium bg-white">{fmt(rx.odPd, false)}</td>
                                                </tr>
                                                <tr>
                                                    <td className="py-3 px-3 font-bold text-teal-600 bg-gray-50/50">OS</td>
                                                    <td className="py-3 px-3 font-medium bg-gray-50/50">{fmt(rx.osSph)}</td>
                                                    <td className="py-3 px-3 font-medium bg-gray-50/50">{fmt(rx.osCyl)}</td>
                                                    <td className="py-3 px-3 font-medium bg-gray-50/50">{rx.osAx || '—'}</td>
                                                    <td className="py-3 px-3 font-medium bg-gray-50/50">{fmt(rx.osAdd)}</td>
                                                    <td className="py-3 px-3 font-medium bg-gray-50/50">{fmt(rx.osPd, false)}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="flex gap-8">
                                        {rx.pdTotal && <p className="bg-gray-50 px-3 py-2 rounded-lg border border-gray-100"><span className="text-gray-400 font-medium">PD общий:</span> <strong className="text-gray-900 ml-2">{rx.pdTotal} мм</strong></p>}
                                        {rx.notes && <p className="flex-1 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100"><span className="text-gray-400 font-medium">Заметки:</span> <span className="text-gray-800 ml-2">{rx.notes}</span></p>}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}

                {/* Footer / Подписи */}
                <div className="mt-12 pt-8 border-t-2 border-gray-100 flex justify-between items-end text-sm">
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <p className="text-xs font-bold text-gray-400 uppercase mb-1">Документ сформирован</p>
                        <p className="font-bold text-gray-800 text-base">{new Date().toLocaleDateString('ru-RU')} в {new Date().toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'})}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-bold text-gray-400 uppercase mb-2">Врач (ФИО, подпись)</p>
                        <div className="flex gap-4 items-end">
                            <p className="font-bold text-gray-800 text-lg border-b-2 border-gray-200 pb-1 px-4 min-w-[200px] text-center">
                                {consultations.length > 0 && consultations[0].doctor ? consultations[0].doctor.fullName : ''}
                            </p>
                            <p className="border-b-2 border-gray-200 w-32 pb-1"></p>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- ИНТЕРФЕЙС CRM (Виден на экране, скрыт при печати) --- */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 print:hidden">
                <button onClick={() => router.push('/optic/patients')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> К списку пациентов
                </button>

                <div className="flex flex-col lg:flex-row gap-8">
                    
                    {/* LEFT SIDEBAR */}
                    <div className="w-full lg:w-80 flex-shrink-0 space-y-6">
                        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-gray-100 p-6 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-primary-100 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
                            
                            <div className="relative z-10 flex flex-col items-center text-center">
                                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-3xl font-bold shadow-md shadow-primary-200 mb-4">
                                    {patient.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                                </div>
                                
                                {isEditing ? (
                                    <input
                                        type="text" value={editForm.name || ''}
                                        onChange={e => setEditForm((f: any) => ({ ...f, name: e.target.value }))}
                                        className="input text-lg font-bold mb-2 w-full text-center"
                                    />
                                ) : (
                                    <h1 className="text-xl font-bold text-gray-900 mb-1">{patient.name}</h1>
                                )}
                                
                                <div className="flex flex-wrap justify-center gap-2 mb-4">
                                    {patient.gender === 'male' && <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs font-medium">♂ Мужской</span>}
                                    {patient.gender === 'female' && <span className="px-2 py-0.5 rounded-full bg-pink-50 text-pink-600 text-xs font-medium">♀ Женский</span>}
                                    {patient.birthDate && <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">{calcAge(patient.birthDate)}</span>}
                                </div>
                                
                                <div className="flex flex-col gap-2 w-full">
                                    <div className="flex gap-2 w-full">
                                        {isEditing ? (
                                            <>
                                                <button onClick={() => setIsEditing(false)} className="btn bg-gray-100 hover:bg-gray-200 flex-1 text-sm"><X className="w-4 h-4 mx-auto" /></button>
                                                <button onClick={handleSave} disabled={saving} className="btn btn-primary flex-[2] text-sm flex items-center justify-center gap-1">
                                                    <Save className="w-4 h-4" /> {saving ? '...' : 'Сохранить'}
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => window.print()} className="btn bg-white border border-gray-200 hover:border-gray-300 shadow-sm flex-1 text-sm flex justify-center text-gray-600">
                                                    <Printer className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => setIsEditing(true)} className="btn bg-white border border-gray-200 hover:border-gray-300 shadow-sm flex-[2] text-sm flex items-center justify-center gap-1 text-gray-700">
                                                    <Edit2 className="w-4 h-4" /> Редактировать
                                                </button>
                                            </>
                                        )}
                                    </div>
                                    {!isEditing && (
                                        <button onClick={handleOpenInvoice} className="btn bg-orange-100 hover:bg-orange-200 text-orange-800 w-full text-sm flex items-center justify-center gap-2 transition-colors border-none shadow-sm py-2.5">
                                            <Banknote className="w-4 h-4" /> Выставить счет на кассу
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="mt-6 space-y-4 relative z-10 text-left">
                                {!(session?.user?.role === 'doctor' || session?.user?.subRole === 'optic_doctor') && (
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Телефон</label>
                                        {isEditing ? (
                                            <input type="tel" value={editForm.phone || ''} onChange={e => setEditForm((f: any) => ({ ...f, phone: e.target.value }))} className="input text-sm w-full" />
                                        ) : (
                                            <p className="flex items-center gap-2 text-gray-900 text-sm font-medium"><Phone className="w-4 h-4 text-primary-400" />{patient.phone}</p>
                                        )}
                                    </div>
                                )}
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Город / Адрес</label>
                                    {isEditing ? (
                                        <input type="text" value={editForm.address || ''} onChange={e => setEditForm((f: any) => ({ ...f, address: e.target.value }))} className="input text-sm w-full" />
                                    ) : (
                                        <p className="flex items-center gap-2 text-gray-900 text-sm">{patient.address ? <><MapPin className="w-4 h-4 text-primary-400" />{patient.address}</> : '—'}</p>
                                    )}
                                </div>
                                {!(session?.user?.role === 'doctor' || session?.user?.subRole === 'optic_doctor') && (
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Email</label>
                                        {isEditing ? (
                                            <input type="email" value={editForm.email || ''} onChange={e => setEditForm((f: any) => ({ ...f, email: e.target.value }))} className="input text-sm w-full" />
                                        ) : (
                                            <p className="flex items-center gap-2 text-gray-900 text-sm">{patient.email ? <><Mail className="w-4 h-4 text-primary-400" />{patient.email}</> : '—'}</p>
                                        )}
                                    </div>
                                )}
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Дата рождения</label>
                                    {isEditing ? (
                                        <input type="date" value={editForm.birthDate?.split('T')[0] || ''} onChange={e => setEditForm((f: any) => ({ ...f, birthDate: e.target.value }))} className="input text-sm w-full" />
                                    ) : (
                                        <p className="flex items-center gap-2 text-gray-900 text-sm">{patient.birthDate ? <><Calendar className="w-4 h-4 text-primary-400" />{new Date(patient.birthDate).toLocaleDateString('ru-RU')}</> : '—'}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* MAIN CONTENT AREA */}
                    <div className="flex-1 min-w-0">
                        {/* TABS HEADER */}
                        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] border border-gray-100 p-1 flex gap-1 mb-6 overflow-x-auto no-scrollbar sticky top-4 z-20">
                            {[
                                { id: 'overview', icon: LayoutDashboard, label: 'Обзор' },
                                { id: 'consultations', icon: Activity, label: 'Консультации', count: consultations.length },
                                { id: 'prescriptions', icon: Eye, label: 'Рецепты', count: patient.prescriptions.length },
                                { id: 'orders', icon: ClipboardList, label: 'Заказы', count: patient.orders.length },
                                { id: 'sales', icon: ShoppingBag, label: 'Покупки', count: patient.sales?.length || 0 },
                                { id: 'files', icon: Paperclip, label: 'Снимки', count: patient.attachments?.length || 0 }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        setActiveTab(tab.id);
                                        document.getElementById(tab.id)?.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex-shrink-0 ${activeTab === tab.id ? 'bg-primary-50 text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
                                >
                                    <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-primary-600' : 'text-gray-400'}`} />
                                    {tab.label}
                                    {tab.count !== undefined && tab.count > 0 && (
                                        <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] leading-none ${activeTab === tab.id ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'}`}>{tab.count}</span>
                                    )}
                                </button>
                            ))}

                        </div>

                        {/* MAIN CONTENT STACK */}
                        <div className="space-y-16 pb-32">
                            {/* OVERVIEW SECTION */}
                            <div id="overview" className="grid grid-cols-1 md:grid-cols-2 gap-6 scroll-mt-24">
                                <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
                                    <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-teal-500" /> Активность</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">Последний визит</p>
                                            <p className="font-semibold text-gray-900">{consultations.length > 0 ? new Date(consultations[0].visitDate).toLocaleDateString('ru-RU') : 'Нет визитов'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">Актуальный рецепт</p>
                                            <p className="font-semibold text-gray-900">{patient.prescriptions.length > 0 ? new Date(patient.prescriptions[0].prescribedAt).toLocaleDateString('ru-RU') : 'Нет рецептов'}</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-gray-50 flex gap-2">
                                        <button onClick={() => setActiveTab('consultations')} className="btn bg-gray-50 hover:bg-gray-100 flex-1 text-xs text-gray-700">Перейти к визитам →</button>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-3xl border border-teal-100/50 p-6 shadow-sm">
                                    <h3 className="text-sm font-bold text-teal-900 mb-4 flex items-center gap-2"><Eye className="w-4 h-4 text-teal-600" /> Последние показатели</h3>
                                    {consultations.length > 0 && (consultations[0].visualAcuityOD || consultations[0].visualAcuityOS) ? (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white/60 backdrop-blur rounded-xl p-3">
                                                <p className="text-[10px] uppercase font-bold text-teal-600/70 mb-1">Visus OD</p>
                                                <p className="text-lg font-mono font-bold text-teal-900">{consultations[0].visualAcuityOD ?? '—'}</p>
                                            </div>
                                            <div className="bg-white/60 backdrop-blur rounded-xl p-3">
                                                <p className="text-[10px] uppercase font-bold text-teal-600/70 mb-1">Visus OS</p>
                                                <p className="text-lg font-mono font-bold text-teal-900">{consultations[0].visualAcuityOS ?? '—'}</p>
                                            </div>
                                            <div className="bg-white/60 backdrop-blur rounded-xl p-3">
                                                <p className="text-[10px] uppercase font-bold text-teal-600/70 mb-1">ВГД OD</p>
                                                <p className="text-lg font-mono font-bold text-teal-900">{consultations[0].intraocularPressureOD ?? '—'}</p>
                                            </div>
                                            <div className="bg-white/60 backdrop-blur rounded-xl p-3">
                                                <p className="text-[10px] uppercase font-bold text-teal-600/70 mb-1">ВГД OS</p>
                                                <p className="text-lg font-mono font-bold text-teal-900">{consultations[0].intraocularPressureOS ?? '—'}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-teal-700/70">Нет данных о зрении в последнем визите.</p>
                                    )}
                                </div>

                                {(isEditing || patient.complaints || patient.anamnesisDisease || patient.anamnesisLife || patient.allergies || patient.heredity || patient.medications || patient.surgeries || patient.notes || patient.iin || patient.profession) && (
                                    <div className="md:col-span-2 bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
                                        <h3 className="text-sm font-bold text-gray-900 mb-6 flex items-center gap-2"><FileText className="w-4 h-4 text-blue-500" /> Медицинская карта / Анамнез</h3>
                                        
                                        {isEditing ? (
                                            <div className="space-y-6">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">ИИН</label>
                                                        <input type="text" value={editForm.iin || ''} onChange={e => setEditForm((f: any) => ({ ...f, iin: e.target.value }))} className="input text-sm w-full h-10" placeholder="ИИН" />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Профессия</label>
                                                        <input type="text" value={editForm.profession || ''} onChange={e => setEditForm((f: any) => ({ ...f, profession: e.target.value }))} className="input text-sm w-full h-10" placeholder="Профессия" />
                                                    </div>
                                                </div>

                                                <div className="pt-4 border-t border-gray-100 space-y-4">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Жалобы</label>
                                                        <textarea value={editForm.complaints || ''} onChange={e => setEditForm((f: any) => ({ ...f, complaints: e.target.value }))} className="input w-full resize-y text-sm min-h-[60px]" rows={2} />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Анамнез заболевания (Anamnesis morbi)</label>
                                                        <textarea value={editForm.anamnesisDisease || ''} onChange={e => setEditForm((f: any) => ({ ...f, anamnesisDisease: e.target.value }))} className="input w-full resize-y text-sm min-h-[60px]" rows={2} />
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Аллергоанамнез</label>
                                                            <input type="text" value={editForm.allergies || ''} onChange={e => setEditForm((f: any) => ({ ...f, allergies: e.target.value }))} className="input w-full text-sm h-10" placeholder="Лекарственная, пищевая аллергия" />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Наследственность</label>
                                                            <input type="text" value={editForm.heredity || ''} onChange={e => setEditForm((f: any) => ({ ...f, heredity: e.target.value }))} className="input w-full text-sm h-10" placeholder="Глаукома, СД..." />
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Перенесенные операции</label>
                                                            <input type="text" value={editForm.surgeries || ''} onChange={e => setEditForm((f: any) => ({ ...f, surgeries: e.target.value }))} className="input w-full text-sm h-10" />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Постоянный прием медикаментов</label>
                                                            <input type="text" value={editForm.medications || ''} onChange={e => setEditForm((f: any) => ({ ...f, medications: e.target.value }))} className="input w-full text-sm h-10" />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Последняя коррекция</label>
                                                        <input type="text" value={editForm.lastCorrection || ''} onChange={e => setEditForm((f: any) => ({ ...f, lastCorrection: e.target.value }))} className="input w-full text-sm h-10" placeholder="Очки, МКЛ (дата)" />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Прочие заметки</label>
                                                        <textarea value={editForm.notes || ''} onChange={e => setEditForm((f: any) => ({ ...f, notes: e.target.value }))} className="input w-full resize-y text-sm min-h-[60px]" rows={2} />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                {(patient.iin || patient.profession) && (
                                                    <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-100">
                                                        {patient.iin && <div><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">ИИН</p><p className="text-gray-900 text-sm font-medium">{patient.iin}</p></div>}
                                                        {patient.profession && <div><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Профессия</p><p className="text-gray-900 text-sm font-medium">{patient.profession}</p></div>}
                                                    </div>
                                                )}
                                                
                                                {patient.complaints && <div><p className="text-[10px] font-bold text-red-500 uppercase mb-1">Жалобы</p><p className="text-gray-800 text-sm bg-red-50 p-4 rounded-xl border border-red-100/50 leading-relaxed">{patient.complaints}</p></div>}
                                                {patient.anamnesisDisease && <div><p className="text-[10px] font-bold text-orange-500 uppercase mb-1">Анамнез заболевания</p><p className="text-gray-800 text-sm bg-orange-50 p-4 rounded-xl border border-orange-100/50 leading-relaxed">{patient.anamnesisDisease}</p></div>}
                                                
                                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                                    <div className="bg-rose-50 p-3 rounded-xl border border-rose-100">
                                                        <p className="text-[10px] font-bold text-rose-500 uppercase mb-1">Аллергоанамнез</p>
                                                        <p className="text-sm font-medium text-gray-800">{patient.allergies ? `отягощен/да: ${patient.allergies}` : 'не отягощен/нет'}</p>
                                                    </div>
                                                    <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                                                        <p className="text-[10px] font-bold text-indigo-500 uppercase mb-1">Наследственность</p>
                                                        <p className="text-sm font-medium text-gray-800">{patient.heredity ? `отягощен/да: ${patient.heredity}` : 'не отягощен/нет'}</p>
                                                    </div>
                                                    <div className="bg-sky-50 p-3 rounded-xl border border-sky-100">
                                                        <p className="text-[10px] font-bold text-sky-500 uppercase mb-1">Прием медикаментов</p>
                                                        <p className="text-sm font-medium text-gray-800">{patient.medications ? `да: ${patient.medications}` : 'нет'}</p>
                                                    </div>
                                                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                                                        <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Операции</p>
                                                        <p className="text-sm font-medium text-gray-800">{patient.surgeries ? `да: ${patient.surgeries}` : 'нет'}</p>
                                                    </div>
                                                </div>
                                                
                                                {patient.lastCorrection && <div><p className="text-[10px] font-bold text-purple-500 uppercase mb-1">Последняя коррекция</p><p className="text-gray-800 text-sm bg-purple-50 p-4 rounded-xl border border-purple-100/50">{patient.lastCorrection}</p></div>}
                                                
                                                {patient.notes && <div><p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Прочие заметки</p><p className="text-gray-700 text-sm bg-gray-50 p-4 rounded-xl border border-gray-100 leading-relaxed">{patient.notes}</p></div>}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Prescriptions */}
                            <div id="prescriptions" className="scroll-mt-24">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Stethoscope className="w-5 h-5 text-primary-600" /> Рецепты на зрение
                            </h2>
                            <button onClick={() => setShowRxForm(!showRxForm)} className="btn btn-primary btn-sm flex items-center gap-1">
                                <Plus className="w-4 h-4" /> Добавить
                            </button>
                        </div>

                        {/* Rx Form */}
                        {showRxForm && (
                            <div className="bg-white rounded-xl border border-primary-200 p-4 mb-4 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-gray-900">Новый рецепт</h3>
                                    <label className={`btn btn-sm ${parsingAi ? 'bg-indigo-100 text-indigo-400' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'} flex items-center gap-1 cursor-pointer border-0`}>
                                        <Wand2 className={`w-4 h-4 ${parsingAi && 'animate-spin'}`} />
                                        {parsingAi ? 'ИИ читает...' : 'Считать с фото'}
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleAiParse(e, 'prescription')} disabled={parsingAi} />
                                    </label>
                                </div>
                                <form onSubmit={handleAddRx}>
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Тип</label>
                                            <select value={rxForm.type} onChange={e => setRxForm((f: any) => ({ ...f, type: e.target.value }))} className="input text-sm h-9 w-full">
                                                <option value="glasses">Очки</option>
                                                <option value="contacts">Контактные линзы</option>
                                                <option value="ortho-k">Орто-К</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Дата рецепта</label>
                                            <input type="date" value={rxForm.prescribedAt || ''} onChange={e => setRxForm((f: any) => ({ ...f, prescribedAt: e.target.value }))} className="input text-sm h-9 w-full" />
                                        </div>
                                    </div>
                                    {/* OD / OS grid */}
                                    <div className="grid grid-cols-2 gap-4 mb-3">
                                        <div>
                                            <p className="text-xs font-bold text-gray-600 mb-2 bg-gray-100 rounded px-2 py-1">OD — Правый</p>
                                            <div className="space-y-2">
                                                <RxField label="Sph" field="odSph" />
                                                <RxField label="Cyl" field="odCyl" />
                                                <RxField label="Ax" field="odAx" />
                                                <RxField label="Add" field="odAdd" />
                                                <RxField label="PD" field="odPd" />
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-600 mb-2 bg-gray-100 rounded px-2 py-1">OS — Левый</p>
                                            <div className="space-y-2">
                                                <RxField label="Sph" field="osSph" />
                                                <RxField label="Cyl" field="osCyl" />
                                                <RxField label="Ax" field="osAx" />
                                                <RxField label="Add" field="osAdd" />
                                                <RxField label="PD" field="osPd" />
                                            </div>
                                        </div>
                                    </div>
                                    <RxField label="PD общий (мм)" field="pdTotal" />
                                    <div className="mt-3">
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Заметки к рецепту</label>
                                        <textarea value={rxForm.notes || ''} onChange={e => setRxForm((f: any) => ({ ...f, notes: e.target.value }))} className="input w-full resize-none text-sm" rows={2} />
                                    </div>
                                    <div className="flex gap-2 mt-4">
                                        <button type="button" onClick={() => setShowRxForm(false)} className="btn btn-secondary flex-1 text-sm">Отмена</button>
                                        <button type="submit" disabled={savingRx} className="btn btn-primary flex-1 text-sm">
                                            {savingRx ? 'Сохранение...' : 'Сохранить рецепт'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {patient.prescriptions.length === 0 ? (
                            <div className="text-center py-10 bg-white rounded-xl border border-gray-200">
                                <Eye className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                <p className="text-gray-500 text-sm">Рецептов пока нет</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {patient.prescriptions.map(rx => (
                                    <PrescriptionCard key={rx.id} rx={rx} onDelete={() => handleDeleteRx(rx.id)} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Orders */}
                    <div id="orders" className="scroll-mt-24">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <ClipboardList className="w-5 h-5 text-primary-600" /> История заказов
                            </h2>
                            <Link href={`/optic/orders/new?patientId=${patient.id}&patientName=${encodeURIComponent(patient.name)}`} className="btn btn-secondary btn-sm flex items-center gap-1">
                                <Plus className="w-4 h-4" /> Новый заказ
                            </Link>
                        </div>
                        {patient.orders.length === 0 ? (
                            <div className="text-center py-10 bg-white rounded-xl border border-gray-200">
                                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                <p className="text-gray-500 text-sm">Заказов пока нет</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {patient.orders.map(order => {
                                    const s = STATUS_LABELS[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-700' };
                                    const isItigris = order.source === 'itigris' || (order.orderNumber || '').startsWith('ITG-');
                                    const inner = (
                                        <>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-semibold text-gray-900">{order.orderNumber || order.id}</span>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>{s.label}</span>
                                                    {isItigris && <span className="text-xs bg-orange-50 text-orange-600 border border-orange-200 px-2 py-0.5 rounded-full font-semibold">ITIGRIS</span>}
                                                    {order.isUrgent && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">СРОЧНО</span>}
                                                </div>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    {new Date(order.createdAt).toLocaleDateString('ru-RU')}
                                                    {order.totalPrice ? ` · ${order.totalPrice.toLocaleString('ru-RU')} ₸` : ''}
                                                </p>
                                            </div>
                                            {!isItigris && <ChevronDown className="w-4 h-4 text-gray-300 -rotate-90 group-hover:text-primary-500 transition-colors" />}
                                        </>
                                    );
                                    return isItigris ? (
                                        <Link key={order.id} href={`/optic/orders/itigris/${order.orderNumber || order.id}`}
                                            className="flex items-center gap-3 bg-orange-50/40 rounded-xl border border-orange-100 p-4 hover:border-orange-300 hover:shadow-sm transition-all group cursor-pointer">
                                            {inner}
                                            <ChevronDown className="w-4 h-4 text-orange-300 -rotate-90 group-hover:text-orange-500 transition-colors" />
                                        </Link>
                                    ) : (
                                        <Link key={order.id} href={`/optic/orders/${order.id}`}
                                            className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-4 hover:border-primary-300 hover:shadow-sm transition-all group">
                                            {inner}
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {activeTab === 'sales' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">История покупок (Касса)</h2>
                                    <p className="text-sm text-gray-500">Товары и услуги, оплаченные на кассе</p>
                                </div>
                            </div>

                            {(!patient.sales || patient.sales.length === 0) ? (
                                <div className="bg-gray-50 rounded-3xl p-12 text-center border-2 border-dashed border-gray-200">
                                    <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                    <h3 className="text-lg font-bold text-gray-900 mb-1">Нет покупок</h3>
                                    <p className="text-sm text-gray-500">Пациент еще ничего не покупал на кассе</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {patient.sales.map((sale: any) => (
                                        <div key={sale.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                                                <div>
                                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Чек</span>
                                                    <div className="flex items-center gap-3">
                                                        <h3 className="text-lg font-black text-gray-900">#{sale.saleNumber}</h3>
                                                        <span className="text-sm font-medium text-gray-500">{new Date(sale.createdAt).toLocaleDateString('ru-RU')}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm font-bold text-gray-900">{fmt(sale.total)} ₸</div>
                                                    <div className="text-xs text-gray-500">{sale.paymentMethod === 'card' ? 'Карта' : sale.paymentMethod === 'transfer' ? 'Перевод' : sale.paymentMethod === 'mixed' ? 'Смешанная' : 'Наличные'}</div>
                                                </div>
                                            </div>

                                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                                <div className="space-y-2">
                                                    {sale.items?.map((item: any, i: number) => (
                                                        <div key={i} className="flex justify-between items-center text-sm">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium text-gray-800">{item.name}</span>
                                                                <span className="text-gray-400 text-xs">x{item.quantity}</span>
                                                            </div>
                                                            <span className="font-bold text-gray-600">{fmt(item.total)} ₸</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Consultations */}
                    <div id="consultations" className="scroll-mt-24">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-teal-600" /> История консультаций
                            {consultations.length > 0 && (
                                <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{consultations.length}</span>
                            )}
                        </h2>
                        <button onClick={() => setShowConsultForm(!showConsultForm)} className="btn btn-secondary btn-sm flex items-center gap-1">
                            <Plus className="w-4 h-4" /> Добавить визит
                        </button>
                    </div>

                    {/* New Consultation Form */}
                    {showConsultForm && (
                        <div className="bg-white rounded-xl border border-teal-200 p-5 mb-4 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-gray-900">Новая запись консультации</h3>
                                <label className={`btn btn-sm ${parsingAi ? 'bg-indigo-100 text-indigo-400' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'} flex items-center gap-1 cursor-pointer border-0`}>
                                    <Wand2 className={`w-4 h-4 ${parsingAi && 'animate-spin'}`} />
                                    {parsingAi ? 'ИИ читает...' : 'Считать с фото'}
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleAiParse(e, 'consultation')} disabled={parsingAi} />
                                </label>
                            </div>
                            <form onSubmit={handleAddConsult}>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Дата визита</label>
                                        <input type="date" value={consultForm.visitDate} onChange={e => setConsultForm((f: any) => ({ ...f, visitDate: e.target.value }))} className="input w-full text-sm h-9" required />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Тип приёма</label>
                                        <select value={consultForm.type} onChange={e => setConsultForm((f: any) => ({ ...f, type: e.target.value }))} className="input w-full text-sm h-9">
                                            <option value="exam">🔍 Первичный осмотр</option>
                                            <option value="follow_up">🔄 Повторный приём</option>
                                            <option value="fitting">👁 Подбор линз</option>
                                            <option value="other">📋 Другое</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Visual metrics */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Острота OD</label>
                                        <input type="number" step="0.1" min="0" max="2" placeholder="1.0" value={consultForm.visualAcuityOD} onChange={e => setConsultForm((f: any) => ({ ...f, visualAcuityOD: e.target.value }))} className="input w-full text-sm h-9 font-mono" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Острота OS</label>
                                        <input type="number" step="0.1" min="0" max="2" placeholder="1.0" value={consultForm.visualAcuityOS} onChange={e => setConsultForm((f: any) => ({ ...f, visualAcuityOS: e.target.value }))} className="input w-full text-sm h-9 font-mono" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">ВГД OD (мм рт.)</label>
                                        <input type="number" step="0.5" placeholder="15.0" value={consultForm.intraocularPressureOD} onChange={e => setConsultForm((f: any) => ({ ...f, intraocularPressureOD: e.target.value }))} className="input w-full text-sm h-9 font-mono" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">ВГД OS (мм рт.)</label>
                                        <input type="number" step="0.5" placeholder="15.0" value={consultForm.intraocularPressureOS} onChange={e => setConsultForm((f: any) => ({ ...f, intraocularPressureOS: e.target.value }))} className="input w-full text-sm h-9 font-mono" />
                                    </div>
                                </div>

                                {/* Topography metrics */}
                                <div className="mb-4">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Топография / Кератометрия</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                            <p className="text-xs font-bold text-gray-600 mb-2">OD — Правый</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div><label className="text-[10px] text-gray-500">K1</label><input type="number" step="0.01" value={consultForm.k1OD} onChange={e => setConsultForm((f: any) => ({ ...f, k1OD: e.target.value }))} className="input w-full text-sm h-7 font-mono" /></div>
                                                <div><label className="text-[10px] text-gray-500">K2</label><input type="number" step="0.01" value={consultForm.k2OD} onChange={e => setConsultForm((f: any) => ({ ...f, k2OD: e.target.value }))} className="input w-full text-sm h-7 font-mono" /></div>
                                                <div><label className="text-[10px] text-gray-500">Axis</label><input type="number" step="1" value={consultForm.axisOD} onChange={e => setConsultForm((f: any) => ({ ...f, axisOD: e.target.value }))} className="input w-full text-sm h-7 font-mono" /></div>
                                                <div><label className="text-[10px] text-gray-500">Astig</label><input type="number" step="0.01" value={consultForm.astigmatismOD} onChange={e => setConsultForm((f: any) => ({ ...f, astigmatismOD: e.target.value }))} className="input w-full text-sm h-7 font-mono" /></div>
                                                <div><label className="text-[10px] text-gray-500">Pachy</label><input type="number" step="1" value={consultForm.pachymetryOD} onChange={e => setConsultForm((f: any) => ({ ...f, pachymetryOD: e.target.value }))} className="input w-full text-sm h-7 font-mono" /></div>
                                                <div><label className="text-[10px] text-gray-500">e-value</label><input type="number" step="0.01" value={consultForm.eccentricityOD} onChange={e => setConsultForm((f: any) => ({ ...f, eccentricityOD: e.target.value }))} className="input w-full text-sm h-7 font-mono" /></div>
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                            <p className="text-xs font-bold text-gray-600 mb-2">OS — Левый</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div><label className="text-[10px] text-gray-500">K1</label><input type="number" step="0.01" value={consultForm.k1OS} onChange={e => setConsultForm((f: any) => ({ ...f, k1OS: e.target.value }))} className="input w-full text-sm h-7 font-mono" /></div>
                                                <div><label className="text-[10px] text-gray-500">K2</label><input type="number" step="0.01" value={consultForm.k2OS} onChange={e => setConsultForm((f: any) => ({ ...f, k2OS: e.target.value }))} className="input w-full text-sm h-7 font-mono" /></div>
                                                <div><label className="text-[10px] text-gray-500">Axis</label><input type="number" step="1" value={consultForm.axisOS} onChange={e => setConsultForm((f: any) => ({ ...f, axisOS: e.target.value }))} className="input w-full text-sm h-7 font-mono" /></div>
                                                <div><label className="text-[10px] text-gray-500">Astig</label><input type="number" step="0.01" value={consultForm.astigmatismOS} onChange={e => setConsultForm((f: any) => ({ ...f, astigmatismOS: e.target.value }))} className="input w-full text-sm h-7 font-mono" /></div>
                                                <div><label className="text-[10px] text-gray-500">Pachy</label><input type="number" step="1" value={consultForm.pachymetryOS} onChange={e => setConsultForm((f: any) => ({ ...f, pachymetryOS: e.target.value }))} className="input w-full text-sm h-7 font-mono" /></div>
                                                <div><label className="text-[10px] text-gray-500">e-value</label><input type="number" step="0.01" value={consultForm.eccentricityOS} onChange={e => setConsultForm((f: any) => ({ ...f, eccentricityOS: e.target.value }))} className="input w-full text-sm h-7 font-mono" /></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Lens Fitting and Refraction (Free Text) */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                        <h4 className="text-xs font-bold text-blue-800 uppercase mb-2">Подбор линз (Параметры)</h4>
                                        <div className="space-y-2">
                                            <div>
                                                <label className="text-[10px] text-blue-600 font-semibold block mb-0.5">OD — Правый</label>
                                                <input type="text" value={consultForm.lensFittingOD || ''} onChange={e => setConsultForm((f: any) => ({ ...f, lensFittingOD: e.target.value }))} className="input w-full text-sm h-8" placeholder="BC, RZD, LZA, Paragon 10.5..." />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-blue-600 font-semibold block mb-0.5">OS — Левый</label>
                                                <input type="text" value={consultForm.lensFittingOS || ''} onChange={e => setConsultForm((f: any) => ({ ...f, lensFittingOS: e.target.value }))} className="input w-full text-sm h-8" placeholder="BC, RZD, LZA..." />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                                        <h4 className="text-xs font-bold text-purple-800 uppercase mb-2">Рефрактометрия (ROL)</h4>
                                        <div className="space-y-2">
                                            <div>
                                                <label className="text-[10px] text-purple-600 font-semibold block mb-0.5">OD — Правый</label>
                                                <input type="text" value={consultForm.refractionOD || ''} onChange={e => setConsultForm((f: any) => ({ ...f, refractionOD: e.target.value }))} className="input w-full text-sm h-8" placeholder="Sph / Cyl / Ax" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-purple-600 font-semibold block mb-0.5">OS — Левый</label>
                                                <input type="text" value={consultForm.refractionOS || ''} onChange={e => setConsultForm((f: any) => ({ ...f, refractionOS: e.target.value }))} className="input w-full text-sm h-8" placeholder="Sph / Cyl / Ax" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3 mb-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Диагноз / Клинические данные</label>
                                        <textarea value={consultForm.diagnosis || ''} onChange={e => setConsultForm((f: any) => ({ ...f, diagnosis: e.target.value }))} className="input w-full resize-none text-sm" rows={2} placeholder="Миопия высокой степени, прогрессирующая..." />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">План лечения / Рекомендации</label>
                                        <textarea value={consultForm.treatment} onChange={e => setConsultForm((f: any) => ({ ...f, treatment: e.target.value }))} className="input w-full resize-none text-sm" rows={2} placeholder="Подобраны орто-К линзы, курс 3 месяца..." />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Следующий визит</label>
                                            <input type="date" value={consultForm.nextVisit} onChange={e => setConsultForm((f: any) => ({ ...f, nextVisit: e.target.value }))} className="input w-full text-sm h-9" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Заметки</label>
                                            <input type="text" value={consultForm.notes} onChange={e => setConsultForm((f: any) => ({ ...f, notes: e.target.value }))} className="input w-full text-sm h-9" placeholder="Дополнительно..." />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setShowConsultForm(false)} className="btn btn-secondary flex-1 text-sm">Отмена</button>
                                    <button type="submit" disabled={savingConsult} className="btn btn-primary flex-1 text-sm">
                                        {savingConsult ? 'Сохранение...' : 'Сохранить запись'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {consultations.length === 0 && !showConsultForm ? (
                        <div className="text-center py-10 bg-white rounded-xl border border-gray-200">
                            <Activity className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-500 text-sm">Записей консультаций пока нет</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {consultations.map(c => {
                                const typeLabels: Record<string, string> = {
                                    exam: '🔍 Первичный осмотр',
                                    follow_up: '🔄 Повторный приём',
                                    fitting: '👁 Подбор линз',
                                    other: '📋 Другое',
                                };
                                const isExpanded = expandedConsult === c.id;
                                return (
                                    <div key={c.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                        <div
                                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                            onClick={() => setExpandedConsult(isExpanded ? null : c.id)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                                                    <Activity className="w-5 h-5 text-teal-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{typeLabels[c.type] || c.type}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {new Date(c.visitDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                        {c.doctor && <span className="ml-2">· {c.doctor.fullName}</span>}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {(c.visualAcuityOD || c.visualAcuityOS) && (
                                                    <div className="hidden sm:block text-right text-xs font-mono text-gray-600">
                                                        <p>OD: {c.visualAcuityOD ?? '—'}</p>
                                                        <p>OS: {c.visualAcuityOS ?? '—'}</p>
                                                    </div>
                                                )}
                                                {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="border-t border-gray-100 p-4 bg-gray-50/50 space-y-3">
                                                {(c.visualAcuityOD != null || c.visualAcuityOS != null || c.intraocularPressureOD != null) && (
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                        <div className="bg-white rounded-lg p-3 border border-gray-100 text-center">
                                                            <p className="text-xs text-gray-400 mb-0.5">Острота OD</p>
                                                            <p className="font-mono font-bold text-gray-900">{c.visualAcuityOD ?? '—'}</p>
                                                        </div>
                                                        <div className="bg-white rounded-lg p-3 border border-gray-100 text-center">
                                                            <p className="text-xs text-gray-400 mb-0.5">Острота OS</p>
                                                            <p className="font-mono font-bold text-gray-900">{c.visualAcuityOS ?? '—'}</p>
                                                        </div>
                                                        <div className="bg-white rounded-lg p-3 border border-gray-100 text-center">
                                                            <p className="text-xs text-gray-400 mb-0.5">ВГД OD</p>
                                                            <p className="font-mono font-bold text-gray-900">{c.intraocularPressureOD != null ? `${c.intraocularPressureOD} мм` : '—'}</p>
                                                        </div>
                                                        <div className="bg-white rounded-lg p-3 border border-gray-100 text-center">
                                                            <p className="text-xs text-gray-400 mb-0.5">ВГД OS</p>
                                                            <p className="font-mono font-bold text-gray-900">{c.intraocularPressureOS != null ? `${c.intraocularPressureOS} мм` : '—'}</p>
                                                        </div>
                                                    </div>
                                                )}
                                                {(c.lensFittingOD || c.lensFittingOS) && (
                                                    <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100">
                                                        <p className="text-xs font-semibold text-blue-700 mb-2">Подбор линз</p>
                                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                                            <div><span className="text-blue-500 font-medium text-xs">OD:</span> <span className="text-gray-800">{c.lensFittingOD || '—'}</span></div>
                                                            <div><span className="text-blue-500 font-medium text-xs">OS:</span> <span className="text-gray-800">{c.lensFittingOS || '—'}</span></div>
                                                        </div>
                                                    </div>
                                                )}
                                                {(c.refractionOD || c.refractionOS) && (
                                                    <div className="bg-purple-50/50 rounded-lg p-3 border border-purple-100">
                                                        <p className="text-xs font-semibold text-purple-700 mb-2">Рефрактометрия</p>
                                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                                            <div><span className="text-purple-500 font-medium text-xs">OD:</span> <span className="text-gray-800">{c.refractionOD || '—'}</span></div>
                                                            <div><span className="text-purple-500 font-medium text-xs">OS:</span> <span className="text-gray-800">{c.refractionOS || '—'}</span></div>
                                                        </div>
                                                    </div>
                                                )}
                                                {c.diagnosis && filterMedicalText(c.diagnosis, session?.user?.role === 'doctor' || session?.user?.subRole === 'optic_doctor' ? 'doctor' : session?.user?.role) && (
                                                    <div>
                                                        <p className="text-xs font-semibold text-gray-500 mb-1">Диагноз</p>
                                                        <p className="text-sm text-gray-800 bg-white rounded-lg p-3 border border-gray-100">{filterMedicalText(c.diagnosis, session?.user?.role === 'doctor' || session?.user?.subRole === 'optic_doctor' ? 'doctor' : session?.user?.role)}</p>
                                                    </div>
                                                )}
                                                {c.treatment && filterMedicalText(c.treatment, session?.user?.role === 'doctor' || session?.user?.subRole === 'optic_doctor' ? 'doctor' : session?.user?.role) && (
                                                    <div>
                                                        <p className="text-xs font-semibold text-gray-500 mb-1">Рекомендации</p>
                                                        <p className="text-sm text-gray-800 bg-white rounded-lg p-3 border border-gray-100">{filterMedicalText(c.treatment, session?.user?.role === 'doctor' || session?.user?.subRole === 'optic_doctor' ? 'doctor' : session?.user?.role)}</p>
                                                    </div>
                                                )}
                                                {c.nextVisit && (
                                                    <div className="flex items-center gap-2 text-sm text-teal-700 bg-teal-50 rounded-lg p-3">
                                                        <Clock className="w-4 h-4" />
                                                        Следующий визит: <strong>{new Date(c.nextVisit).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                                                    </div>
                                                )}
                                                {c.notes && <p className="text-xs text-gray-500 italic">{filterMedicalText(c.notes, session?.user?.role === 'doctor' || session?.user?.subRole === 'optic_doctor' ? 'doctor' : session?.user?.role)}</p>}
                                                <div className="flex justify-end">
                                                    <button onClick={() => handleDeleteConsult(c.id)} className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1 transition-colors">
                                                        <Trash2 className="w-3.5 h-3.5" /> Удалить запись
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Attachments Section */}
                <div id="files" className="scroll-mt-24">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Paperclip className="w-5 h-5 text-indigo-600" /> Показатели и Снимки
                            {patient.attachments && patient.attachments.length > 0 && (
                                <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{patient.attachments.length}</span>
                            )}
                        </h2>
                        <label className="btn btn-secondary btn-sm flex items-center gap-1 cursor-pointer">
                            <UploadCloud className="w-4 h-4" /> 
                            {uploadingFile ? 'Загрузка...' : 'Добавить файл'}
                            <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploadingFile} accept="image/*,application/pdf" />
                        </label>
                    </div>

                    {!patient.attachments || patient.attachments.length === 0 ? (
                        <div className="text-center py-10 bg-white rounded-xl border border-gray-200 border-dashed">
                            <UploadCloud className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-500 text-sm">Снимки с топографа, авторефрактора и другие файлы</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {patient.attachments.map(att => (
                                <div key={att.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:border-indigo-300 transition-colors group relative flex flex-col">
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 text-indigo-600">
                                            {att.type.startsWith('image/') ? <Eye className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate" title={att.name}>{att.name}</p>
                                            <p className="text-xs text-gray-500">{(att.size / 1024).toFixed(1)} KB • {new Date(att.uploadedAt).toLocaleDateString('ru-RU')}</p>
                                        </div>
                                    </div>
                                    
                                    {att.type.startsWith('image/') && (
                                        <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden mb-3 border border-gray-200">
                                            <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                                        </div>
                                    )}

                                    <div className="mt-auto flex items-center justify-between pt-2 border-t border-gray-100">
                                        <a href={att.url} download={att.name} className="text-xs text-indigo-600 font-medium flex items-center gap-1 hover:text-indigo-800">
                                            <Download className="w-3.5 h-3.5" /> Скачать
                                        </a>
                                        <button onClick={() => handleDeleteAttachment(att.id)} className="text-gray-400 hover:text-red-500 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                </div>

                    </div>
                </div>
            </div>

            {/* Modal for Invoice */}
            {showInvoiceForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowInvoiceForm(false)}>
                    <div className="bg-white rounded-3xl max-w-4xl w-full flex overflow-hidden shadow-2xl h-[80vh]" onClick={e => e.stopPropagation()}>
                        
                        {/* Left side - Products */}
                        <div className="w-1/2 md:w-2/3 border-r border-gray-100 flex flex-col bg-gray-50/50">
                            <div className="p-4 border-b border-gray-200 bg-white">
                                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <Banknote className="w-5 h-5 text-orange-500" /> Выставить счет на кассу
                                </h3>
                                <div className="relative mb-3">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input type="text" placeholder="Поиск услуг или товаров..." value={invoiceSearch} onChange={e => setInvoiceSearch(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all outline-none" />
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setInvoiceCategoryFilter('all')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${invoiceCategoryFilter === 'all' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Все</button>
                                    <button onClick={() => setInvoiceCategoryFilter('service')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${invoiceCategoryFilter === 'service' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Услуги</button>
                                    <button onClick={() => setInvoiceCategoryFilter('product')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${invoiceCategoryFilter === 'product' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Товары</button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                    {invoiceProducts.filter(p => {
                                        if (p.isActive === false) return false;
                                        if (invoiceCategoryFilter !== 'all' && p.type !== invoiceCategoryFilter) return false;
                                        return p.name.toLowerCase().includes(invoiceSearch.toLowerCase());
                                    }).map(p => (
                                        <div key={p.id} onClick={() => addToInvoiceCart(p)}
                                            className="bg-white p-3 border border-gray-200 rounded-xl hover:border-orange-400 hover:shadow-md cursor-pointer transition-all active:scale-95 group">
                                            <p className="text-sm font-bold text-gray-800 line-clamp-2 group-hover:text-orange-700 transition-colors mb-2">{p.name}</p>
                                            <div className="flex justify-between items-end">
                                                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500 font-medium">{p.type === 'service' ? 'Услуга' : 'Товар'}</span>
                                                <span className="font-bold text-gray-900">{fmt(p.retailPrice)} ₸</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right side - Cart */}
                        <div className="w-1/2 md:w-1/3 flex flex-col bg-white">
                            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                                <h4 className="font-bold text-gray-900">Выбрано</h4>
                                <button onClick={() => setShowInvoiceForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {invoiceCart.length === 0 ? (
                                    <p className="text-sm text-gray-400 text-center py-10">Добавьте услуги из списка слева</p>
                                ) : (
                                    invoiceCart.map(item => (
                                        <div key={item.productId} className="flex justify-between items-center gap-2 border-b border-gray-50 pb-3">
                                            <div className="flex-1">
                                                <p className="text-xs font-bold text-gray-800 leading-tight">{item.name}</p>
                                                <p className="text-[10px] text-gray-500 mt-0.5">{fmt(item.unitPrice)} ₸</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-0.5 border border-gray-200">
                                                    <button onClick={() => updateInvoiceCartQty(item.productId, -1)} className="w-6 h-6 flex items-center justify-center hover:bg-gray-200 rounded text-gray-600"><Minus className="w-3 h-3" /></button>
                                                    <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                                                    <button onClick={() => updateInvoiceCartQty(item.productId, 1)} className="w-6 h-6 flex items-center justify-center hover:bg-gray-200 rounded text-gray-600"><Plus className="w-3 h-3" /></button>
                                                </div>
                                                <button onClick={() => removeInvoiceCart(item.productId)} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="p-5 border-t border-gray-100 bg-gray-50 space-y-4">
                                <div className="flex justify-between items-center text-lg font-black text-gray-900">
                                    <span>Итого:</span>
                                    <span className="text-orange-600">{fmt(invoiceCart.reduce((s, i) => s + (i.unitPrice * i.quantity), 0))} ₸</span>
                                </div>
                                <button onClick={handleSubmitInvoice} disabled={invoiceCart.length === 0 || savingInvoice}
                                    className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl disabled:opacity-50 transition-all shadow-md active:scale-95">
                                    {savingInvoice ? 'Отправка...' : 'Отправить на кассу'}
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}
