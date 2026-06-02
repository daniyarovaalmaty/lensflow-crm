'use client';

import { useEffect } from 'react';

export default function LaboratoryError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Laboratory page error:', error);
    }, [error]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-red-100 p-8 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">⚠️</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Произошла ошибка</h2>
                <p className="text-sm text-gray-500 mb-2">
                    При загрузке страницы произошла непредвиденная ошибка.
                </p>
                <pre className="text-xs text-red-600 bg-red-50 rounded-xl p-3 mb-4 overflow-auto text-left max-h-40">
                    {error.message}
                </pre>
                <button
                    onClick={reset}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all"
                >
                    Попробовать снова
                </button>
            </div>
        </div>
    );
}
