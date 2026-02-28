'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface Country {
    code: string;
    name: string;
    dial: string;
    flag: string;
    mask: string; // # = digit
}

const countries: Country[] = [
    { code: 'KZ', name: 'Казахстан', dial: '+7', flag: '🇰🇿', mask: '(###) ###-##-##' },
    { code: 'RU', name: 'Россия', dial: '+7', flag: '🇷🇺', mask: '(###) ###-##-##' },
    { code: 'UZ', name: 'Узбекистан', dial: '+998', flag: '🇺🇿', mask: '## ###-##-##' },
    { code: 'KG', name: 'Кыргызстан', dial: '+996', flag: '🇰🇬', mask: '### ###-###' },
    { code: 'TJ', name: 'Таджикистан', dial: '+992', flag: '🇹🇯', mask: '## ###-##-##' },
    { code: 'TM', name: 'Туркменистан', dial: '+993', flag: '🇹🇲', mask: '## ##-##-##' },
    { code: 'GE', name: 'Грузия', dial: '+995', flag: '🇬🇪', mask: '### ##-##-##' },
    { code: 'TR', name: 'Турция', dial: '+90', flag: '🇹🇷', mask: '### ###-##-##' },
    { code: 'AE', name: 'ОАЭ', dial: '+971', flag: '🇦🇪', mask: '## ###-####' },
    { code: 'US', name: 'США', dial: '+1', flag: '🇺🇸', mask: '(###) ###-####' },
];

function getDigits(str: string): string {
    return str.replace(/\D/g, '');
}

function applyMask(digits: string, mask: string): string {
    let result = '';
    let di = 0;
    for (let i = 0; i < mask.length && di < digits.length; i++) {
        if (mask[i] === '#') {
            result += digits[di++];
        } else {
            result += mask[i];
        }
    }
    return result;
}

function getMaxDigits(mask: string): number {
    return mask.split('').filter(c => c === '#').length;
}

// Parse an existing phone string into { country, digits }
function parsePhone(phone: string): { country: Country; digits: string } {
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    // Try to match by dial code (longest first)
    const sorted = [...countries].sort((a, b) => b.dial.length - a.dial.length);
    for (const c of sorted) {
        if (cleaned.startsWith(c.dial)) {
            return { country: c, digits: cleaned.slice(c.dial.length) };
        }
    }
    // If starts with +7 and has 10 digits after
    if (cleaned.startsWith('+7') || cleaned.startsWith('87') || cleaned.startsWith('77')) {
        return { country: countries[0], digits: getDigits(cleaned).slice(1) }; // skip the 7/8
    }
    return { country: countries[0], digits: getDigits(cleaned) };
}

interface PhoneInputProps {
    value: string;
    onChange: (fullPhone: string) => void;
}

export default function PhoneInput({ value, onChange }: PhoneInputProps) {
    const parsed = parsePhone(value || '');
    const [selectedCountry, setSelectedCountry] = useState<Country>(parsed.country);
    const [digits, setDigits] = useState(parsed.digits);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Sync parent value on country/digits change
    const emitChange = (country: Country, d: string) => {
        const cleanDigits = getDigits(d);
        if (cleanDigits.length === 0) {
            onChange('');
        } else {
            onChange(`${country.dial}${cleanDigits}`);
        }
    };

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        const newDigits = getDigits(raw).slice(0, getMaxDigits(selectedCountry.mask));
        setDigits(newDigits);
        emitChange(selectedCountry, newDigits);
    };

    const handleCountrySelect = (country: Country) => {
        setSelectedCountry(country);
        const trimmed = digits.slice(0, getMaxDigits(country.mask));
        setDigits(trimmed);
        setDropdownOpen(false);
        emitChange(country, trimmed);
    };

    const maskedValue = applyMask(digits, selectedCountry.mask);
    const placeholder = selectedCountry.mask.replace(/#/g, '_');

    return (
        <div className="relative flex" ref={dropdownRef}>
            {/* Country selector */}
            <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-1.5 px-3 bg-gray-50 border border-r-0 border-gray-300 rounded-l-lg hover:bg-gray-100 transition-colors min-w-[110px]"
            >
                <span className="text-lg">{selectedCountry.flag}</span>
                <span className="text-sm text-gray-700 font-medium">{selectedCountry.dial}</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-auto" />
            </button>

            {/* Phone input */}
            <input
                type="tel"
                value={maskedValue}
                onChange={handleInput}
                placeholder={placeholder}
                className="input rounded-l-none border-l-0 flex-1"
            />

            {/* Dropdown */}
            {dropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                    {countries.map(c => (
                        <button
                            key={c.code}
                            type="button"
                            onClick={() => handleCountrySelect(c)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 transition-colors text-left ${c.code === selectedCountry.code ? 'bg-blue-50' : ''
                                }`}
                        >
                            <span className="text-lg">{c.flag}</span>
                            <span className="text-sm text-gray-900 flex-1">{c.name}</span>
                            <span className="text-xs text-gray-400 font-mono">{c.dial}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
