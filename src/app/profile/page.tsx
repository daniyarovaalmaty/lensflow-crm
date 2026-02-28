'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Camera, Save, ArrowLeft, User, Mail, Phone, Building2, Shield, Check } from 'lucide-react';
import PhoneInput from '@/components/ui/PhoneInput';
import { SubRoleLabels } from '@/types/user';
import type { SubRole } from '@/types/user';

interface ProfileData {
    id: string;
    email: string;
    fullName: string;
    phone: string | null;
    avatar: string | null;
    role: string;
    subRole: string;
    organization: { name: string } | null;
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

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/profile');
                if (res.ok) {
                    const data = await res.json();
                    setProfile(data);
                    setFullName(data.fullName || '');
                    setPhone(data.phone || '');
                    setAvatarPreview(data.avatar || null);
                }
            } catch (e) { console.error(e); }
            finally { setIsLoading(false); }
        })();
    }, []);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Limit to 500KB
        if (file.size > 512_000) {
            alert('Файл слишком большой. Максимум 500КБ.');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            // Resize to 200x200
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const size = 200;
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d')!;

                // Crop to square center
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
                return session.user.subRole === 'lab_head'
                    ? '/laboratory/dashboard'
                    : '/laboratory/production';
            case 'optic':
            case 'doctor':
                return '/optic/dashboard';
            default:
                return '/';
        }
    };

    const initials = fullName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(w => w[0]?.toUpperCase())
        .join('');

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
                    <button
                        onClick={() => router.push(getBackPath())}
                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-4 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Назад
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
                                <img
                                    src={avatarPreview}
                                    alt="Аватар"
                                    className="w-24 h-24 rounded-2xl object-cover border-2 border-gray-200"
                                />
                            ) : (
                                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                                    {initials || <User className="w-8 h-8" />}
                                </div>
                            )}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute -bottom-2 -right-2 w-9 h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center shadow-lg transition-colors"
                            >
                                <Camera className="w-4 h-4" />
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={handleAvatarChange}
                            />
                        </div>
                        <div>
                            <p className="text-sm text-gray-700 font-medium">Загрузите фото</p>
                            <p className="text-xs text-gray-400 mt-1">JPG, PNG или WebP, максимум 500КБ</p>
                            {avatarPreview && (
                                <button
                                    onClick={() => { setAvatarPreview(null); setAvatarFile(null); }}
                                    className="text-xs text-red-500 hover:text-red-600 mt-2 font-medium"
                                >
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
                                <User className="w-4 h-4 text-gray-400" />
                                ФИО
                            </label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={e => setFullName(e.target.value)}
                                placeholder="Фамилия Имя Отчество"
                                className="input w-full"
                            />
                        </div>
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                                <Phone className="w-4 h-4 text-gray-400" />
                                Телефон
                            </label>
                            <PhoneInput value={phone} onChange={setPhone} />
                        </div>
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                                <Mail className="w-4 h-4 text-gray-400" />
                                Email
                            </label>
                            <input
                                type="email"
                                value={profile?.email || ''}
                                disabled
                                className="input w-full bg-gray-50 text-gray-500 cursor-not-allowed"
                            />
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
                                <Shield className="w-4 h-4 text-gray-400" />
                                Роль
                            </label>
                            <div className="input bg-gray-50 text-gray-600 cursor-not-allowed">
                                {SubRoleLabels[(profile?.subRole || 'optic_manager') as SubRole]}
                            </div>
                        </div>
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                                <Building2 className="w-4 h-4 text-gray-400" />
                                Организация
                            </label>
                            <div className="input bg-gray-50 text-gray-600 cursor-not-allowed">
                                {profile?.organization?.name || '—'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex items-center justify-end gap-3">
                    {saved && (
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                            <Check className="w-4 h-4" />
                            Сохранено
                        </span>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="btn btn-primary gap-2 px-6"
                    >
                        {isSaving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Сохранение...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Сохранить
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
