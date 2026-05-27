'use client';

import { useState, useEffect } from 'react';
import { Maximize, Minimize } from 'lucide-react';

export default function FullscreenButton({ className = '' }: { className?: string }) {
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    const toggle = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    return (
        <button
            onClick={toggle}
            title={isFullscreen ? 'Выйти из полноэкранного' : 'Полный экран'}
            className={`flex items-center justify-center p-2.5 bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:text-gray-900 rounded-2xl transition-all active:scale-95 shadow-sm ${className}`}
        >
            {isFullscreen
                ? <Minimize className="w-4 h-4 md:w-5 md:h-5 text-gray-500" />
                : <Maximize className="w-4 h-4 md:w-5 md:h-5 text-gray-500" />
            }
        </button>
    );
}
