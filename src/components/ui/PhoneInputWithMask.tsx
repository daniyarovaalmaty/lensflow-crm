'use client';

import React from 'react';

interface PhoneInputWithMaskProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
}

/** Formats digits into Kazakhstan phone mask format: +7 (7XX) XXX-XX-XX */
export function formatKazakhstanPhone(input: string): string {
  if (!input) return '';
  
  // Extract all digits
  let digits = input.replace(/\D/g, '');
  
  // If user starts with 8, convert to 7
  if (digits.startsWith('8')) {
    digits = '7' + digits.slice(1);
  }
  
  // If user enters digits without 7 prefix, prepend 7
  if (digits.length > 0 && !digits.startsWith('7')) {
    digits = '7' + digits;
  }
  
  // Limit to 11 digits (7 + 10 digits)
  digits = digits.slice(0, 11);
  
  if (digits.length === 0) return '';
  
  let formatted = '+7';
  if (digits.length > 1) {
    formatted += ` (${digits.slice(1, 4)}`;
  }
  if (digits.length >= 4) {
    formatted += `)`;
  }
  if (digits.length > 4) {
    formatted += ` ${digits.slice(4, 7)}`;
  }
  if (digits.length >= 7) {
    formatted += `-`;
  }
  if (digits.length > 7) {
    formatted += `${digits.slice(7, 9)}`;
  }
  if (digits.length >= 9) {
    formatted += `-`;
  }
  if (digits.length > 9) {
    formatted += `${digits.slice(9, 11)}`;
  }
  
  return formatted;
}

export default function PhoneInputWithMask({
  value,
  onChange,
  placeholder = '+7 (701) 000-00-00',
  className = 'input text-sm w-full',
  required = false,
  disabled = false,
  id,
}: PhoneInputWithMaskProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatKazakhstanPhone(raw);
    onChange(formatted);
  };

  return (
    <input
      type="tel"
      id={id}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
      required={required}
      disabled={disabled}
      maxLength={18}
    />
  );
}
