'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Rocket, Eye, Factory, Stethoscope, Shield, CheckCircle, Calculator, Briefcase, Users } from 'lucide-react';

interface DemoAccount {
    key: string;
    label: string;
    description: string;
    email: string;
    password: string;
    redirect: string;
    icon: any;
}

const DEMO_GROUPS = [
    {
        title: 'Лаборатория',
        subtitle: 'Производственный хаб',
        color: 'from-green-500 to-emerald-600',
        hoverColor: 'hover:from-green-600 hover:to-emerald-700',
        accounts: [
            {
                key: 'lab_engineer',
                label: 'Инженер',
                description: 'Kanban, смена статусов, печать',
                email: 'engineer@lensflow.ru',
                password: 'password123',
                redirect: '/laboratory/production',
                icon: Factory,
            },
            {
                key: 'lab_quality',
                label: 'Контроль качества',
                description: 'Проверка, добавление браков',
                email: 'quality@lensflow.ru',
                password: 'password123',
                redirect: '/laboratory/production',
                icon: CheckCircle,
            },
            {
                key: 'lab_admin',
                label: 'Администратор',
                description: 'Полный доступ, браки, отгрузка',
                email: 'lab@lensflow.ru',
                password: 'password123',
                redirect: '/laboratory/production',
                icon: Shield,
            },
            {
                key: 'lab_accountant',
                label: 'Бухгалтер',
                description: 'Просмотр оплат',
                email: 'lab-buh@lensflow.ru',
                password: 'password123',
                redirect: '/laboratory/production',
                icon: Calculator,
            },
        ],
    },
    {
        title: 'Клиника / Оптика',
        subtitle: 'Дашборд заказов',
        color: 'from-primary-500 to-primary-600',
        hoverColor: 'hover:from-primary-600 hover:to-primary-700',
        accounts: [
            {
                key: 'optic_manager',
                label: 'Руководитель',
                description: 'Все заказы, оплаты, статистика',
                email: 'optic@lensflow.ru',
                password: 'password123',
                redirect: '/optic/dashboard',
                icon: Briefcase,
            },
            {
                key: 'optic_doctor',
                label: 'Врач клиники',
                description: 'Создание заказов, свои пациенты',
                email: 'optic-doc@lensflow.ru',
                password: 'password123',
                redirect: '/optic/dashboard',
                icon: Stethoscope,
            },
            {
                key: 'optic_accountant',
                label: 'Бухгалтер',
                description: 'Документы по оплатам',
                email: 'optic-buh@lensflow.ru',
                password: 'password123',
                redirect: '/optic/dashboard',
                icon: Calculator,
            },
        ],
    },
    {
        title: 'Врач',
        subtitle: 'Независимая практика',
        color: 'from-blue-500 to-blue-600',
        hoverColor: 'hover:from-blue-600 hover:to-blue-700',
        accounts: [
            {
                key: 'doctor',
                label: 'Врач',
                description: 'Воронка пациентов, заказы',
                email: 'doctor@lensflow.ru',
                password: 'password123',
                redirect: '/optic/dashboard',
                icon: Stethoscope,
            },
        ],
    },
];

export default function DemoPage() {
    const router = useRouter();
    const [loadingKey, setLoadingKey] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('');

    const handleDemoLogin = async (account: DemoAccount) => {
        setLoadingKey(account.key);
        setError('');
        setStatus('Создаём тестовые заказы...');

        try {
            // 1. Seed demo orders
            await fetch('/api/demo/seed', { method: 'POST' });

            setStatus('Выполняется вход...');

            // 2. Sign in
            const result = await signIn('credentials', {
                email: account.email,
                password: account.password,
                redirect: false,
            });

            if (result?.error) {
                setError('Не удалось войти. Попробуйте ещё раз.');
                setLoadingKey(null);
                setStatus('');
                return;
            }

            setStatus('Перенаправляем...');
            router.push(account.redirect);
            router.refresh();
        } catch (err) {
            setError('Произошла ошибка при входе');
            setLoadingKey(null);
            setStatus('');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-primary-50 flex items-center justify-center p-4">
            <div className="w-full max-w-3xl">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
                        <Rocket className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Демо-версия</h1>
                    <p className="text-gray-600">
                        Выберите роль для быстрого входа с тестовыми данными
                    </p>
                </div>

                {/* Error */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-center">
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                {/* Status */}
                {status && (
                    <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                        <p className="text-sm text-blue-700 flex items-center justify-center gap-2">
                            <span className="w-4 h-4 border-2 border-blue-400 border-t-blue-700 rounded-full animate-spin inline-block" />
                            {status}
                        </p>
                    </div>
                )}

                {/* Demo Groups */}
                <div className="space-y-8">
                    {DEMO_GROUPS.map((group) => (
                        <div key={group.title}>
                            {/* Group Header */}
                            <div className="mb-3">
                                <h2 className="text-lg font-bold text-gray-900">{group.title}</h2>
                                <p className="text-sm text-gray-500">{group.subtitle}</p>
                            </div>

                            {/* Account Buttons */}
                            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(group.accounts.length, 2)}, 1fr)` }}>
                                {group.accounts.map((account) => {
                                    const Icon = account.icon;
                                    const isLoading = loadingKey === account.key;

                                    return (
                                        <button
                                            key={account.key}
                                            onClick={() => handleDemoLogin(account)}
                                            disabled={loadingKey !== null}
                                            className={`
                                                p-4 rounded-xl text-white font-medium
                                                bg-gradient-to-r ${group.color} ${group.hoverColor}
                                                shadow-md hover:shadow-lg
                                                transition-all duration-200
                                                disabled:opacity-60 disabled:cursor-not-allowed
                                                flex items-center gap-3 text-left
                                            `}
                                        >
                                            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm">{account.label}</p>
                                                <p className="text-xs text-white/80 truncate">{account.description}</p>
                                            </div>
                                            <div className="flex-shrink-0">
                                                {isLoading ? (
                                                    <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Info */}
                <div className="mt-8 p-4 bg-white/60 border border-gray-200 rounded-xl">
                    <p className="text-xs text-gray-500 text-center">
                        🔑 При входе автоматически создаются 5 тестовых заказов в разных статусах.
                        Пароль для всех: <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">password123</code>
                    </p>
                </div>

                {/* Back to home */}
                <div className="mt-6 text-center">
                    <a
                        href="/"
                        className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        ← Вернуться на главную
                    </a>
                </div>
            </div>
        </div>
    );
}
