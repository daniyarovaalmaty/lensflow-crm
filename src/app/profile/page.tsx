'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
    Camera, Save, ArrowLeft, User, Mail, Phone, Building2, Shield, Check,
    MapPin, CreditCard, Landmark, UserCheck, Truck
} from 'lucide-react';
import PhoneInput from '@/components/ui/PhoneInput';
import { SubRoleLabels } from '@/types/user';
import type { SubRole } from '@/types/user';

interface OrgData {
    id: string;
    name: string;
    inn: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    city: string | null;
    actualAddress: string | null;
    deliveryAddress: string | null;
    bankName: string | null;
    bik: string | null;
    iban: string | null;
    directorName: string | null;
    contactPerson: string | null;
    contactPhone: string | null;
}

interface ProfileData {
    id: string;
    email: string;
    fullName: string;
    phone: string | null;
    avatar: string | null;
    role: string;
    subRole: string;
    organization: OrgData | null;
}

export default function ProfilePage() {
    const { data: session } = useSession();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [avatarFile, setAvatarFile] = useState<string | null>(null);

    // Organization fields
    const [org, setOrg] = useState({
        name: '', inn: '', phone: '', email: '', address: '', city: '',
        actualAddress: '', deliveryAddress: '', bankName: '', bik: '',
        iban: '', directorName: '', contactPerson: '', contactPhone: '',
    });

    const isManager = session?.user?.subRole === 'optic_manager';
    const hasOrg = session?.user?.role === 'optic';

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/profile');
                if (res.ok) {
                    const data: ProfileData = await res.json();
                    setProfile(data);
                    setFullName(data.fullName || '');
                    setPhone(data.phone || '');
                    setAvatarPreview(data.avatar || null);
                    if (data.organization) {
                        setOrg({
                            name: data.organization.name || '',
                            inn: data.organization.inn || '',
                            phone: data.organization.phone || '',
                            email: data.organization.email || '',
                            address: data.organization.address || '',
                            city: data.organization.city || '',
                            actualAddress: data.organization.actualAddress || '',
                            deliveryAddress: data.organization.deliveryAddress || '',
                            bankName: data.organization.bankName || '',
                            bik: data.organization.bik || '',
                            iban: data.organization.iban || '',
                            directorName: data.organization.directorName || '',
                            contactPerson: data.organization.contactPerson || '',
                            contactPhone: data.organization.contactPhone || '',
                        });
                    }
                }
            } catch (e) { console.error(e); }
            finally { setIsLoading(false); }
        })();
    }, []);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2_097_152) { alert('Файл слишком большой. Максимум 2МБ.'); return; }
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const size = 200;
                canvas.width = size; canvas.height = size;
                const ctx = canvas.getContext('2d')!;
                const minDim = Math.min(img.width, img.height);
                const sx = (img.width - minDim) / 2;
                const sy = (img.height - minDim) / 2;
                ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                setAvatarPreview(dataUrl);
                setAvatarFile(dataUrl);
            };
            img.src = result;
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        setIsSaving(true);
        setSaved(false);
        try {
            const body: any = { fullName, phone };
            if (avatarFile !== null) body.avatar = avatarFile;
            if (isManager && hasOrg) body.organization = org;

            const res = await fetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (res.ok) {
                const data = await res.json();
                setProfile(prev => prev ? { ...prev, ...data } : prev);
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
            }
        } catch (e) { console.error(e); }
        finally { setIsSaving(false); }
    };

    const getBackPath = () => {
        if (!session?.user?.role) return '/';
        switch (session.user.role) {
            case 'laboratory':
                return session.user.subRole === 'lab_head' ? '/laboratory/dashboard' : '/laboratory/production';
            case 'optic': case 'doctor': return '/optic/dashboard';
            default: return '/';
        }
    };

    const initials = fullName.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('');

    if (isLoading) {
        return (
            <div className="min-h-screen bg-surface flex items-center justify-center">
                <div className="text-center">
                    <div className="skeleton w-12 h-12 rounded-full mx-auto mb-4" />
                    <p className="text-gray-600">Загрузка...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-surface">
            {/* Header */}
            <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white">
                <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
                    <button onClick={() => router.push(getBackPath())} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-4 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Назад
                    </button>
                    <h1 className="text-2xl font-bold">Настройки профиля</h1>
                    <p className="text-gray-400 mt-1">Управление личной информацией</p>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
                {/* Avatar Section */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Фото профиля</h3>
                    <div className="flex items-center gap-6">
                        <div className="relative group">
                            {avatarPreview ? (
                                <img src={avatarPreview} alt="Аватар" className="w-24 h-24 rounded-2xl object-cover border-2 border-gray-200" />
                            ) : (
                                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                                    {initials || <User className="w-8 h-8" />}
                                </div>
                            )}
                            <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-2 -right-2 w-9 h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center shadow-lg transition-colors">
                                <Camera className="w-4 h-4" />
                            </button>
                            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-700 font-medium">Загрузите фото</p>
                            <p className="text-xs text-gray-400 mt-1">JPG, PNG или WebP, максимум 2МБ</p>
                            {avatarPreview && (
                                <button onClick={() => { setAvatarPreview(null); setAvatarFile(null); }} className="text-xs text-red-500 hover:text-red-600 mt-2 font-medium">
                                    Удалить фото
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Personal Info */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Личная информация</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                                <User className="w-4 h-4 text-gray-400" /> ФИО
                            </label>
                            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Фамилия Имя Отчество" className="input w-full" />
                        </div>
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                                <Phone className="w-4 h-4 text-gray-400" /> Телефон
                            </label>
                            <PhoneInput value={phone} onChange={setPhone} />
                        </div>
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                                <Mail className="w-4 h-4 text-gray-400" /> Email
                            </label>
                            <input type="email" value={profile?.email || ''} disabled className="input w-full bg-gray-50 text-gray-500 cursor-not-allowed" />
                            <p className="text-xs text-gray-400 mt-1">Email нельзя изменить</p>
                        </div>
                    </div>
                </div>

                {/* Role Info (read-only) */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Роль и организация</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                                <Shield className="w-4 h-4 text-gray-400" /> Роль
                            </label>
                            <div className="input bg-gray-50 text-gray-600 cursor-not-allowed">
                                {SubRoleLabels[(profile?.subRole || 'optic_manager') as SubRole]}
                            </div>
                        </div>
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                                <Building2 className="w-4 h-4 text-gray-400" /> Организация
                            </label>
                            <div className="input bg-gray-50 text-gray-600 cursor-not-allowed">
                                {profile?.organization?.name || '—'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Organization Details — editable for optic_manager */}
                {hasOrg && profile?.organization && (
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                        <h3 className="text-base font-semibold text-gray-900 mb-1">Реквизиты организации</h3>
                        <p className="text-xs text-gray-400 mb-5">Эти данные будут использоваться в заказах и документах</p>

                        <div className="space-y-5">
                            {/* БИН / Основные */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field icon={<Building2 className="w-4 h-4" />} label="Название организации" value={org.name} onChange={v => setOrg(o => ({ ...o, name: v }))} disabled={!isManager} />
                                <Field icon={<CreditCard className="w-4 h-4" />} label="БИН / ИИН" value={org.inn} onChange={v => setOrg(o => ({ ...o, inn: v }))} placeholder="123456789012" disabled={!isManager} />
                            </div>

                            {/* Руководитель */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field icon={<UserCheck className="w-4 h-4" />} label="ФИО руководителя" value={org.directorName} onChange={v => setOrg(o => ({ ...o, directorName: v }))} disabled={!isManager} />
                                <Field icon={<Phone className="w-4 h-4" />} label="Телефон организации" value={org.phone} onChange={v => setOrg(o => ({ ...o, phone: v }))} placeholder="+7 777 123 45 67" disabled={!isManager} />
                            </div>

                            {/* Email / City */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field icon={<Mail className="w-4 h-4" />} label="Email организации" value={org.email} onChange={v => setOrg(o => ({ ...o, email: v }))} placeholder="info@company.kz" disabled={!isManager} />
                                <Field icon={<MapPin className="w-4 h-4" />} label="Город" value={org.city} onChange={v => setOrg(o => ({ ...o, city: v }))} placeholder="Алматы" disabled={!isManager} />
                            </div>

                            {/* Адреса */}
                            <div>
                                <Field icon={<MapPin className="w-4 h-4" />} label="Юридический адрес" value={org.address} onChange={v => setOrg(o => ({ ...o, address: v }))} placeholder="ул. Абая, д. 10, оф. 5" disabled={!isManager} />
                            </div>
                            <div>
                                <Field icon={<MapPin className="w-4 h-4" />} label="Фактический адрес" value={org.actualAddress} onChange={v => setOrg(o => ({ ...o, actualAddress: v }))} placeholder="Если отличается от юридического" disabled={!isManager} />
                            </div>
                            <div>
                                <Field icon={<Truck className="w-4 h-4" />} label="Адрес доставки" value={org.deliveryAddress} onChange={v => setOrg(o => ({ ...o, deliveryAddress: v }))} placeholder="Адрес для доставки заказов" disabled={!isManager} />
                            </div>

                            {/* Банковские реквизиты */}
                            <div className="pt-2 border-t border-gray-100">
                                <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <Landmark className="w-4 h-4 text-gray-400" /> Банковские реквизиты
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field label="Название банка" value={org.bankName} onChange={v => setOrg(o => ({ ...o, bankName: v }))} placeholder="АО Каспи Банк" disabled={!isManager} />
                                    <Field label="БИК" value={org.bik} onChange={v => setOrg(o => ({ ...o, bik: v }))} placeholder="CASPKZKA" disabled={!isManager} />
                                </div>
                                <div className="mt-4">
                                    <Field label="IBAN / Расчётный счёт" value={org.iban} onChange={v => setOrg(o => ({ ...o, iban: v }))} placeholder="KZ00..." disabled={!isManager} />
                                </div>
                            </div>

                            {/* Контактное лицо */}
                            <div className="pt-2 border-t border-gray-100">
                                <p className="text-sm font-semibold text-gray-700 mb-3">Контактное лицо</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field label="ФИО контактного лица" value={org.contactPerson} onChange={v => setOrg(o => ({ ...o, contactPerson: v }))} disabled={!isManager} />
                                    <Field label="Телефон контактного лица" value={org.contactPhone} onChange={v => setOrg(o => ({ ...o, contactPhone: v }))} placeholder="+7 777 123 45 67" disabled={!isManager} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Save Button */}
                <div className="flex items-center justify-end gap-3">
                    {saved && (
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                            <Check className="w-4 h-4" /> Сохранено
                        </span>
                    )}
                    <button onClick={handleSave} disabled={isSaving} className="btn btn-primary gap-2 px-6">
                        {isSaving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Сохранение...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" /> Сохранить
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Reusable field component
function Field({ icon, label, value, onChange, placeholder, disabled }: {
    icon?: React.ReactNode; label: string; value: string;
    onChange: (v: string) => void; placeholder?: string; disabled?: boolean;
}) {
    return (
        <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                {icon && <span className="text-gray-400">{icon}</span>}
                {label}
            </label>
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                className={`input w-full ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}
            />
        </div>
    );
}
