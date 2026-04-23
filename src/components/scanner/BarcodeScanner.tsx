'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, X, Zap } from 'lucide-react';

interface BarcodeScannerProps {
    onScan: (code: string) => void;
    onClose?: () => void;
    placeholder?: string;
}

export function BarcodeScanner({ onScan, onClose, placeholder = 'Наведите камеру на штрих-код' }: BarcodeScannerProps) {
    const scannerRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isActive, setIsActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [manualInput, setManualInput] = useState('');

    const startScanner = async () => {
        if (scannerRef.current) return;
        setError(null);

        try {
            const { Html5Qrcode } = await import('html5-qrcode');
            const scannerId = 'barcode-scanner-' + Date.now();

            // Ensure container has the div
            if (containerRef.current) {
                containerRef.current.innerHTML = `<div id="${scannerId}"></div>`;
            }

            const scanner = new Html5Qrcode(scannerId);
            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: 'environment' },
                {
                    fps: 10,
                    qrbox: { width: 280, height: 150 },
                    aspectRatio: 1.5,
                },
                (decodedText: string) => {
                    onScan(decodedText);
                    // Don't stop — allow continuous scanning
                },
                () => {} // ignore errors
            );

            setIsActive(true);
        } catch (err: any) {
            console.error('Scanner error:', err);
            setError(err?.message || 'Не удалось запустить камеру. Проверьте разрешения.');
        }
    };

    const stopScanner = async () => {
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop();
                await scannerRef.current.clear();
            } catch (e) {}
            scannerRef.current = null;
        }
        setIsActive(false);
    };

    useEffect(() => {
        return () => { stopScanner(); };
    }, []);

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (manualInput.trim()) {
            onScan(manualInput.trim());
            setManualInput('');
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <Camera className="w-5 h-5 text-primary-600" />
                    <span className="font-semibold text-gray-900 text-sm">Сканер штрих-кода</span>
                    {isActive && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                            LIVE
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {!isActive ? (
                        <button onClick={startScanner}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-medium hover:bg-primary-700 transition-colors">
                            <Zap className="w-3.5 h-3.5" />
                            Включить камеру
                        </button>
                    ) : (
                        <button onClick={stopScanner}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors">
                            Выключить
                        </button>
                    )}
                    {onClose && (
                        <button onClick={() => { stopScanner(); onClose(); }} className="text-gray-400 hover:text-gray-600">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Camera view */}
            <div ref={containerRef} className={`bg-gray-900 ${isActive ? 'min-h-[200px]' : 'hidden'}`} />

            {!isActive && !error && (
                <div className="bg-gray-50 py-8 px-4 text-center">
                    <Camera className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">{placeholder}</p>
                    <p className="text-xs text-gray-400 mt-1">Нажмите «Включить камеру» или введите код вручную</p>
                </div>
            )}

            {error && (
                <div className="bg-red-50 py-6 px-4 text-center">
                    <p className="text-sm text-red-600 mb-2">{error}</p>
                    <p className="text-xs text-gray-500">Введите код вручную ниже</p>
                </div>
            )}

            {/* Manual input */}
            <form onSubmit={handleManualSubmit} className="flex gap-2 p-3 border-t border-gray-100">
                <input
                    type="text"
                    value={manualInput}
                    onChange={e => setManualInput(e.target.value)}
                    placeholder="Ввести код вручную..."
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <button type="submit" disabled={!manualInput.trim()}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                    Найти
                </button>
            </form>
        </div>
    );
}
