'use client';

import { Gift, MessageSquareHeart, Sparkles, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function BillingPage() {
    return (
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12 animate-fade-in">
            {/* Header section */}
            <div className="text-center max-w-3xl mx-auto mb-16">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-sm mb-6">
                    <Sparkles className="w-4 h-4" /> Специальное предложение
                </div>
                <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight mb-6">
                    Тарифы и оплата
                </h1>
                <p className="text-lg text-gray-500 font-medium">
                    Мы ценим первых пользователей, которые помогают делать платформу лучше.
                </p>
            </div>

            {/* Main Offer Card */}
            <div className="max-w-4xl mx-auto relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 rounded-3xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-500" />
                <div className="relative bg-white rounded-3xl border border-gray-200/60 p-8 sm:p-12 shadow-xl overflow-hidden text-center sm:text-left flex flex-col sm:flex-row gap-8 items-center justify-between">
                    
                    {/* Background decorations */}
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-blue-50 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-violet-50 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 flex-1">
                        <div className="flex items-center gap-3 mb-4 justify-center sm:justify-start">
                            <Gift className="w-8 h-8 text-indigo-600" />
                            <h2 className="text-2xl font-black text-gray-900">Бесплатно до конца 2026 года</h2>
                        </div>
                        <p className="text-gray-600 leading-relaxed font-medium text-lg mb-6 max-w-xl">
                            Весь функционал CRM, аналитика, управление заказами и воронка продаж доступны вам абсолютно бесплатно.
                        </p>
                        
                        <div className="space-y-3 mb-8">
                            {[
                                'Безлимитное количество пользователей',
                                'Все интеграции включены',
                                'Персональная поддержка',
                                'Регулярные обновления'
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3 justify-center sm:justify-start">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                                    <span className="text-gray-700 font-semibold">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="relative z-10 bg-indigo-50/50 border border-indigo-100 rounded-2xl p-6 sm:w-80 text-center shrink-0">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                            <MessageSquareHeart className="w-8 h-8 text-indigo-600" />
                        </div>
                        <h3 className="font-bold text-gray-900 mb-2">В обмен на обратную связь</h3>
                        <p className="text-sm text-gray-600 mb-6 font-medium">
                            Мы просим только делиться с нами идеями, предложениями и сообщать об ошибках, чтобы сделать продукт идеальным для вас.
                        </p>
                        <a 
                            href="https://t.me/lensflow_support" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors shadow-sm"
                        >
                            Написать разработчикам
                        </a>
                    </div>
                </div>
            </div>
            
            <div className="mt-12 text-center">
                <Link href="/sales/dashboard" className="text-sm font-bold text-gray-400 hover:text-indigo-600 transition-colors">
                    Вернуться на главную
                </Link>
            </div>
        </div>
    );
}
