'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Key, Phone, Mail, Shield, X, Eye, EyeOff, Search, UserPlus, Trash2, Pencil
} from 'lucide-react';
import { SubRoleLabels } from '@/types/user';
import type { SubRole } from '@/types/user';
import Link from 'next/link';

interface StaffMember {
    id: string;
    email: string;
    fullName: string;
    phone: string | null;
    subRole: SubRole;
    status: string;
    createdAt: string;
}

const CLINIC_STAFF_ROLES: { value: SubRole; label: string }[] = [
    { value: 'optic_doctor', label: 'Врач' },
    { value: 'optic_accountant', label: 'Бухгалтер' },
];

export default function ClinicStaffPage() {
    const { data: session } = useSession();
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Create modal
    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState({
        email: '', password: '', fullName: '', phone: '', subRole: 'optic_doctor' as SubRole,
    });
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Edit modal
    const [editModal, setEditModal] = useState<StaffMember | null>(null);
    const [editForm, setEditForm] = useState({ fullName: '', phone: '', subRole: 'optic_doctor' as SubRole });
    const [saving, setSaving] = useState(false);
    const [editError, setEditError] = useState('');

    // Password modal
    const [passwordModal, setPasswordModal] = useState<StaffMember | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);

    useEffect(() => { loadStaff(); }, []);

    const loadStaff = async () => {
        try {
            const res = await fetch('/api/clinic-staff');
            if (res.ok) setStaff(await res.json());
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        setCreateError('');
        try {
            const res = await fetch('/api/clinic-staff', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(createForm),
            });
            if (res.ok) {
                const newUser = await res.json();
                setStaff(prev => [newUser, ...prev]);
                setShowCreate(false);
                setCreateForm({ email: '', password: '', fullName: '', phone: '', subRole: 'optic_doctor' });
            } else {
                const data = await res.json();
                setCreateError(data.error || 'Ошибка');
            }
        } catch {
            setCreateError('Ошибка сети');
        } finally {
            setCreating(false);
        }
    };

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editModal) return;
        setSaving(true);
        setEditError('');
        try {
            const res = await fetch(`/api/clinic-staff/${editModal.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm),
            });
            if (res.ok) {
                const updated = await res.json();
                setStaff(prev => prev.map(s => s.id === updated.id ? updated : s));
                setEditModal(null);
            } else {
                const data = await res.json();
                setEditError(data.error || 'Ошибка');
            }
        } catch {
            setEditError('Ошибка сети');
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (!passwordModal || !newPassword) return;
        setChangingPassword(true);
        try {
            const res = await fetch(`/api/clinic-staff/${passwordModal.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: newPassword }),
            });
            if (res.ok) {
                setPasswordModal(null);
                setNewPassword('');
                alert('Пароль успешно обновлён');
            } else {
                const data = await res.json();
                alert(data.error || 'Ошибка');
            }
        } finally {
            setChangingPassword(false);
        }
    };

    const handleDelete = async (member: StaffMember) => {
        if (member.id === session?.user?.id) return;
        if (!confirm(`Удалить сотрудника ${member.fullName}?`)) return;
        try {
            const res = await fetch(`/api/clinic-staff/${member.id}`, { method: 'DELETE' });
            if (res.ok) {
                setStaff(prev => prev.filter(s => s.id !== member.id));
            } else {
                const data = await res.json();
                alert(data.error || 'Ошибка');
            }
        } catch {
            alert('Ошибка сети');
        }
    };

    const filtered = staff.filter(s =>
        s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Check if user is optic_manager
    if (session?.user?.subRole !== 'optic_manager') {
        return (
            <div className="min-h-screen flex items-center justify-center text-gray-500">
                <p>Управление сотрудниками доступно только руководителю клиники</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                                <Users className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">Сотрудники клиники</h1>
                                <p className="text-gray-500 text-sm">{staff.length} сотрудников</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Link href="/optic/dashboard" className="btn btn-secondary text-sm">
                                ← Назад
                            </Link>
                            <button
                                onClick={() => { setShowCreate(true); setShowPassword(false); }}
                                className="btn btn-primary flex items-center gap-2"
                            >
                                <UserPlus className="w-4 h-4" />
                                Добавить
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
                {/* Search */}
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Поиск по имени или email..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="input pl-10"
                    />
                </div>

                {isLoading ? (
                    <div className="text-center py-16 text-gray-400">Загрузка...</div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600">ФИО</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Email (логин)</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Телефон</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Роль</th>
                                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Действия</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.length === 0 ? (
                                    <tr><td colSpan={5} className="text-center py-12 text-gray-400">Сотрудники не найдены</td></tr>
                                ) : filtered.map(member => (
                                    <tr key={member.id} className="hover:bg-gray-50/60 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-xs">
                                                    {member.fullName.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-medium text-gray-900">{member.fullName}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1.5 text-gray-600">
                                                <Mail className="w-3.5 h-3.5 text-gray-400" />
                                                {member.email}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1.5 text-gray-600">
                                                <Phone className="w-3.5 h-3.5 text-gray-400" />
                                                {member.phone || '—'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center gap-1 text-xs font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                                                <Shield className="w-3 h-3" />
                                                {SubRoleLabels[member.subRole] || member.subRole}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => { setEditModal(member); setEditForm({ fullName: member.fullName, phone: member.phone || '', subRole: member.subRole }); setEditError(''); }}
                                                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => { setPasswordModal(member); setNewPassword(''); setShowPassword(false); }}
                                                    className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-lg transition-colors"
                                                >
                                                    <Key className="w-3.5 h-3.5" />
                                                </button>
                                                {member.id !== session?.user?.id && (
                                                    <button
                                                        onClick={() => handleDelete(member)}
                                                        className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            <AnimatePresence>
                {showCreate && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-lg font-bold text-gray-900">Новый сотрудник</h3>
                                <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                            </div>
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ФИО *</label>
                                    <input type="text" required value={createForm.fullName} onChange={e => setCreateForm(f => ({ ...f, fullName: e.target.value }))} className="input" placeholder="Иванов Иван" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email (логин) *</label>
                                    <input type="email" required value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} className="input" placeholder="doctor@clinic.kz" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Пароль *</label>
                                    <div className="relative">
                                        <input type={showPassword ? 'text' : 'password'} required minLength={4} value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} className="input pr-10" placeholder="Минимум 4 символа" />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                                    <input type="tel" value={createForm.phone} onChange={e => setCreateForm(f => ({ ...f, phone: e.target.value }))} className="input" placeholder="+7 777 123 45 67" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Роль *</label>
                                    <select value={createForm.subRole} onChange={e => setCreateForm(f => ({ ...f, subRole: e.target.value as SubRole }))} className="input">
                                        {CLINIC_STAFF_ROLES.map(r => (<option key={r.value} value={r.value}>{r.label}</option>))}
                                    </select>
                                </div>
                                {createError && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{createError}</div>}
                                <div className="flex justify-end gap-3 pt-2">
                                    <button type="button" onClick={() => setShowCreate(false)} className="btn btn-secondary">Отмена</button>
                                    <button type="submit" disabled={creating} className="btn btn-primary">{creating ? 'Создание...' : 'Создать'}</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Edit Modal */}
            <AnimatePresence>
                {editModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-lg font-bold text-gray-900">Редактировать</h3>
                                <button onClick={() => setEditModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                            </div>
                            <p className="text-sm text-gray-400 mb-4">{editModal.email}</p>
                            <form onSubmit={handleEdit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ФИО</label>
                                    <input type="text" required value={editForm.fullName} onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))} className="input" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                                    <input type="tel" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} className="input" placeholder="+7 777 123 45 67" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Роль</label>
                                    <select value={editForm.subRole} onChange={e => setEditForm(f => ({ ...f, subRole: e.target.value as SubRole }))} className="input">
                                        <option value="optic_manager">Руководитель</option>
                                        {CLINIC_STAFF_ROLES.map(r => (<option key={r.value} value={r.value}>{r.label}</option>))}
                                    </select>
                                </div>
                                {editError && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{editError}</div>}
                                <div className="flex justify-end gap-3 pt-2">
                                    <button type="button" onClick={() => setEditModal(null)} className="btn btn-secondary">Отмена</button>
                                    <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Сохранение...' : 'Сохранить'}</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Password Modal */}
            <AnimatePresence>
                {passwordModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-lg font-bold text-gray-900">Изменить пароль</h3>
                                <button onClick={() => setPasswordModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                            </div>
                            <p className="text-sm text-gray-600 mb-4">
                                Для: <strong>{passwordModal.fullName}</strong><br />
                                <span className="text-gray-400">{passwordModal.email}</span>
                            </p>
                            <div className="relative mb-4">
                                <input type={showPassword ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Новый пароль (мин. 4)" className="input pr-10" minLength={4} />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setPasswordModal(null)} className="btn btn-secondary">Отмена</button>
                                <button onClick={handleChangePassword} disabled={changingPassword || newPassword.length < 4} className="btn btn-primary">
                                    {changingPassword ? 'Сохранение...' : 'Сохранить'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
