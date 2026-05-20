'use client';
import { useEffect, useRef, useCallback } from 'react';

/**
 * USB barcode scanners act as keyboard — they type characters fast and press Enter.
 * This hook captures that pattern and calls onScan with the barcode.
 */
export function useUsbScanner(onScan: (code: string) => void, enabled = true) {
    const buffer = useRef('');
    const timer = useRef<NodeJS.Timeout | null>(null);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!enabled) return;
        // Don't capture if user is typing in an input/textarea
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

        if (e.key === 'Enter') {
            e.preventDefault();
            if (buffer.current.length >= 4) {
                onScan(buffer.current.trim());
            }
            buffer.current = '';
            if (timer.current) clearTimeout(timer.current);
            return;
        }

        if (e.key.length === 1) {
            buffer.current += e.key;
            if (timer.current) clearTimeout(timer.current);
            // Scanner types fast — if no key for 100ms, it's manual typing
            timer.current = setTimeout(() => { buffer.current = ''; }, 100);
        }
    }, [onScan, enabled]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
}
