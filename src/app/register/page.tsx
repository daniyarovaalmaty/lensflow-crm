'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RegisterUserSchema, type RegisterUserDTO, UserRoleLabels, SubRolesByRole, SubRoleLabels } from '@/types/user';
import type { SubRole } from '@/types/user';
import { UserPlus, Mail, Lock, User, Building, Phone, AlertCircle, CheckCircle } from 'lucide-react';

export default function RegisterPage() {
    const router = useRouter();
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<RegisterUserDTO>({
        resolver: zodResolver(RegisterUserSchema),
        defaultValues: {
            role: 'doctor',
            subRole: 'doctor',
        },
    });

    const selectedRole = watch('role');
    const selectedSubRole = watch('subRole');

    // Auto-set sub-role: doctor always 'doctor', optic always 'optic_manager' (only head can self-register)
    const availableSubRoles = SubRolesByRole[selectedRole] || [];
    if (selectedRole === 'doctor' && selectedSubRole !== 'doctor') {
        setValue('subRole', 'doctor');
    }
    if (selectedRole === 'optic' && selectedSubRole !== 'optic_manager') {
        setValue('subRole', 'optic_manager');
    }

    const onSubmit = async (data: RegisterUserDTO) => {
        setIsLoading(true);
        setError('');

        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (!response.ok) {
                setError(result.error || 'Ошибка при регистрации');
                return;
            }

            setSuccess(true);
            setTimeout(() => {
                router.push('/login');
            }, 2000);
        } catch (err) {
            setError('Произошла ошибка при регистрации');
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-primary-50 flex items-center justify-center p-4">
                <div className="card max-w-md text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Регистрация успешна!</h2>
                    <p className="text-gray-600 mb-4">Перенаправление на страницу входа...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-green-50 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                        <UserPlus className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Регистрация</h1>
                    <p className="text-gray-600">Создайте свою учетную запись в LensFlow CRM</p>
                </div>

                {/* Registration Form */}
                <div className="card">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                                Email *
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    id="email"
                                    type="email"
                                    {...register('email')}
                                    className="input pl-10"
                                    placeholder="your@email.com"
                                />
                            </div>
                            {errors.email && (
                                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                            )}
                        </div>

                        {/* Passwords */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Пароль *
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        id="password"
                                        type="password"
                                        {...register('password')}
                                        className="input pl-10"
                                        placeholder="••••••••"
                                    />
                                </div>
                                {errors.password && (
                                    <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Подтверждение пароля *
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        id="confirmPassword"
                                        type="password"
                                        {...register('confirmPassword')}
                                        className="input pl-10"
                                        placeholder="••••••••"
                                    />
                                </div>
                                {errors.confirmPassword && (
                                    <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                                )}
                            </div>
                        </div>

                        {/* Role Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Тип аккаунта *
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {(['doctor', 'optic'] as const).map((role) => (
                                    <label
                                        key={role}
                                        className={`
                                            p-4 border-2 rounded-lg cursor-pointer transition-all duration-ag text-center
                                            ${selectedRole === role
                                                ? 'border-primary-500 bg-primary-50'
                                                : 'border-border hover:border-border-hover'
                                            }
                                        `}
                                    >
                                        <input
                                            type="radio"
                                            value={role}
                                            {...register('role')}
                                            className="sr-only"
                                        />
                                        <p className="font-medium text-gray-900">{UserRoleLabels[role]}</p>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Sub-Role info for optic */}
                        {selectedRole === 'optic' && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                                Вы регистрируетесь как <strong>Руководитель клиники</strong>. После регистрации вы сможете добавить сотрудников (врач, бухгалтер) в разделе «Сотрудники».
                            </div>
                        )}

                        {/* Profile Fields */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1.5">
                                    {selectedRole === 'doctor' ? 'ФИО врача' : 'Название организации'} *
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        id="fullName"
                                        type="text"
                                        {...register('profile.fullName')}
                                        className="input pl-10"
                                        placeholder={selectedRole === 'doctor' ? 'Иванов Иван Иванович' : 'Название'}
                                    />
                                </div>
                                {errors.profile?.fullName && (
                                    <p className="mt-1 text-sm text-red-600">{errors.profile.fullName.message}</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Телефон
                                </label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        id="phone"
                                        type="tel"
                                        {...register('profile.phone')}
                                        className="input pl-10"
                                        placeholder="+7 900 000 00 00"
                                    />
                                </div>
                                {errors.profile?.phone && (
                                    <p className="mt-1 text-sm text-red-600">{errors.profile.phone.message}</p>
                                )}
                            </div>
                        </div>

                        {/* Role-specific fields */}
                        {selectedRole === 'doctor' && (
                            <div>
                                <label htmlFor="clinic" className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Клиника
                                </label>
                                <div className="relative">
                                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        id="clinic"
                                        type="text"
                                        {...register('profile.clinic')}
                                        className="input pl-10"
                                        placeholder="Название клиники"
                                    />
                                </div>
                            </div>
                        )}

                        {selectedRole === 'optic' && (
                            <div>
                                <label htmlFor="opticName" className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Название оптики
                                </label>
                                <div className="relative">
                                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        id="opticName"
                                        type="text"
                                        {...register('profile.opticName')}
                                        className="input pl-10"
                                        placeholder="Название салона оптики"
                                    />
                                </div>
                            </div>
                        )}

                        {selectedRole === 'laboratory' && (
                            <div>
                                <label htmlFor="labName" className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Название лаборатории
                                </label>
                                <div className="relative">
                                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        id="labName"
                                        type="text"
                                        {...register('profile.labName')}
                                        className="input pl-10"
                                        placeholder="Название производственной лаборатории"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn btn-primary w-full"
                        >
                            {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
                        </button>
                    </form>

                    {/* Login Link */}
                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600">
                            Уже есть аккаунт?{' '}
                            <a href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                                Войти
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
