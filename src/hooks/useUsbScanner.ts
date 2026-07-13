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

        // If user is focused on an input, let the input handle the scanner
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
            buffer.current = '';
            if (timer.current) clearTimeout(timer.current);
            return;
        }

        if (e.key === 'Enter') {
            if (buffer.current.length >= 4) {
                e.preventDefault();
                e.stopPropagation();
                onScan(buffer.current.trim());
            }
            buffer.current = '';
            if (timer.current) clearTimeout(timer.current);
            return;
        }

        // Ignore meta keys
        if (e.ctrlKey || e.altKey || e.metaKey || e.key.length !== 1) {
            return;
        }

        // Add to buffer
        buffer.current += e.key;
        if (timer.current) clearTimeout(timer.current);
        
        // Timeout 250ms for slow scanners
        timer.current = setTimeout(() => { buffer.current = ''; }, 250);
    }, [onScan, enabled]);

    useEffect(() => {
        // Use capturing phase to intercept before inputs
        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [handleKeyDown]);
}
