'use client';

import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function AccessDenied() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 max-w-md w-full p-8 text-center"
            >
                {/* Gradient Icon Container */}
                <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/20 mb-6">
                    <ShieldAlert className="w-8 h-8 text-white animate-pulse" />
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">
                    Доступ ограничен
                </h1>

                <p className="text-gray-500 text-sm leading-relaxed mb-8">
                    У вас нет прав для просмотра этого раздела. Доступ к данному модулю был временно или постоянно отключен руководителем вашей клиники в настройках прав сотрудников.
                </p>

                <div className="space-y-3">
                    <Link
                        href="/optic/dashboard"
                        className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-2xl shadow-md shadow-blue-500/10 hover:shadow-lg transition-all active:scale-[0.98] group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                        Вернуться на главную
                    </Link>

                    <p className="text-xs text-gray-400">
                        Если это ошибка, пожалуйста, обратитесь к руководителю клиники.
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
