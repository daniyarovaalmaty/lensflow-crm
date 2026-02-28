'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Plus, Key, Phone, Mail, Shield, X, Eye, EyeOff, Search, UserPlus, Trash2
} from 'lucide-react';
import { SubRoleLabels } from '@/types/user';
import type { SubRole } from '@/types/user';

interface StaffMember {
    id: string;
    email: string;
    fullName: string;
    phone: string | null;
    subRole: SubRole;
    status: string;
    createdAt: string;
}

const LAB_SUB_ROLES: { value: SubRole; label: string }[] = [
    { value: 'lab_head', label: 'Руководитель' },
    { value: 'lab_admin', label: 'Администратор' },
    { value: 'lab_engineer', label: 'Инженер' },
    { value: 'lab_quality', label: 'Контроль качества' },
    { value: 'lab_logistics', label: 'Логист' },
    { value: 'lab_accountant', label: 'Бухгалтер' },
];

export default function StaffPage() {
    const { data: session } = useSession();
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Create user modal
    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState({
        email: '', password: '', fullName: '', phone: '', subRole: 'lab_engineer' as SubRole,
    });
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');

    // Password change modal
    const [passwordModal, setPasswordModal] = useState<StaffMember | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);

    useEffect(() => { loadStaff(); }, []);

    const loadStaff = async () => {
        try {
            const res = await fetch('/api/staff');
            if (res.ok) setStaff(await res.json());
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        setCreateError('');
        try {
            const res = await fetch('/api/staff', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(createForm),
            });
            if (res.ok) {
                const newUser = await res.json();
                setStaff(prev => [newUser, ...prev]);
                setShowCreate(false);
                setCreateForm({ email: '', password: '', fullName: '', phone: '', subRole: 'lab_engineer' });
            } else {
                const data = await res.json();
                setCreateError(data.error || 'Ошибка при создании');
            }
        } catch {
            setCreateError('Ошибка сети');
        } finally {
            setCreating(false);
        }
    };

    const handleChangePassword = async () => {
        if (!passwordModal || !newPassword) return;
        setChangingPassword(true);
        try {
            const res = await fetch(`/api/staff/${passwordModal.id}`, {
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
        if (member.id === session?.user?.id) {
            alert('Нельзя удалить самого себя');
            return;
        }
        if (!confirm(`Удалить сотрудника ${member.fullName}?`)) return;
        try {
            const res = await fetch(`/api/staff/${member.id}`, { method: 'DELETE' });
            if (res.ok) {
                setStaff(prev => prev.filter(s => s.id !== member.id));
            } else {
                const data = await res.json();
                alert(data.error || 'Ошибка при удалении');
            }
        } catch {
            alert('Ошибка сети');
        }
    };

    const filtered = staff.filter(s =>
        s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-surface">
            {/* Header */}
            <div className="bg-surface-elevated border-b border-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                                <Users className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Сотрудники</h1>
                                <p className="text-gray-500 text-sm">{staff.length} сотрудников</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowCreate(true)}
                            className="btn btn-primary flex items-center gap-2"
                        >
                            <UserPlus className="w-4 h-4" />
                            Добавить сотрудника
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
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

                {/* Staff table */}
                {isLoading ? (
                    <div className="text-center py-16 text-gray-400">Загрузка...</div>
                ) : (
                    <div className="card overflow-hidden p-0">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600">ФИО</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Email (логин)</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Телефон</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Роль</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Дата создания</th>
                                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Действия</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-12 text-gray-400">
                                            Сотрудники не найдены
                                        </td>
                                    </tr>
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
                                        <td className="px-4 py-3 text-gray-500 text-xs">
                                            {new Date(member.createdAt).toLocaleDateString('ru-RU')}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => { setPasswordModal(member); setNewPassword(''); setShowPassword(false); }}
                                                    className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors"
                                                >
                                                    <Key className="w-3.5 h-3.5" />
                                                    Пароль
                                                </button>
                                                {member.id !== session?.user?.id && (
                                                    <button
                                                        onClick={() => handleDelete(member)}
                                                        className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                        Удалить
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

            {/* Create User Modal */}
            <AnimatePresence>
                {showCreate && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6"
                        >
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-lg font-bold text-gray-900">Новый сотрудник</h3>
                                <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleCreateUser} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ФИО *</label>
                                    <input
                                        type="text"
                                        required
                                        value={createForm.fullName}
                                        onChange={e => setCreateForm(f => ({ ...f, fullName: e.target.value }))}
                                        className="input"
                                        placeholder="Иванов Иван"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email (логин) *</label>
                                    <input
                                        type="email"
                                        required
                                        value={createForm.email}
                                        onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                                        className="input"
                                        placeholder="engineer@lab.kz"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Пароль *</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            minLength={4}
                                            value={createForm.password}
                                            onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                                            className="input pr-10"
                                            placeholder="Минимум 4 символа"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                                    <input
                                        type="tel"
                                        value={createForm.phone}
                                        onChange={e => setCreateForm(f => ({ ...f, phone: e.target.value }))}
                                        className="input"
                                        placeholder="+7 777 123 45 67"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Роль *</label>
                                    <select
                                        value={createForm.subRole}
                                        onChange={e => setCreateForm(f => ({ ...f, subRole: e.target.value as SubRole }))}
                                        className="input"
                                    >
                                        {LAB_SUB_ROLES.map(r => (
                                            <option key={r.value} value={r.value}>{r.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {createError && (
                                    <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{createError}</div>
                                )}

                                <div className="flex justify-end gap-3 pt-2">
                                    <button type="button" onClick={() => setShowCreate(false)} className="btn btn-secondary">
                                        Отмена
                                    </button>
                                    <button type="submit" disabled={creating} className="btn btn-primary">
                                        {creating ? 'Создание...' : 'Создать'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Password Change Modal */}
            <AnimatePresence>
                {passwordModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6"
                        >
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-lg font-bold text-gray-900">Изменить пароль</h3>
                                <button onClick={() => setPasswordModal(null)} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <p className="text-sm text-gray-600 mb-4">
                                Для сотрудника: <span className="font-semibold">{passwordModal.fullName}</span>
                                <br />
                                <span className="text-gray-400">{passwordModal.email}</span>
                            </p>
                            <div className="relative mb-4">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    placeholder="Новый пароль (мин. 4 символа)"
                                    className="input pr-10"
                                    minLength={4}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setPasswordModal(null)} className="btn btn-secondary">
                                    Отмена
                                </button>
                                <button
                                    onClick={handleChangePassword}
                                    disabled={changingPassword || newPassword.length < 4}
                                    className="btn btn-primary"
                                >
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
