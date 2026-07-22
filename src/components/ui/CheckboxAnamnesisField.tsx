import React from 'react';

interface CheckboxAnamnesisFieldProps {
    label: string;
    value: string | undefined | null;
    onChange: (val: string) => void;
    negativeLabel: string;
    positiveLabel: string;
    negativePrefix: string;
    positivePrefix: string;
}

export default function CheckboxAnamnesisField({
    label,
    value,
    onChange,
    negativeLabel,
    positiveLabel,
    negativePrefix,
    positivePrefix,
}: CheckboxAnamnesisFieldProps) {
    const isNegative = value === negativePrefix;
    const isPositive = value?.startsWith(positivePrefix);
    const positiveText = isPositive ? value!.substring(positivePrefix.length).trim() : '';

    return (
        <div className="flex flex-col sm:flex-row sm:items-center py-3 border-b border-gray-100 last:border-0 gap-2 sm:gap-4">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider w-full sm:w-1/3">{label}</span>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full sm:w-2/3">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 min-w-[120px]">
                    <input 
                        type="checkbox" 
                        checked={isNegative} 
                        onChange={(e) => {
                            if (e.target.checked) onChange(negativePrefix);
                            else onChange('');
                        }} 
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4" 
                    />
                    {negativeLabel}
                </label>
                <div className="flex items-center gap-2 flex-1 w-full">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 whitespace-nowrap min-w-[100px]">
                        <input 
                            type="checkbox" 
                            checked={isPositive} 
                            onChange={(e) => {
                                if (e.target.checked) onChange(positivePrefix + ' ');
                                else onChange('');
                            }} 
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4" 
                        />
                        {positiveLabel}
                    </label>
                    {isPositive && (
                        <input 
                            type="text" 
                            value={positiveText} 
                            onChange={e => onChange(positivePrefix + ' ' + e.target.value)} 
                            className="input text-sm flex-1 h-8 bg-gray-50 border-gray-200" 
                            placeholder="Укажите..." 
                            autoFocus
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
