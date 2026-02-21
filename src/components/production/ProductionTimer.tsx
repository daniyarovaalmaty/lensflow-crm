'use client';

import { useState, useEffect } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface ProductionTimerProps {
    startTime: string;
}

export function ProductionTimer({ startTime }: ProductionTimerProps) {
    const [elapsed, setElapsed] = useState('');
    const [color, setColor] = useState('text-green-600');

    useEffect(() => {
        const updateTimer = () => {
            const start = new Date(startTime);
            const now = new Date();
            const diffMs = now.getTime() - start.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);

            // Update time display
            setElapsed(formatDistanceToNow(start, { locale: ru, addSuffix: false }));

            // Color coding based on SLA
            if (diffHours < 2) {
                setColor('text-green-600');
            } else if (diffHours < 4) {
                setColor('text-yellow-600');
            } else {
                setColor('text-red-600');
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 60000); // Update every minute

        return () => clearInterval(interval);
    }, [startTime]);

    return (
        <div className={`flex items-center gap-2 text-xs font-medium ${color}`}>
            <svg className="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            <span>Производство: {elapsed}</span>
        </div>
    );
}
