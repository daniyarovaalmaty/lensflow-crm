import React from 'react';

export default function ExpiryDateBadge({ date }: { date: string | Date | null | undefined }) {
    if (!date) return <span className="text-gray-500">-</span>;
    
    const expDate = new Date(date);
    if (isNaN(expDate.getTime())) return <span className="text-gray-500">-</span>;
    
    const now = new Date();
    const diffMs = expDate.getTime() - now.getTime();
    const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.44);
    
    let badgeClass = 'bg-green-50 text-green-700 ring-green-600/20';
    if (diffMonths <= 0) badgeClass = 'bg-red-100 text-red-800 ring-red-600/30';
    else if (diffMonths <= 3) badgeClass = 'bg-red-50 text-red-700 ring-red-600/20';
    else if (diffMonths <= 6) badgeClass = 'bg-yellow-50 text-yellow-700 ring-yellow-600/20';
    
    return (
        <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${badgeClass}`}>
            {expDate.toLocaleDateString('ru-RU')}
            {diffMonths <= 0 && ' ✕'}
        </span>
    );
}
