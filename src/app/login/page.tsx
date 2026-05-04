'use client';

import { useState, Suspense, useCallback } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginSchema, type LoginDTO } from '@/types/user';
import { LogIn, Phone, Mail, Lock, AlertCircle, MessageCircle, ArrowLeft, Shield } from 'lucide-react';

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>}>
            <LoginContent />
        </Suspense>
    );
}

type LoginMode = 'phone' | 'email';
type PhoneStep = 'enter_phone' | 'enter_code';

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [mode, setMode] = useState<LoginMode>('phone');

    // Phone OTP state
    const [phoneStep, setPhoneStep] = useState<PhoneStep>('enter_phone');
    const [phone, setPhone] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [maskedPhone, setMaskedPhone] = useState('');
    const [cooldown, setCooldown] = useState(0);

    // Email form
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginDTO>({
        resolver: zodResolver(LoginSchema),
    });

    // Redirect after login
    const redirectAfterLogin = useCallback(async () => {
        const sessionRes = await fetch('/api/auth/session');
        const session = await sessionRes.json();
        const role = session?.user?.role;
        const callbackUrl = searchParams.get('callbackUrl');

        if (callbackUrl) {
            router.push(callbackUrl);
        } else if (role === 'laboratory') {
            const subRole = session?.user?.subRole;
            router.push(subRole === 'lab_accountant' ? '/laboratory/accountant' : '/laboratory/production');
        } else if (role === 'optic' || role === 'doctor') {
            router.push('/optic/dashboard');
        } else {
            router.push('/');
        }
        router.refresh();
    }, [router, searchParams]);

    // ==================== PHONE OTP ====================
    const sendOtp = async () => {
        const digits = phone.replace(/\D/g, '');
        if (digits.length < 10) {
            setError('Введите корректный номер телефона');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'send', phone: digits }),
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Ошибка отправки кода');
                return;
            }

            setMaskedPhone(data.phone || digits);
            setPhoneStep('enter_code');

            // Start cooldown
            setCooldown(60);
            const interval = setInterval(() => {
                setCooldown(prev => {
                    if (prev <= 1) { clearInterval(interval); return 0; }
                    return prev - 1;
                });
            }, 1000);
        } catch {
            setError('Ошибка соединения');
        } finally {
            setIsLoading(false);
        }
    };

    const verifyOtp = async () => {
        if (otpCode.length !== 4) {
            setError('Введите 4-значный код');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // Step 1: Verify OTP code
            const digits = phone.replace(/\D/g, '');
            const verifyRes = await fetch('/api/auth/otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'verify', phone: digits, code: otpCode }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
                setError(verifyData.error || 'Неверный код');
                return;
            }

            // Step 2: Sign in via NextAuth with verified phone
            const result = await signIn('credentials', {
                phone: digits,
                otp_verified: 'true',
                redirect: false,
            });

            if (result?.error) {
                setError('Ошибка авторизации. Попробуйте позже.');
                return;
            }

            await redirectAfterLogin();
        } catch {
            setError('Произошла ошибка');
        } finally {
            setIsLoading(false);
        }
    };

    // ==================== EMAIL PASSWORD ====================
    const onEmailSubmit = async (data: LoginDTO) => {
        setIsLoading(true);
        setError('');

        try {
            const result = await signIn('credentials', {
                email: data.email,
                password: data.password,
                redirect: false,
            });

            if (result?.error) {
                setError('Неверный email или пароль');
                return;
            }

            await redirectAfterLogin();
        } catch {
            setError('Произошла ошибка при входе');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-green-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo/Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                        <LogIn className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">LensFlow CRM</h1>
                    <p className="text-gray-600">Войдите в свою учетную запись</p>
                </div>

                {/* Login Card */}
                <div className="card">
                    {/* Mode Tabs */}
                    <div className="flex rounded-xl bg-gray-100 p-1 mb-6">
                        <button
                            type="button"
                            onClick={() => { setMode('phone'); setError(''); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                                mode === 'phone' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <Phone className="w-4 h-4" />
                            По телефону
                        </button>
                        <button
                            type="button"
                            onClick={() => { setMode('email'); setError(''); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                                mode === 'email' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <Mail className="w-4 h-4" />
                            По email
                        </button>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    {/* ==================== PHONE MODE ==================== */}
                    {mode === 'phone' && (
                        <div className="space-y-6">
                            {phoneStep === 'enter_phone' ? (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Номер телефона
                                        </label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <input
                                                type="tel"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                className="input pl-10"
                                                placeholder="+7 (700) 123-45-67"
                                                autoComplete="tel"
                                                autoFocus
                                            />
                                        </div>
                                        <p className="mt-1.5 text-xs text-gray-500 flex items-center gap-1">
                                            <MessageCircle className="w-3.5 h-3.5 text-green-500" />
                                            Код придёт в WhatsApp
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={sendOtp}
                                        disabled={isLoading}
                                        className="btn btn-primary w-full"
                                    >
                                        {isLoading ? 'Отправка...' : 'Получить код'}
                                    </button>
                                </>
                            ) : (
                                <>
                                    {/* Back button */}
                                    <button
                                        type="button"
                                        onClick={() => { setPhoneStep('enter_phone'); setOtpCode(''); setError(''); }}
                                        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors mb-2"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                        Изменить номер
                                    </button>

                                    <div className="text-center p-4 bg-green-50 border border-green-200 rounded-xl mb-4">
                                        <Shield className="w-8 h-8 text-green-600 mx-auto mb-2" />
                                        <p className="text-sm text-green-800 font-medium">
                                            Код отправлен в WhatsApp
                                        </p>
                                        <p className="text-xs text-green-600 mt-1">{maskedPhone}</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Введите код из WhatsApp
                                        </label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={4}
                                            value={otpCode}
                                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                            className="input text-center text-2xl font-bold tracking-[0.5em]"
                                            placeholder="• • • •"
                                            autoFocus
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        onClick={verifyOtp}
                                        disabled={isLoading || otpCode.length !== 4}
                                        className="btn btn-primary w-full"
                                    >
                                        {isLoading ? 'Проверка...' : 'Войти'}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={sendOtp}
                                        disabled={cooldown > 0 || isLoading}
                                        className="w-full text-center text-sm text-gray-500 hover:text-primary-600 transition-colors disabled:opacity-40"
                                    >
                                        {cooldown > 0 ? `Отправить повторно через ${cooldown}с` : 'Отправить код повторно'}
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {/* ==================== EMAIL MODE ==================== */}
                    {mode === 'email' && (
                        <form onSubmit={handleSubmit(onEmailSubmit)} className="space-y-6">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Email
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        id="email"
                                        type="email"
                                        {...register('email')}
                                        className="input pl-10"
                                        placeholder="doctor@lensflow.ru"
                                        autoComplete="off"
                                    />
                                </div>
                                {errors.email && (
                                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Пароль
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        id="password"
                                        type="password"
                                        {...register('password')}
                                        className="input pl-10"
                                        placeholder="••••••••"
                                        autoComplete="off"
                                    />
                                </div>
                                {errors.password && (
                                    <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="btn btn-primary w-full"
                            >
                                {isLoading ? 'Вход...' : 'Войти'}
                            </button>
                        </form>
                    )}

                    {/* Footer links */}
                    <div className="mt-6 text-center space-y-3">
                        <a
                            href="/"
                            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 transition-colors font-medium"
                        >
                            ← На главную
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
