'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Package, Plus, Search, X, Eye, Edit2, Trash2,
    Tag, ShoppingBag, Droplets, Glasses, Wrench, Star,
    Camera, DollarSign, AlertTriangle, BarChart3, Image as ImageIcon, ArrowLeft,
    Sparkles, Send, Bot, Loader2, MessageSquare, Printer, Upload
} from 'lucide-react';
import Link from 'next/link';
import { getEffectiveClinicPermissions } from '@/types/user';
import AccessDenied from '@/components/ui/AccessDenied';
import QuickNav from '@/components/ui/QuickNav';
import { translateCyrillicToEnglishLayout } from '@/lib/utils/keyboard-layout';

// ==================== Types ====================
interface OpticProduct {
    id: string;
    name: string;
    slug: string | null;
    category: string;
    type: string;
    brand: string | null;
    model: string | null;
    sku: string | null;
    barcode: string | null;
    shortDescription: string | null;
    fullDescription: string | null;
    images: string[] | null;
    specs: Record<string, string> | null;
    purchasePrice: number;
    retailPrice: number;
    minStock: number;
    currentStock: number;
    unit: string;
    trackSerials: boolean;
    isPublic: boolean;
    isActive: boolean;
    createdAt: string;
    _count?: { stockItems: number };
}

// ==================== Constants ====================
const CATEGORIES: Record<string, { label: string; icon: any; color: string }> = {
    frame: { label: 'Оправы', icon: Glasses, color: 'bg-blue-50 text-blue-700' },
    sun_glasses: { label: 'Солнцезащитные', icon: Star, color: 'bg-amber-50 text-amber-700' },
    contact_lens: { label: 'Контактные линзы', icon: Eye, color: 'bg-purple-50 text-purple-700' },
    spectacle_lens: { label: 'Очковые линзы', icon: Eye, color: 'bg-indigo-50 text-indigo-700' },
    solution: { label: 'Растворы', icon: Droplets, color: 'bg-cyan-50 text-cyan-700' },
    accessory: { label: 'Аксессуары', icon: ShoppingBag, color: 'bg-pink-50 text-pink-700' },
    service_exam: { label: 'Проверка зрения', icon: Wrench, color: 'bg-emerald-50 text-emerald-700' },
    service_fitting: { label: 'Подбор линз', icon: Wrench, color: 'bg-emerald-50 text-emerald-700' },
    service_cutting: { label: 'Вытачка линз', icon: Wrench, color: 'bg-emerald-50 text-emerald-700' },
    service_repair: { label: 'Ремонт очков', icon: Wrench, color: 'bg-emerald-50 text-emerald-700' },
    service_other: { label: 'Другие услуги', icon: Wrench, color: 'bg-emerald-50 text-emerald-700' },
};

const CATEGORY_GROUPS = [
    { key: 'all', label: 'Все' },
    { key: 'products', label: 'Товары' },
    { key: 'services', label: 'Услуги' },
];

const fmt = (n: number) => n.toLocaleString('ru-RU');

export default function OpticCatalogPage() {
    const { data: session } = useSession();
    const router = useRouter();

    // permissions visibility check
    const clinicPerms = session?.user ? getEffectiveClinicPermissions({
        subRole: session.user.subRole,
        permissions: session.user.permissions,
    }) : null;

    const [products, setProducts] = useState<OpticProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [showForm, setShowForm] = useState(false);
    const [editProduct, setEditProduct] = useState<OpticProduct | null>(null);
    const [detailProduct, setDetailProduct] = useState<OpticProduct | null>(null);

    // Print Settings state
    const [printProduct, setPrintProduct] = useState<OpticProduct | null>(null);
    const [labelWidth, setLabelWidth] = useState(58); // default 58mm
    const [labelHeight, setLabelHeight] = useState(30); // default 30mm
    const [includePrice, setIncludePrice] = useState(true);
    const [includeBrand, setIncludeBrand] = useState(true);
    const [includeName, setIncludeName] = useState(true);
    const [printAlignment, setPrintAlignment] = useState<'left' | 'center' | 'right'>('left');

    // WebUSB Printer State
    const [usbDevice, setUsbDevice] = useState<any | null>(null);
    const [printerLanguage, setPrinterLanguage] = useState<'tspl' | 'zpl'>('tspl');
    const [usbError, setUsbError] = useState<string | null>(null);
    const [usbConnecting, setUsbConnecting] = useState(false);
    const [serialPort, setSerialPort] = useState<any | null>(null);
    const [serialConnecting, setSerialConnecting] = useState(false);
    const [baudRate, setBaudRate] = useState(9600);

    // Bulk Import state
    const [showImport, setShowImport] = useState(false);
    const [importing, setImporting] = useState(false);
    const [parsedProducts, setParsedProducts] = useState<any[]>([]);
    const [autoGenBarcodes, setAutoGenBarcodes] = useState(true);
    const [importError, setImportError] = useState<string | null>(null);

    // Form state
    const [form, setForm] = useState({
        name: '', category: 'frame', brand: '', model: '', sku: '', barcode: '',
        shortDescription: '', fullDescription: '', purchasePrice: '', retailPrice: '',
        minStock: '0', unit: 'шт', trackSerials: false, isPublic: false,
        images: [] as string[], specs: {} as Record<string, string>,
    });
    const [saving, setSaving] = useState(false);

    // AI assistant state
    const [showAI, setShowAI] = useState(false);
    const [aiInput, setAiInput] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiMessages, setAiMessages] = useState<Array<{
        role: 'user' | 'assistant'; text: string; products?: any[];
    }>>([
        { role: 'assistant', text: 'Привет! Я помогу добавить товары в каталог. Напишите список товаров с ценами в свободной форме, и я добавлю их автоматически.\n\nНапример:\n«Добавь оправу Ray-Ban RB5228, закуп 15000, розница 25000. Проверка зрения — 3000 тенге»' },
    ]);
    const aiChatRef = useRef<HTMLDivElement>(null);

    useEffect(() => { loadProducts(); }, []);

    // WebUSB printer auto-reconnect
    useEffect(() => {
        if (typeof window !== 'undefined' && (navigator as any).usb) {
            (navigator as any).usb.getDevices().then(async (devices: any[]) => {
                if (devices.length > 0) {
                    const device = devices[0];
                    try {
                        await device.open();
                        if (device.configuration === null) {
                            await device.selectConfiguration(1);
                        }
                        let interfaceNumber = 0;
                        const interfaces = device.configuration?.interfaces || [];
                        let found = false;
                        for (const iface of interfaces) {
                            for (const alt of iface.alternates) {
                                if (alt.interfaceClass === 7) {
                                    interfaceNumber = iface.interfaceNumber;
                                    found = true;
                                    break;
                                }
                            }
                            if (found) break;
                        }
                        await device.claimInterface(interfaceNumber);
                        setUsbDevice(device);
                    } catch (e) {
                        console.log('Auto-connect to USB printer failed:', e);
                    }
                }
            });
        }
    }, []);

    const loadProducts = async () => {
        try {
            const res = await fetch('/api/optic/products?t=' + Date.now(), { cache: 'no-store' });
            if (res.ok) setProducts(await res.json());
        } finally {
            setLoading(false);
        }
    };

    const handlePrintLabel = (
        product: OpticProduct,
        widthMm: number = 58,
        heightMm: number = 30,
        incPrice: boolean = true,
        incBrand: boolean = true
    ) => {
        const barcodeToPrint = product.barcode || product.sku;
        if (!barcodeToPrint) {
            alert('⚠️ Чтобы распечатать этикетку, сначала укажите Штрих-код или Артикул (SKU) в карточке товара (нажмите кнопку "Редактировать").');
            return;
        }
        
        // Create a hidden iframe to bypass browser popup blockers (Safari/Chrome on iPads)
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);

        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) {
            alert('Ошибка инициализации печати');
            document.body.removeChild(iframe);
            return;
        }
        
        const isTailLabel = widthMm === 72 && heightMm === 10;
        const shiftStyle = printAlignment === 'right' 
            ? 'margin-left: 8mm;' 
            : (printAlignment === 'center' ? 'margin-left: 4mm;' : 'margin-left: 0;');

        if (isTailLabel) {
            iframeDoc.write(`
                <html>
                    <head>
                        <title>Печать</title>
                        <style>
                            @page {
                                size: 72mm 10mm;
                                margin: 0;
                            }
                            html, body {
                                margin: 0;
                                padding: 0;
                                background: white;
                                width: 72mm;
                                height: 10mm;
                                overflow: hidden;
                            }
                            body {
                                margin: 0;
                                padding: 0;
                                font-family: Arial, sans-serif;
                                box-sizing: border-box;
                            }
                            .tail-label {
                                display: flex;
                                width: 72mm;
                                height: 10mm;
                                box-sizing: border-box;
                                padding: 0.5mm 1mm;
                                align-items: center;
                                justify-content: space-between;
                                ${shiftStyle}
                            }
                            .left-part {
                                width: 29mm;
                                height: 9mm;
                                display: flex;
                                flex-direction: column;
                                justify-content: space-between;
                                align-items: flex-start;
                                overflow: hidden;
                            }
                            .brand-tail {
                                font-size: 10px;
                                font-weight: bold;
                                text-transform: uppercase;
                                color: #000000;
                                line-height: 1;
                                white-space: nowrap;
                                overflow: hidden;
                                text-overflow: ellipsis;
                                width: 180%;
                                transform: scale(0.55);
                                transform-origin: left top;
                            }
                            .name-tail {
                                font-size: 10px;
                                font-weight: bold;
                                color: #000000;
                                line-height: 1.1;
                                white-space: nowrap;
                                overflow: hidden;
                                text-overflow: ellipsis;
                                width: 150%;
                                transform: scale(0.65);
                                transform-origin: left top;
                            }
                            .price-tail {
                                font-size: 11px;
                                font-weight: 900;
                                color: #000000;
                                line-height: 1;
                                transform: scale(0.75);
                                transform-origin: left bottom;
                            }
                            .middle-tail {
                                width: 12mm; /* Non-adhesive wrap tail bridge */
                                height: 9mm;
                            }
                            .right-part {
                                width: 29mm;
                                height: 9mm;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                overflow: hidden;
                            }
                            .right-part svg#barcode {
                                width: 100%;
                                height: 8mm;
                            }
                        </style>
                        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
                    </head>
                    <body>
                        <div class="tail-label">
                            <div class="left-part">
                                ${incBrand ? `<div class="brand-tail">${product.brand || 'ОПТИКА'}</div>` : ''}
                                ${includeName ? `<div class="name-tail">${product.name}</div>` : ''}
                                ${incPrice ? `<div class="price-tail">${product.retailPrice.toLocaleString('ru-RU')} ₸</div>` : ''}
                            </div>
                            <div class="middle-tail"></div>
                            <div class="right-part">
                                <svg id="barcode"></svg>
                            </div>
                        </div>
                    </body>
                </html>
            `);
        } else {
            iframeDoc.write(`
                <html>
                    <head>
                        <title>Печать</title>
                        <style>
                            @page {
                                size: ${widthMm}mm ${heightMm}mm;
                                margin: 0;
                            }
                            html, body {
                                margin: 0;
                                padding: 0;
                                background: white;
                                width: ${widthMm}mm;
                                height: ${heightMm}mm;
                                overflow: hidden;
                            }
                            body {
                                padding: 2mm;
                                font-family: Arial, sans-serif;
                                box-sizing: border-box;
                                display: flex;
                                flex-direction: column;
                                justify-content: space-between;
                                align-items: center;
                                ${shiftStyle}
                            }
                            .brand {
                                font-size: ${heightMm > 25 ? '8px' : '6px'};
                                font-weight: bold;
                                text-transform: uppercase;
                                color: black;
                                margin-bottom: 1px;
                                white-space: nowrap;
                                overflow: hidden;
                                text-overflow: ellipsis;
                                width: 100%;
                                text-align: center;
                            }
                            .name {
                                font-size: ${heightMm > 25 ? '9px' : '7.5px'};
                                font-weight: bold;
                                color: black;
                                text-align: center;
                                line-height: 1.1;
                                height: 2.2em;
                                overflow: hidden;
                                width: 100%;
                                display: -webkit-box;
                                -webkit-line-clamp: 2;
                                -webkit-box-orient: vertical;
                            }
                            .price {
                                font-size: ${heightMm > 25 ? '11px' : '9px'};
                                font-weight: 900;
                                color: black;
                                margin-top: 1px;
                            }
                            svg#barcode {
                                width: 100%;
                                max-height: ${Math.max(5, heightMm - 19)}mm;
                            }
                        </style>
                        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
                    </head>
                    <body>
                        ${incBrand ? `<div class="brand">${product.brand || 'ОПТИКА'}</div>` : ''}
                        ${includeName ? `<div class="name">${product.name}</div>` : ''}
                        <svg id="barcode"></svg>
                        ${incPrice ? `<div class="price">${product.retailPrice.toLocaleString('ru-RU')} ₸</div>` : ''}
                    </body>
                </html>
            `);
        }
        
        iframeDoc.close();

        let printed = false;
        const triggerPrint = () => {
            if (printed) return;
            try {
                const win = iframe.contentWindow as any;
                if (!win) return;
                
                if (win.JsBarcode) {
                    win.JsBarcode("#barcode", barcodeToPrint, {
                        format: "CODE128",
                        width: isTailLabel ? 0.7 : (widthMm > 45 ? 1.2 : 0.9),
                        height: isTailLabel ? 16 : (heightMm > 25 ? 30 : 18),
                        displayValue: isTailLabel ? false : (heightMm > 25),
                        fontSize: 8,
                        margin: 0
                    });
                    printed = true;
                }
                
                setTimeout(() => {
                    try {
                        win.focus();
                        win.print();
                    } catch (e) {
                        console.error('Focus/print failed:', e);
                    }
                }, 200);
            } catch (e) {
                console.error('Print trigger failed:', e);
            }
        };

        // Bind onload
        iframe.onload = triggerPrint;

        // Fallback safety timeout if onload doesn't trigger
        setTimeout(() => {
            triggerPrint();
        }, 600);

        // Remove the iframe after printing dialog is shown
        setTimeout(() => {
            if (iframe && iframe.parentNode) {
                document.body.removeChild(iframe);
            }
        }, 5000);
    };

    const connectUsbPrinter = async () => {
        setUsbError(null);
        setUsbConnecting(true);
        try {
            if (typeof window === 'undefined' || !(navigator as any).usb) {
                throw new Error('WebUSB API не поддерживается в этом браузере. Используйте Google Chrome или Microsoft Edge.');
            }
            const device = await (navigator as any).usb.requestDevice({ filters: [] });
            await device.open();
            if (device.configuration === null) {
                await device.selectConfiguration(1);
            }
            
            let interfaceNumber = 0;
            let alternateSetting = 0;
            const interfaces = device.configuration?.interfaces || [];
            let found = false;
            for (const iface of interfaces) {
                for (const alt of iface.alternates) {
                    if (alt.interfaceClass === 7) { // Printer Class
                        interfaceNumber = iface.interfaceNumber;
                        alternateSetting = alt.alternateSetting;
                        found = true;
                        break;
                    }
                }
                if (found) break;
            }
            
            await device.claimInterface(interfaceNumber);
            if (alternateSetting !== 0) {
                await device.selectAlternateInterface(interfaceNumber, alternateSetting);
            }
            
            setUsbDevice(device);
            alert(`🎉 Успешно подключен принтер: ${device.productName || 'USB Printer'}`);
        } catch (err: any) {
            console.error('WebUSB Connection Error:', err);
            setUsbError(err.message || 'Не удалось подключиться к принтеру');
            alert(`❌ Ошибка подключения: ${err.message || 'Не удалось подключиться к принтеру'}`);
        } finally {
            setUsbConnecting(false);
        }
    };

    const findPrinterEndpoint = (device: any) => {
        const interfaces = device.configuration?.interfaces || [];
        for (const iface of interfaces) {
            for (const alt of iface.alternates) {
                for (const endpoint of alt.endpoints) {
                    if (endpoint.direction === 'out' && endpoint.type === 'bulk') {
                        return endpoint.endpointNumber;
                    }
                }
            }
        }
        return 1; // Fallback Bulk Out endpoint
    };

    const generateZpl = (product: OpticProduct, incPrice: boolean, incBrand: boolean) => {
        const barcode = product.barcode || product.sku || '1234567890';
        const brand = (product.brand || 'ОПТИКА').substring(0, 15).toUpperCase();
        const name = product.name.substring(0, 20);
        const price = `${product.retailPrice.toLocaleString('ru-RU')} T`;
        
        let zpl = `^XA\r\n`;
        if (printAlignment === 'right') {
            zpl += `^LS64\r\n`;
        } else if (printAlignment === 'center') {
            zpl += `^LS32\r\n`;
        }
        zpl += `^PW576\r\n`;
        zpl += `^LL80\r\n`;
        zpl += `^CI28\r\n`;
        
        let textY = 15;
        if (incBrand) {
            zpl += `^FT10,${textY}^A0N,14,14^FD${brand}^FS\r\n`;
            textY += 20;
        }
        if (includeName) {
            zpl += `^FT10,${textY}^A0N,16,16^FD${name}^FS\r\n`;
            textY += 22;
        }
        if (incPrice) {
            zpl += `^FT10,${textY}^A0N,18,18^FD${price}^FS\r\n`;
        }
        
        zpl += `^BY1,2,30\r\n`;
        zpl += `^FT340,20^BCN,35,N,N,Y^FD${barcode}^FS\r\n`;
        zpl += `^FT350,70^A0N,12,12^FD${barcode}^FS\r\n`;
        
        zpl += `^XZ\r\n`;
        return zpl;
    };

    const generateTspl = (product: OpticProduct, incPrice: boolean, incBrand: boolean) => {
        const barcode = product.barcode || product.sku || '1234567890';
        const brand = (product.brand || 'ОПТИКА').substring(0, 15).toUpperCase();
        const name = product.name.substring(0, 20);
        const price = `${product.retailPrice.toLocaleString('ru-RU')} T`;
        
        let tspl = `SIZE 72 mm, 10 mm\r\n`;
        tspl += `GAP 2 mm, 0 mm\r\n`;
        if (printAlignment === 'right') {
            tspl += `SHIFT 64\r\n`;
        } else if (printAlignment === 'center') {
            tspl += `SHIFT 32\r\n`;
        }
        tspl += `DIRECTION 1\r\n`;
        tspl += `CODEPAGE UTF-8\r\n`;
        tspl += `CLS\r\n`;
        
        let textY = 10;
        if (incBrand) {
            tspl += `TEXT 10,${textY},"1",0,1,1,"${brand}"\r\n`;
            textY += 20;
        }
        if (includeName) {
            tspl += `TEXT 10,${textY},"1",0,1,1,"${name}"\r\n`;
            textY += 22;
        }
        if (incPrice) {
            tspl += `TEXT 10,${textY},"2",0,1,1,"${price}"\r\n`;
        }
        
        tspl += `BARCODE 340,15,"128",30,1,0,1,2,"${barcode}"\r\n`;
        tspl += `PRINT 1,1\r\n`;
        return tspl;
    };

    const generateZplStandard = (product: OpticProduct, widthMm: number, heightMm: number, incPrice: boolean, incBrand: boolean) => {
        const barcode = product.barcode || product.sku || '1234567890';
        const brand = (product.brand || 'ОПТИКА').substring(0, 20).toUpperCase();
        const name = product.name.substring(0, 25);
        const price = `${product.retailPrice.toLocaleString('ru-RU')} T`;
        const widthDots = widthMm * 8;
        const heightDots = heightMm * 8;
        
        let zpl = `^XA\r\n`;
        if (printAlignment === 'right') {
            zpl += `^LS64\r\n`;
        } else if (printAlignment === 'center') {
            zpl += `^LS32\r\n`;
        }
        zpl += `^PW${widthDots}\r\n`;
        zpl += `^LL${heightDots}\r\n`;
        zpl += `^CI28\r\n`;
        
        let currentY = 30;
        if (incBrand) {
            zpl += `^FT${Math.round(widthDots / 2)},${currentY}^A0N,20,20^FB${widthDots},1,0,C^FD${brand}^FS\r\n`;
            currentY += 25;
        }
        if (includeName) {
            zpl += `^FT${Math.round(widthDots / 2)},${currentY}^A0N,22,22^FB${widthDots},2,0,C^FD${name}^FS\r\n`;
            currentY += 50;
        }
        
        zpl += `^BY2,2,40\r\n`;
        zpl += `^FT${Math.round(widthDots / 2) - 100},${currentY}^BCN,40,Y,N,N^FD${barcode}^FS\r\n`;
        currentY += 60;
        
        if (incPrice) {
            zpl += `^FT${Math.round(widthDots / 2)},${currentY}^A0N,26,26^FB${widthDots},1,0,C^FD${price}^FS\r\n`;
        }
        
        zpl += `^XZ\r\n`;
        return zpl;
    };

    const generateTsplStandard = (product: OpticProduct, widthMm: number, heightMm: number, incPrice: boolean, incBrand: boolean) => {
        const barcode = product.barcode || product.sku || '1234567890';
        const brand = (product.brand || 'ОПТИКА').substring(0, 20).toUpperCase();
        const name = product.name.substring(0, 25);
        const price = `${product.retailPrice.toLocaleString('ru-RU')} T`;
        
        let tspl = `SIZE ${widthMm} mm, ${heightMm} mm\r\n`;
        tspl += `GAP 2 mm, 0 mm\r\n`;
        if (printAlignment === 'right') {
            tspl += `SHIFT 64\r\n`;
        } else if (printAlignment === 'center') {
            tspl += `SHIFT 32\r\n`;
        }
        tspl += `DIRECTION 1\r\n`;
        tspl += `CODEPAGE UTF-8\r\n`;
        tspl += `CLS\r\n`;
        
        let currentY = 20;
        if (incBrand) {
            tspl += `TEXT 30,${currentY},"1",0,1,1,"${brand}"\r\n`;
            currentY += 25;
        }
        if (includeName) {
            tspl += `TEXT 30,${currentY},"1",0,1,1,"${name}"\r\n`;
            currentY += 30;
        }
        
        tspl += `BARCODE 30,${currentY},"128",50,1,0,2,4,"${barcode}"\r\n`;
        currentY += 75;
        
        if (incPrice) {
            tspl += `TEXT 30,${currentY},"2",0,1,1,"${price}"\r\n`;
        }
        
        tspl += `PRINT 1,1\r\n`;
        return tspl;
    };

    const printViaUsb = async () => {
        if (!printProduct) return;
        if (!usbDevice) {
            alert('⚠️ Сначала подключите принтер по USB!');
            return;
        }
        
        setUsbError(null);
        try {
            const isTail = labelWidth === 72 && labelHeight === 10;
            let commandString = '';
            
            if (printerLanguage === 'zpl') {
                commandString = isTail 
                    ? generateZpl(printProduct, includePrice, includeBrand)
                    : generateZplStandard(printProduct, labelWidth, labelHeight, includePrice, includeBrand);
            } else {
                commandString = isTail
                    ? generateTspl(printProduct, includePrice, includeBrand)
                    : generateTsplStandard(printProduct, labelWidth, labelHeight, includePrice, includeBrand);
            }
            
            const encoder = new TextEncoder();
            const data = encoder.encode(commandString);
            
            const endpointNumber = findPrinterEndpoint(usbDevice);
            
            await usbDevice.transferOut(endpointNumber, data);
            alert('⚡️ Этикетка успешно отправлена на печать по USB!');
        } catch (err: any) {
            console.error('WebUSB Printing Error:', err);
            setUsbError(err.message || 'Ошибка отправки на печать');
            alert(`❌ Ошибка печати: ${err.message || 'Ошибка отправки на печать'}`);
        }
    };

    const connectSerialPrinter = async () => {
        setUsbError(null);
        setSerialConnecting(true);
        try {
            if (typeof window === 'undefined' || !(navigator as any).serial) {
                throw new Error('Web Serial API не поддерживается в этом браузере. Используйте Google Chrome или Microsoft Edge.');
            }
            
            // Proactively close previous port if open to avoid InvalidStateError
            if (serialPort) {
                try {
                    await serialPort.close();
                } catch (e) {
                    console.log('Close previous port ignored:', e);
                }
            }
            
            const port = await (navigator as any).serial.requestPort();
            await port.open({ baudRate: Number(baudRate) || 9600 });
            
            // Assert DTR and RTS signals (nested try-catch to prevent driver-level crashes on cheaper chips!)
            try {
                if (port.setSignals) {
                    await port.setSignals({ dataTerminalReady: true, requestToSend: true });
                }
            } catch (sigErr) {
                console.warn('Hardware handshake signals are not supported by this printer driver:', sigErr);
            }
            
            setSerialPort(port);
            alert(`🎉 Успешно подключен принтер по последовательному порту Serial (Скорость: ${baudRate})!`);
        } catch (err: any) {
            console.error('Web Serial Connection Error:', err);
            setUsbError(err.message || 'Не удалось подключиться к Serial-принтеру');
            alert(`❌ Ошибка подключения по Serial: ${err.message || 'Не удалось подключиться к Serial-принтеру'}`);
        } finally {
            setSerialConnecting(false);
        }
    };

    const printViaSerial = async () => {
        if (!printProduct) return;
        if (!serialPort) {
            alert('⚠️ Сначала подключите принтер по Serial!');
            return;
        }
        
        setUsbError(null);
        try {
            const isTail = labelWidth === 72 && labelHeight === 10;
            let commandString = '';
            
            if (printerLanguage === 'zpl') {
                commandString = isTail 
                    ? generateZpl(printProduct, includePrice, includeBrand)
                    : generateZplStandard(printProduct, labelWidth, labelHeight, includePrice, includeBrand);
            } else {
                commandString = isTail
                    ? generateTspl(printProduct, includePrice, includeBrand)
                    : generateTsplStandard(printProduct, labelWidth, labelHeight, includePrice, includeBrand);
            }
            
            const encoder = new TextEncoder();
            const data = encoder.encode(commandString);
            
            // Re-assert signals to activate print receiver on printer (nested try-catch to prevent crashes)
            try {
                if (serialPort.setSignals) {
                    await serialPort.setSignals({ dataTerminalReady: true, requestToSend: true });
                }
            } catch (sigErr) {
                console.warn('Hardware handshake signals not supported on write:', sigErr);
            }
            
            const writer = serialPort.writable.getWriter();
            await writer.write(data);
            writer.releaseLock();
            alert('⚡️ Этикетка успешно отправлена на печать по Serial!');
        } catch (err: any) {
            console.error('Serial Printing Error:', err);
            setUsbError(err.message || 'Ошибка отправки на печать по Serial');
            alert(`❌ Ошибка печати по Serial: ${err.message || 'Ошибка отправки на печать по Serial'}`);
        }
    };

    const openPrintSettings = (product: OpticProduct) => {
        const barcodeToPrint = product.barcode || product.sku;
        if (!barcodeToPrint) {
            alert('⚠️ Чтобы распечатать этикетку, сначала укажите Штрих-код или Артикул (SKU) в карточке товара (нажмите кнопку "Редактировать").');
            return;
        }
        setPrintProduct(product);
    };

    const handlePrintLabelFromForm = () => {
        const barcodeToPrint = form.barcode || form.sku;
        if (!barcodeToPrint) {
            alert('⚠️ Чтобы распечатать этикетку, сначала укажите Штрих-код или Артикул (SKU) в форме.');
            return;
        }

        const tempProduct: OpticProduct = {
            id: editProduct?.id || 'temp',
            name: form.name,
            slug: null,
            category: form.category,
            type: 'product',
            brand: form.brand || null,
            model: form.model || null,
            sku: form.sku || null,
            barcode: form.barcode || null,
            shortDescription: form.shortDescription || null,
            fullDescription: form.fullDescription || null,
            images: form.images || null,
            specs: form.specs || null,
            purchasePrice: Number(form.purchasePrice) || 0,
            retailPrice: Number(form.retailPrice) || 0,
            minStock: Number(form.minStock) || 0,
            currentStock: 0,
            unit: form.unit,
            trackSerials: form.trackSerials,
            isPublic: form.isPublic,
            isActive: true,
            createdAt: new Date().toISOString()
        };
        openPrintSettings(tempProduct);
    };

    const filteredProducts = useMemo(() => {
        let result = products.filter(p => p.isActive);
        if (categoryFilter === 'products') result = result.filter(p => p.type === 'product');
        else if (categoryFilter === 'services') result = result.filter(p => p.type === 'service');
        else if (categoryFilter !== 'all') result = result.filter(p => p.category === categoryFilter);
        if (search) {
            const s = search.toLowerCase();
            result = result.filter(p =>
                p.name.toLowerCase().includes(s) ||
                p.brand?.toLowerCase().includes(s) ||
                p.sku?.toLowerCase().includes(s) ||
                p.barcode?.toLowerCase().includes(s) ||
                p.model?.toLowerCase().includes(s)
            );
        }
        return result;
    }, [products, categoryFilter, search]);

    const openCreateForm = () => {
        setEditProduct(null);
        setForm({
            name: '', category: 'frame', brand: '', model: '', sku: '', barcode: '',
            shortDescription: '', fullDescription: '', purchasePrice: '', retailPrice: '',
            minStock: '0', unit: 'шт', trackSerials: false, isPublic: false,
            images: [], specs: {},
        });
        setShowForm(true);
    };

    const openEditForm = (p: OpticProduct) => {
        setEditProduct(p);
        setForm({
            name: p.name, category: p.category, brand: p.brand || '', model: p.model || '',
            sku: p.sku || '', barcode: p.barcode || '',
            shortDescription: p.shortDescription || '', fullDescription: p.fullDescription || '',
            purchasePrice: String(p.purchasePrice || ''), retailPrice: String(p.retailPrice || ''),
            minStock: String(p.minStock || '0'), unit: p.unit || 'шт',
            trackSerials: p.trackSerials, isPublic: p.isPublic,
            images: (p.images as string[]) || [], specs: (p.specs as Record<string, string>) || {},
        });
        setShowForm(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const url = editProduct ? `/api/optic/products/${editProduct.id}` : '/api/optic/products';
            const method = editProduct ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            if (res.ok) {
                await loadProducts();
                setShowForm(false);
            } else {
                const err = await res.json().catch(() => ({ error: res.statusText }));
                alert(`Ошибка сохранения: ${err.error || res.statusText}`);
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Деактивировать товар?')) return;
        const res = await fetch(`/api/optic/products/${id}`, { method: 'DELETE' });
        if (res.ok) await loadProducts();
    };

    // ==================== CSV Bulk Import Handlers ====================
    const handleDownloadTemplate = () => {
        // UTF-8 BOM helps MS Excel open Russian columns correctly
        const csvContent = "\uFEFFНаименование;Бренд;Модель;Категория;Артикул;Штрихкод;Цена закупки;Цена продажи;Мин. остаток\nОправа Ray-Ban RX5228;Ray-Ban;RX5228;frame;RB-5228;5901234123457;15000;25000;5\nМягкие дневные линзы ArtMost;ArtMost;Dailies;contact_lens;;234567876543;8000;14000;10\nСалфетки микрофибра;;;accessory;CL-CLOTH;;300;800;50\n";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "lensflow_catalog_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImportError(null);
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                if (!text) return;

                const lines = text.split(/\r?\n/);
                if (lines.length === 0 || !lines[0].trim()) {
                    setImportError("Выбран пустой файл.");
                    return;
                }

                // Delimiter auto-detection: semi-colon (Excel default) or comma
                let delimiter = ',';
                if (lines[0].includes(';')) {
                    delimiter = ';';
                }

                const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
                
                // Mappings
                const mapping: Record<string, string> = {
                    'наименование': 'name',
                    'name': 'name',
                    'товар': 'name',
                    'название': 'name',
                    'бренд': 'brand',
                    'brand': 'brand',
                    'модель': 'model',
                    'model': 'model',
                    'категория': 'category',
                    'category': 'category',
                    'артикул': 'sku',
                    'sku': 'sku',
                    'штрихкод': 'barcode',
                    'barcode': 'barcode',
                    'штрих-код': 'barcode',
                    'цена закупки': 'purchasePrice',
                    'purchase_price': 'purchasePrice',
                    'закуп': 'purchasePrice',
                    'цена продажи': 'retailPrice',
                    'retail_price': 'retailPrice',
                    'розница': 'retailPrice',
                    'мин. остаток': 'minStock',
                    'min_stock': 'minStock',
                    'остаток': 'minStock'
                };

                const keys = headers.map(h => mapping[h.toLowerCase().trim()] || null);

                // Parse rows
                const productsList: any[] = [];
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;

                    // Support quoted fields split safely
                    const values: string[] = [];
                    let current = '';
                    let inQuotes = false;
                    for (let j = 0; j < line.length; j++) {
                        const char = line[j];
                        if (char === '"') {
                            inQuotes = !inQuotes;
                        } else if (char === delimiter && !inQuotes) {
                            values.push(current.trim().replace(/^"|"$/g, ''));
                            current = '';
                        } else {
                            current += char;
                        }
                    }
                    values.push(current.trim().replace(/^"|"$/g, ''));

                    const p: Record<string, any> = {};
                    keys.forEach((key, index) => {
                        if (key) {
                            let val: any = values[index];
                            if (key === 'purchasePrice' || key === 'retailPrice' || key === 'minStock') {
                                val = Number(val) || 0;
                            }
                            p[key] = val;
                        }
                    });

                    // Auto-detect category mapping
                    if (p.category) {
                        const catLower = p.category.toLowerCase().trim();
                        if (['оправа', 'оправы', 'frame'].includes(catLower)) p.category = 'frame';
                        else if (['линза', 'линзы', 'контактные линзы', 'contact_lens'].includes(catLower)) p.category = 'contact_lens';
                        else if (['очковые линзы', 'стекла', 'spectacle_lens'].includes(catLower)) p.category = 'spectacle_lens';
                        else if (['раствор', 'растворы', 'solution'].includes(catLower)) p.category = 'solution';
                        else if (['аксессуар', 'аксессуары', 'accessory'].includes(catLower)) p.category = 'accessory';
                        else if (['солнцезащитные', 'очки', 'sun_glasses'].includes(catLower)) p.category = 'sun_glasses';
                    }

                    if (p.name) {
                        productsList.push(p);
                    }
                }

                if (productsList.length === 0) {
                    setImportError("Не найдено корректных строк с наименованием товаров.");
                } else {
                    setParsedProducts(productsList);
                }
            } catch (err: any) {
                setImportError("Ошибка парсинга CSV файла: " + err.message);
            }
        };
        reader.readAsText(file, 'utf-8');
    };

    const handleImportSubmit = async () => {
        if (parsedProducts.length === 0 || importing) return;
        setImporting(true);
        setImportError(null);

        // Pre-processing for auto barcode generation
        const preparedList = parsedProducts.map(p => {
            const hasCode = p.barcode || p.sku;
            if (!hasCode && autoGenBarcodes) {
                // Generate a randomized Code 128 compliant barcode for frames
                return {
                    ...p,
                    barcode: `LF-${Date.now().toString().substring(4)}-${Math.floor(100 + Math.random() * 900)}`
                };
            }
            return p;
        });

        try {
            const res = await fetch('/api/optic/products/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ products: preparedList }),
            });

            if (res.ok) {
                const data = await res.json();
                alert(`🎉 Успех: ${data.message}`);
                setShowImport(false);
                setParsedProducts([]);
                loadProducts(); // Reload catalog grid
            } else {
                const data = await res.json();
                setImportError(data.error || 'Ошибка при сохранении товаров.');
            }
        } catch {
            setImportError('Ошибка сети. Не удалось отправить запрос.');
        } finally {
            setImporting(false);
        }
    };

    const isService = form.category.startsWith('service_');

    // ==================== AI Handler ====================
    const handleAiSend = async () => {
        if (!aiInput.trim() || aiLoading) return;
        const text = aiInput.trim();
        setAiInput('');
        setAiMessages(prev => [...prev, { role: 'user', text }]);
        setAiLoading(true);

        setTimeout(() => aiChatRef.current?.scrollTo({ top: aiChatRef.current.scrollHeight, behavior: 'smooth' }), 100);

        try {
            const res = await fetch('/api/optic/ai-catalog', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text }),
            });
            const data = await res.json();

            if (res.ok && data.products?.length > 0) {
                setAiMessages(prev => [...prev, {
                    role: 'assistant',
                    text: data.message,
                    products: data.products,
                }]);
                await loadProducts(); // refresh catalog
            } else {
                setAiMessages(prev => [...prev, {
                    role: 'assistant',
                    text: data.message || 'Не удалось обработать запрос. Попробуйте иначе.',
                }]);
            }
        } catch {
            setAiMessages(prev => [...prev, {
                role: 'assistant',
                text: '❗ Ошибка соединения. Проверьте ключ OpenAI и попробуйте снова.',
            }]);
        } finally {
            setAiLoading(false);
            setTimeout(() => aiChatRef.current?.scrollTo({ top: aiChatRef.current.scrollHeight, behavior: 'smooth' }), 200);
        }
    };

    // ==================== Stats ====================
    const stats = useMemo(() => {
        const active = products.filter(p => p.isActive);
        const totalProducts = active.filter(p => p.type === 'product').length;
        const totalServices = active.filter(p => p.type === 'service').length;
        const lowStock = active.filter(p => p.type === 'product' && p.currentStock <= p.minStock && p.minStock > 0).length;
        const totalValue = active.reduce((s, p) => s + (p.currentStock * p.retailPrice), 0);
        return { totalProducts, totalServices, lowStock, totalValue };
    }, [products]);

    if (session?.user && clinicPerms && !clinicPerms.canViewCatalog) {
        return <AccessDenied />;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <QuickNav />
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <Link href="/distributor" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-primary-600 mb-1">
                                <ArrowLeft className="w-3 h-3" /> Назад
                            </Link>
                            <h1 className="text-2xl font-bold text-gray-900">Каталог товаров и услуг</h1>
                            <p className="text-sm text-gray-500 mt-1">Управление ассортиментом вашей оптики</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    setParsedProducts([]);
                                    setImportError(null);
                                    setShowImport(true);
                                }}
                                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-medium transition-colors shadow-sm"
                            >
                                <Upload className="w-4 h-4 text-gray-500" />
                                Импорт CSV
                            </button>
                            <button
                                onClick={openCreateForm}
                                className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors shadow-sm"
                            >
                                <Plus className="w-4 h-4" />
                                Добавить
                            </button>
                            <button
                                onClick={() => setShowAI(!showAI)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all shadow-sm ${
                                    showAI
                                        ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white ring-2 ring-purple-300'
                                        : 'bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:from-violet-600 hover:to-purple-600'
                                }`}
                            >
                                <Sparkles className="w-4 h-4" />
                                ИИ-ассистент
                            </button>

                        </div>
                    </div>

                    {/* AI Assistant Panel */}
                    <AnimatePresence>
                        {showAI && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden mb-4"
                            >
                                <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-purple-100 rounded-2xl overflow-hidden">
                                    {/* AI header */}
                                    <div className="flex items-center justify-between px-4 py-3 border-b border-purple-100">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                                                <Bot className="w-4 h-4 text-white" />
                                            </div>
                                            <div>
                                                <span className="font-semibold text-gray-900 text-sm">ИИ-ассистент каталога</span>
                                                <p className="text-[10px] text-purple-500">Напишите товары текстом — добавлю автоматически</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setShowAI(false)} className="text-gray-400 hover:text-gray-600">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Chat messages */}
                                    <div ref={aiChatRef} className="px-4 py-3 space-y-3 max-h-[300px] overflow-y-auto">
                                        {aiMessages.map((msg, i) => (
                                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                                                    msg.role === 'user'
                                                        ? 'bg-primary-600 text-white rounded-br-md'
                                                        : 'bg-white text-gray-700 border border-purple-100 rounded-bl-md shadow-sm'
                                                }`}>
                                                    <div className="whitespace-pre-line">{msg.text}</div>
                                                    {msg.products && msg.products.length > 0 && (
                                                        <div className="mt-2 space-y-1">
                                                            {msg.products.map((p: any, j: number) => (
                                                                <div key={j} className="flex items-center gap-2 bg-green-50 rounded-lg px-2 py-1 text-xs text-green-700">
                                                                    <Package className="w-3 h-3 flex-shrink-0" />
                                                                    <span className="font-medium truncate">{p.name}</span>
                                                                    {p.retailPrice > 0 && <span className="ml-auto font-bold whitespace-nowrap">{p.retailPrice.toLocaleString('ru-RU')} ₸</span>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {aiLoading && (
                                            <div className="flex justify-start">
                                                <div className="bg-white border border-purple-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                                                    <div className="flex items-center gap-2 text-purple-500">
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        <span className="text-sm">Обрабатываю запрос...</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Input */}
                                    <div className="border-t border-purple-100 px-4 py-3">
                                        <form onSubmit={e => { e.preventDefault(); handleAiSend(); }} className="flex gap-2">
                                            <textarea
                                                value={aiInput}
                                                onChange={e => setAiInput(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiSend(); } }}
                                                placeholder="Напр.: Добавь оправы Ray-Ban RB5228 закуп 15000, розница 25000..."
                                                rows={2}
                                                className="flex-1 border border-purple-200 rounded-xl px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white"
                                            />
                                            <button
                                                type="submit"
                                                disabled={!aiInput.trim() || aiLoading}
                                                className="self-end px-4 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-all"
                                            >
                                                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                            </button>
                                        </form>
                                        <p className="text-[10px] text-purple-400 mt-1.5">Можно добавить несколько товаров и услуг одним сообщением • Enter для отправки, Shift+Enter для новой строки</p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                        <div className="bg-blue-50 rounded-xl p-3">
                            <div className="text-2xl font-bold text-blue-700">{stats.totalProducts}</div>
                            <div className="text-xs text-blue-600">Товаров</div>
                        </div>
                        <div className="bg-emerald-50 rounded-xl p-3">
                            <div className="text-2xl font-bold text-emerald-700">{stats.totalServices}</div>
                            <div className="text-xs text-emerald-600">Услуг</div>
                        </div>
                        <div className="bg-amber-50 rounded-xl p-3">
                            <div className="text-2xl font-bold text-amber-700">{stats.lowStock}</div>
                            <div className="text-xs text-amber-600">Мало на складе</div>
                        </div>
                        <div className="bg-purple-50 rounded-xl p-3">
                            <div className="text-2xl font-bold text-purple-700">{fmt(stats.totalValue)} ₸</div>
                            <div className="text-xs text-purple-600">Стоимость склада</div>
                        </div>
                    </div>

                    {/* Search + Category Filter */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Поиск по названию, бренду, артикулу, штрихкоду..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                            {search && (
                                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <X className="w-4 h-4 text-gray-400" />
                                </button>
                            )}
                        </div>
                        <div className="flex gap-1.5 overflow-x-auto pb-1">
                            {CATEGORY_GROUPS.map(g => (
                                <button
                                    key={g.key}
                                    onClick={() => setCategoryFilter(g.key)}
                                    className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                                        categoryFilter === g.key
                                            ? 'bg-primary-600 text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    {g.label}
                                </button>
                            ))}
                            <div className="w-px bg-gray-200 mx-1" />
                            {Object.entries(CATEGORIES).filter(([k]) => !k.startsWith('service_')).map(([key, cat]) => (
                                <button
                                    key={key}
                                    onClick={() => setCategoryFilter(key)}
                                    className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                                        categoryFilter === key
                                            ? 'bg-primary-600 text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>


            {/* Product Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                {filteredProducts.length === 0 ? (
                    <div className="text-center py-20">
                        <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">Нет товаров</p>
                        <button onClick={openCreateForm} className="mt-4 text-primary-600 font-medium text-sm hover:underline">
                            + Добавить первый товар
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredProducts.map(product => {
                            const cat = CATEGORIES[product.category];
                            const CatIcon = cat?.icon || Package;
                            const stock = product.currentStock;
                            const isLow = product.type === 'product' && product.minStock > 0 && stock <= product.minStock;
                            const margin = product.retailPrice - product.purchasePrice;
                            const marginPct = product.purchasePrice > 0 ? Math.round((margin / product.purchasePrice) * 100) : 0;
                            const mainImage = (product.images as string[] | null)?.[0];

                            return (
                                <motion.div
                                    key={product.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                                    onClick={() => setDetailProduct(product)}
                                >
                                    {/* Image */}
                                    <div className="aspect-[4/3] bg-gray-50 relative overflow-hidden">
                                        {mainImage ? (
                                            <img src={mainImage} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <CatIcon className="w-16 h-16 text-gray-200" />
                                            </div>
                                        )}
                                        {/* Category badge */}
                                        <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-semibold ${cat?.color || 'bg-gray-100 text-gray-600'}`}>
                                            {cat?.label || product.category}
                                        </div>
                                        {isLow && (
                                            <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" />
                                                Мало
                                            </div>
                                        )}
                                        {product.isPublic && (
                                            <div className="absolute bottom-3 right-3 px-2 py-1 rounded-full bg-green-500 text-white text-[10px] font-bold">
                                                На витрине
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="p-4">
                                        {product.brand && (
                                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{product.brand}</p>
                                        )}
                                        <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">{product.name}</h3>
                                        {product.shortDescription && (
                                            <p className="text-xs text-gray-500 mt-1 line-clamp-1">{product.shortDescription}</p>
                                        )}

                                        <div className="flex items-end justify-between mt-3">
                                            <div>
                                                <div className="text-lg font-bold text-gray-900">{fmt(product.retailPrice)} ₸</div>
                                                {product.type === 'product' && product.purchasePrice > 0 && (
                                                    <div className="text-[10px] text-gray-400">
                                                        Закуп: {fmt(product.purchasePrice)} ₸ • Маржа {marginPct}%
                                                    </div>
                                                )}
                                            </div>
                                            {product.type === 'product' ? (
                                                <div className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                                                    isLow ? 'bg-red-50 text-red-600' : stock > 0 ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                                                }`}>
                                                    {stock} {product.unit}
                                                </div>
                                            ) : (
                                                <div className="text-xs font-semibold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700">
                                                    Услуга
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="border-t border-gray-50 px-4 py-2.5 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {product.type === 'product' && (
                                            <button
                                                onClick={e => { e.stopPropagation(); openPrintSettings(product); }}
                                                className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors border border-primary-100"
                                            >
                                                <Printer className="w-3.5 h-3.5" /> Печать
                                            </button>
                                        )}
                                        <button
                                            onClick={e => { e.stopPropagation(); openEditForm(product); }}
                                            className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" /> Изменить
                                        </button>
                                        <button
                                            onClick={e => { e.stopPropagation(); handleDelete(product.id); }}
                                            className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" /> Удалить
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ==================== CREATE/EDIT MODAL ==================== */}
            <AnimatePresence>
                {showForm && (
                    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[5vh] overflow-y-auto" onClick={() => setShowForm(false)}>
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mb-[5vh] max-h-[85vh] overflow-y-auto"
                        >
                            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 rounded-t-2xl z-10">
                                <h2 className="text-lg font-bold text-gray-900">
                                    {editProduct ? 'Редактировать' : 'Новый товар / услуга'}
                                </h2>
                            </div>

                            <div className="px-6 py-4 space-y-4">
                                {/* Category */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Категория *</label>
                                    <select
                                        value={form.category}
                                        onChange={e => setForm({ ...form, category: e.target.value })}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    >
                                        <optgroup label="Товары">
                                            <option value="frame">Оправы</option>
                                            <option value="sun_glasses">Солнцезащитные очки</option>
                                            <option value="contact_lens">Контактные линзы</option>
                                            <option value="spectacle_lens">Очковые линзы</option>
                                            <option value="solution">Растворы</option>
                                            <option value="accessory">Аксессуары</option>
                                        </optgroup>
                                        <optgroup label="Услуги">
                                            <option value="service_exam">Проверка зрения</option>
                                            <option value="service_fitting">Подбор линз</option>
                                            <option value="service_cutting">Вытачка / обработка линз</option>
                                            <option value="service_repair">Ремонт очков</option>
                                            <option value="service_other">Другие услуги</option>
                                        </optgroup>
                                    </select>
                                </div>

                                {/* Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Название *</label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                        placeholder={isService ? 'Проверка зрения (полная)' : 'Ray-Ban RB5228'}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                </div>

                                {/* Brand + Model (only for products) */}
                                {!isService && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Бренд</label>
                                            <input type="text" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })}
                                                placeholder="Ray-Ban" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Модель</label>
                                            <input type="text" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })}
                                                placeholder="RB5228" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500" />
                                        </div>
                                    </div>
                                )}

                                {/* SKU + Barcode */}
                                {!isService && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Артикул (SKU)</label>
                                            <input type="text" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })}
                                                placeholder="F-001" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Штрих-код</label>
                                            <input type="text" value={form.barcode} onChange={e => setForm({ ...form, barcode: translateCyrillicToEnglishLayout(e.target.value) })}
                                                placeholder="4607022980001" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500" />
                                        </div>
                                    </div>
                                )}

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Краткое описание</label>
                                    <textarea
                                        value={form.shortDescription}
                                        onChange={e => setForm({ ...form, shortDescription: e.target.value })}
                                        placeholder="Классическая прямоугольная оправа из ацетата..."
                                        rows={2}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 resize-none"
                                    />
                                </div>

                                {/* Prices */}
                                <div className="grid grid-cols-2 gap-3">
                                    {!isService && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Закупочная цена (₸)</label>
                                            <input type="number" value={form.purchasePrice} onChange={e => setForm({ ...form, purchasePrice: e.target.value })}
                                                placeholder="15000" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500" />
                                        </div>
                                    )}
                                    <div className={isService ? 'col-span-2' : ''}>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            {isService ? 'Стоимость услуги (₸)' : 'Розничная цена (₸)'}
                                        </label>
                                        <input type="number" value={form.retailPrice} onChange={e => setForm({ ...form, retailPrice: e.target.value })}
                                            placeholder="25000" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500" />
                                    </div>
                                </div>

                                {/* Stock settings (only products) */}
                                {!isService && (
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Мин. остаток</label>
                                            <input type="number" value={form.minStock} onChange={e => setForm({ ...form, minStock: e.target.value })}
                                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Ед. измерения</label>
                                            <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}
                                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500">
                                                <option value="шт">шт</option>
                                                <option value="упак">упак</option>
                                                <option value="мл">мл</option>
                                                <option value="пара">пара</option>
                                            </select>
                                        </div>
                                        <div className="flex items-end pb-1">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" checked={form.trackSerials}
                                                    onChange={e => setForm({ ...form, trackSerials: e.target.checked })}
                                                    className="w-4 h-4 rounded border-gray-300 text-primary-600" />
                                                <span className="text-xs text-gray-600">Серийный учёт</span>
                                            </label>
                                        </div>
                                    </div>
                                )}

                                {/* Public toggle */}
                                <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer">
                                    <input type="checkbox" checked={form.isPublic}
                                        onChange={e => setForm({ ...form, isPublic: e.target.checked })}
                                        className="w-4 h-4 rounded border-gray-300 text-primary-600" />
                                    <div>
                                        <span className="text-sm font-medium text-gray-700">Показывать на витрине</span>
                                        <p className="text-xs text-gray-400">Будет виден на публичной странице оптики</p>
                                    </div>
                                </label>
                            </div>

                            {/* Footer */}
                            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3 rounded-b-2xl z-10">
                                <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                                    Отмена
                                </button>
                                {!isService && editProduct && (
                                    <button
                                        type="button"
                                        onClick={handlePrintLabelFromForm}
                                        className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
                                    >
                                        <Printer className="w-4 h-4 text-gray-500" /> Печать
                                    </button>
                                )}
                                <button
                                    onClick={handleSave}
                                    disabled={!form.name || saving}
                                    className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
                                >
                                    {saving ? 'Сохранение...' : editProduct ? 'Сохранить' : 'Создать'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ==================== DETAIL MODAL ==================== */}
            <AnimatePresence>
                {detailProduct && (
                    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[5vh] overflow-y-auto" onClick={() => setDetailProduct(null)}>
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mb-[5vh]"
                        >
                            {/* Image */}
                            <div className="aspect-video bg-gray-50 rounded-t-2xl overflow-hidden relative">
                                {(detailProduct.images as string[] | null)?.[0] ? (
                                    <img src={(detailProduct.images as string[])[0]} alt={detailProduct.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <ImageIcon className="w-20 h-20 text-gray-200" />
                                    </div>
                                )}
                                <button onClick={() => setDetailProduct(null)} className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center">
                                    <X className="w-4 h-4 text-gray-700" />
                                </button>
                                <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-semibold ${CATEGORIES[detailProduct.category]?.color || 'bg-gray-100'}`}>
                                    {CATEGORIES[detailProduct.category]?.label || detailProduct.category}
                                </div>
                            </div>

                            <div className="p-6">
                                {detailProduct.brand && (
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{detailProduct.brand}</p>
                                )}
                                <h2 className="text-xl font-bold text-gray-900">{detailProduct.name}</h2>
                                {detailProduct.shortDescription && (
                                    <p className="text-sm text-gray-500 mt-2">{detailProduct.shortDescription}</p>
                                )}

                                {/* Prices */}
                                <div className="mt-4 flex items-baseline gap-4">
                                    <span className="text-2xl font-bold text-gray-900">{fmt(detailProduct.retailPrice)} ₸</span>
                                    {detailProduct.type === 'product' && detailProduct.purchasePrice > 0 && (
                                        <span className="text-sm text-gray-400">Закуп: {fmt(detailProduct.purchasePrice)} ₸</span>
                                    )}
                                </div>

                                {/* Details grid */}
                                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                                    {detailProduct.sku && (
                                        <div className="bg-gray-50 rounded-lg px-3 py-2">
                                            <span className="text-gray-400 text-xs">Артикул</span>
                                            <p className="font-medium text-gray-700">{detailProduct.sku}</p>
                                        </div>
                                    )}
                                    {detailProduct.barcode && (
                                        <div className="bg-gray-50 rounded-lg px-3 py-2">
                                            <span className="text-gray-400 text-xs">Штрих-код</span>
                                            <p className="font-medium text-gray-700">{detailProduct.barcode}</p>
                                        </div>
                                    )}
                                    {detailProduct.type === 'product' && (
                                        <div className={`rounded-lg px-3 py-2 ${
                                            detailProduct.currentStock <= 0 ? 'bg-gray-50' :
                                            detailProduct.minStock > 0 && detailProduct.currentStock <= detailProduct.minStock ? 'bg-red-50' :
                                            'bg-green-50'
                                        }`}>
                                            <span className="text-gray-400 text-xs">Остаток на складе</span>
                                            <p className={`text-lg font-bold ${
                                                detailProduct.currentStock <= 0 ? 'text-gray-500' :
                                                detailProduct.minStock > 0 && detailProduct.currentStock <= detailProduct.minStock ? 'text-red-600' :
                                                'text-green-700'
                                            }`}>
                                                {detailProduct.currentStock} {detailProduct.unit}
                                            </p>
                                            <span className="text-[10px] text-gray-400">Изменяется через приход/списание</span>
                                        </div>
                                    )}
                                    {detailProduct.type === 'product' && detailProduct.purchasePrice > 0 && (
                                        <div className="bg-gray-50 rounded-lg px-3 py-2">
                                            <span className="text-gray-400 text-xs">Маржа</span>
                                            <p className="font-medium text-green-700">
                                                {fmt(detailProduct.retailPrice - detailProduct.purchasePrice)} ₸
                                                ({Math.round(((detailProduct.retailPrice - detailProduct.purchasePrice) / detailProduct.purchasePrice) * 100)}%)
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Specs */}
                                {detailProduct.specs && Object.keys(detailProduct.specs as object).length > 0 && (
                                    <div className="mt-4">
                                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Характеристики</h3>
                                        <div className="space-y-1.5">
                                            {Object.entries(detailProduct.specs as Record<string, string>).map(([k, v]) => (
                                                <div key={k} className="flex justify-between text-sm">
                                                    <span className="text-gray-400">{k}</span>
                                                    <span className="text-gray-700 font-medium">{v}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="mt-6 flex gap-3">
                                    {detailProduct.type === 'product' && (
                                        <button
                                            onClick={() => openPrintSettings(detailProduct)}
                                            className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
                                        >
                                            <Printer className="w-4 h-4" /> Печать этикетки
                                        </button>
                                    )}
                                    <button
                                        onClick={() => { setDetailProduct(null); openEditForm(detailProduct); }}
                                        className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Edit2 className="w-4 h-4" /> Редактировать
                                    </button>
                                    <button
                                        onClick={() => { handleDelete(detailProduct.id); setDetailProduct(null); }}
                                        className="py-2.5 px-4 border border-red-200 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ==================== CSV BULK IMPORT MODAL ==================== */}
            <AnimatePresence>
                {showImport && (
                    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[5vh] overflow-y-auto" onClick={() => setShowImport(false)}>
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-md" />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="relative bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl max-w-3xl w-full border border-white/20 mb-[5vh] max-h-[90vh] flex flex-col overflow-hidden"
                        >
                            {/* Sticky Header */}
                            <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-5 flex items-center justify-between z-10">
                                <div>
                                    <h2 className="text-xl font-black text-gray-900 flex items-center gap-2.5">
                                        <Upload className="w-5 h-5 text-primary-600 animate-pulse" /> Импорт каталога товаров и оправ
                                    </h2>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Загрузите Excel CSV-файл для быстрого наполнения каталога сотнями оправ
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowImport(false)}
                                    className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center"
                                >
                                    <X className="w-4 h-4 text-gray-500" />
                                </button>
                            </div>

                            {/* Main Body */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {/* Instruction Card */}
                                <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 border border-blue-100/70 rounded-2xl p-5 flex items-start gap-4">
                                    <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600">
                                        <Bot className="w-5 h-5 animate-bounce" />
                                    </div>
                                    <div className="space-y-1.5 flex-1">
                                        <h3 className="text-sm font-bold text-blue-900">Инструкция по заполнению:</h3>
                                        <p className="text-xs text-blue-700/80 leading-relaxed">
                                            Скачайте готовый шаблон, добавьте ваши оправы, линзы или услуги и сохраните как <strong>CSV (разделители - точки с запятой)</strong>. 
                                            Наша умная система автоматически распознает кодировки Cyrillic (BOM), разделители и применит нужные категории.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={handleDownloadTemplate}
                                            className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-100 transition-all active:scale-95"
                                        >
                                            <Upload className="w-3.5 h-3.5 rotate-180" /> Скачать CSV Шаблон
                                        </button>
                                    </div>
                                </div>

                                {/* Drag-and-drop / File Selector */}
                                {parsedProducts.length === 0 ? (
                                    <label className="relative flex flex-col items-center justify-center p-10 border-2 border-dashed border-gray-300 hover:border-primary-500 bg-gray-50/50 hover:bg-primary-50/20 rounded-2xl cursor-pointer transition-all group">
                                        <input
                                            type="file"
                                            accept=".csv"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                        />
                                        <div className="w-16 h-16 rounded-2xl bg-white shadow-md border border-gray-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                            <Upload className="w-8 h-8 text-primary-500" />
                                        </div>
                                        <span className="text-sm font-bold text-gray-700 mt-4 group-hover:text-primary-700 transition-colors">
                                            Выберите или перетащите CSV-файл
                                        </span>
                                        <span className="text-xs text-gray-400 mt-1">
                                            Поддерживаются файлы .csv объёмом до 10 МБ
                                        </span>
                                    </label>
                                ) : (
                                    <div className="space-y-4">
                                        {/* Loaded file indicator */}
                                        <div className="flex items-center justify-between p-4 bg-emerald-50/60 border border-emerald-100 rounded-2xl">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                                                    <Package className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <span className="text-sm font-bold text-gray-900">Успешно распознано: {parsedProducts.length} строк</span>
                                                    <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Все данные валидированы и готовы к импорту</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setParsedProducts([])}
                                                className="px-3.5 py-1.5 bg-white hover:bg-red-50 hover:text-red-600 border border-gray-200 hover:border-red-100 rounded-xl text-xs font-semibold text-gray-600 transition-colors"
                                            >
                                                Сбросить файл
                                            </button>
                                        </div>

                                        {/* Barcode Autogen Options */}
                                        <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-200/50">
                                            <label className="flex items-start gap-3 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={autoGenBarcodes}
                                                    onChange={e => setAutoGenBarcodes(e.target.checked)}
                                                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 mt-0.5"
                                                />
                                                <div>
                                                    <span className="text-xs font-bold text-gray-800">Авто-генерация штрихкодов для оправ без кодов</span>
                                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                                        Для всех оправ и товаров без готовых штрихкодов в CSV мы автоматически сгенерируем уникальные коды в формате LF-EAN для последующей печати.
                                                    </p>
                                                </div>
                                            </label>
                                        </div>

                                        {/* Live Validation Grid */}
                                        <div className="space-y-2">
                                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest block">Предварительный просмотр данных</span>
                                            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm max-h-[250px] overflow-y-auto">
                                                <table className="w-full text-left border-collapse bg-white">
                                                    <thead>
                                                        <tr className="bg-gray-50/80 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                                                            <th className="px-4 py-2.5">Наименование</th>
                                                            <th className="px-4 py-2.5">Бренд / Модель</th>
                                                            <th className="px-4 py-2.5">Категория</th>
                                                            <th className="px-4 py-2.5 text-right">Штрихкод</th>
                                                            <th className="px-4 py-2.5 text-right">Цены (Закуп/Рознич)</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50 text-xs">
                                                        {parsedProducts.map((p, idx) => (
                                                            <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                                                <td className="px-4 py-3 font-semibold text-gray-900 truncate max-w-[200px]" title={p.name}>
                                                                    {p.name}
                                                                </td>
                                                                <td className="px-4 py-3 text-gray-500">
                                                                    {p.brand || '—'} {p.model ? `/ ${p.model}` : ''}
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-700 uppercase">
                                                                        {CATEGORIES[p.category]?.label || p.category || 'оправа'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3 text-right font-mono text-[10px]">
                                                                    {p.barcode ? (
                                                                        <span className="text-gray-900 font-semibold">{p.barcode}</span>
                                                                    ) : autoGenBarcodes ? (
                                                                        <span className="text-violet-600 font-semibold italic flex items-center justify-end gap-1">
                                                                            <Sparkles className="w-3 h-3 text-violet-500 animate-spin" /> Автокод
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-amber-500 font-medium italic">нет кода</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                                                    <span className="text-gray-400">{p.purchasePrice ? fmt(p.purchasePrice) : '0'} ₸</span>
                                                                    <span className="text-gray-300 mx-1">/</span>
                                                                    <span className="font-bold text-gray-900">{fmt(p.retailPrice)} ₸</span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Error Card */}
                                {importError && (
                                    <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex gap-3 text-red-700">
                                        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
                                        <div className="space-y-1">
                                            <span className="text-sm font-bold">Не удалось загрузить данные</span>
                                            <p className="text-xs leading-relaxed text-red-600/90">{importError}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Sticky Footer */}
                            <div className="sticky bottom-0 bg-white/80 backdrop-blur-md border-t border-gray-100 px-6 py-4 flex gap-3 z-10">
                                <button
                                    onClick={() => setShowImport(false)}
                                    className="flex-1 py-3 border border-gray-200 hover:bg-gray-50 rounded-xl text-sm font-bold text-gray-600 transition-colors"
                                >
                                    Отмена
                                </button>
                                <button
                                    onClick={handleImportSubmit}
                                    disabled={parsedProducts.length === 0 || importing}
                                    className="flex-1 py-3 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 disabled:opacity-40 disabled:pointer-events-none text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-primary-100 flex items-center justify-center gap-2"
                                >
                                    {importing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" /> Импорт...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-4 h-4" /> Начать импорт ({parsedProducts.length})
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ==================== PRINT SETTINGS MODAL ==================== */}
            <AnimatePresence>
                {printProduct && (
                    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[8vh] overflow-y-auto" onClick={() => setPrintProduct(null)}>
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-md" />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 30 }}
                            onClick={e => e.stopPropagation()}
                            className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100"
                        >
                            {/* Sticky Header */}
                            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
                                <div>
                                    <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                                        <Printer className="w-5 h-5 text-primary-600 animate-pulse" /> Настройки печати этикетки
                                    </h2>
                                    <p className="text-[11px] text-gray-500 mt-0.5">Укажите размеры и включите нужные поля</p>
                                </div>
                                <button onClick={() => setPrintProduct(null)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center">
                                    <X className="w-4 h-4 text-gray-500" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-6">
                                {/* Label Live Preview */}
                                <div className="flex flex-col items-center justify-center p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200/80 mb-2">
                                    <span className="text-[9px] font-bold text-gray-400 mb-3 uppercase tracking-widest">Макет этикетки (Интерактивный)</span>
                                    
                                    {/* The interactive label container */}
                                    <div
                                        style={{
                                            width: '260px',
                                            height: `${Math.max(70, Math.round(260 * (labelHeight / labelWidth)))}px`,
                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        }}
                                        className="bg-white border border-gray-300 rounded shadow-lg p-3 flex flex-col justify-between items-center overflow-hidden box-border select-none relative"
                                    >
                                        {labelWidth === 72 && labelHeight === 10 ? (
                                            <div className="w-full h-full flex justify-between items-stretch text-[5.5px]">
                                                {/* Left zone: Info */}
                                                <div className="w-[42%] flex flex-col justify-between items-start text-left overflow-hidden py-0.5">
                                                    {includeBrand && (
                                                        <div className="font-extrabold text-[4.5px] text-gray-500 uppercase tracking-wide truncate w-full">
                                                            {printProduct.brand || 'ОПТИКА'}
                                                        </div>
                                                    )}
                                                    {includeName && (
                                                        <div className="font-bold text-black truncate w-full line-clamp-1">
                                                            {printProduct.name}
                                                        </div>
                                                    )}
                                                    {includePrice && (
                                                        <div className="font-black text-black text-[6px]">
                                                            {printProduct.retailPrice?.toLocaleString('ru-RU')} ₸
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Middle bridge / non-adhesive tail */}
                                                <div className="w-[16%] border-x border-dashed border-gray-200 flex items-center justify-center bg-gray-50/50">
                                                    <span className="text-[3.5px] text-gray-400 font-bold uppercase tracking-tighter scale-75 whitespace-nowrap rotate-90">хвост</span>
                                                </div>

                                                {/* Right zone: Barcode */}
                                                <div className="w-[42%] flex flex-col items-center justify-center py-0.5 overflow-hidden">
                                                    <div className="w-[90%] h-4 flex justify-between items-stretch">
                                                        {[1,2,1,3,1,2,1,4,1,2,1,2,1].map((w, idx) => (
                                                            <div
                                                                key={idx}
                                                                className="bg-black"
                                                                style={{
                                                                    width: `${w * 0.45}px`,
                                                                    opacity: idx % 2 === 0 ? 1 : 0
                                                                }}
                                                            />
                                                        ))}
                                                    </div>
                                                    <div className="text-[4px] font-mono text-gray-500 mt-0.5 scale-90 tracking-tighter">
                                                        {printProduct.barcode || printProduct.sku || '1234567890'}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                {includeBrand && (
                                                    <div className="text-[9px] font-black text-gray-500 uppercase tracking-wide truncate w-full text-center">
                                                        {printProduct.brand || 'ОПТИКА'}
                                                    </div>
                                                )}
                                                {includeName && (
                                                    <div className="text-[10px] font-bold text-black text-center line-clamp-2 leading-tight w-full my-0.5">
                                                        {printProduct.name}
                                                    </div>
                                                )}
                                                
                                                {/* Simulated Barcode */}
                                                <div className="w-full flex flex-col items-center justify-center my-1">
                                                    <div className="w-[85%] h-5 flex justify-between items-stretch">
                                                        {[1,3,2,1,4,2,1,3,2,1,4,1,2,3,1,2,1,4,2,1,3,2,1,2].map((w, idx) => (
                                                            <div
                                                                key={idx}
                                                                className="bg-black"
                                                                style={{
                                                                    width: `${w * 0.7}px`,
                                                                    opacity: idx % 2 === 0 ? 1 : 0
                                                                }}
                                                            />
                                                        ))}
                                                    </div>
                                                    {labelHeight > 25 && (
                                                        <div className="text-[7.5px] font-mono text-gray-700 mt-0.5 tracking-[1.5px]">
                                                            {printProduct.barcode || printProduct.sku || '1234567890'}
                                                        </div>
                                                    )}
                                                </div>

                                                {includePrice && (
                                                    <div className="text-xs font-black text-black tracking-tight">
                                                        {printProduct.retailPrice?.toLocaleString('ru-RU')} ₸
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-gray-500 mt-3 font-semibold">Размер на печати: {labelWidth} x {labelHeight} мм</span>
                                </div>

                                {/* Size selection */}
                                <div className="space-y-3">
                                    <label className="block text-sm font-semibold text-gray-900">1. Выберите стандартный размер или укажите свой:</label>
                                    
                                    {/* Presets */}
                                    <div className="grid grid-cols-4 gap-2">
                                        {[
                                            { w: 58, h: 30, label: '58x30 мм (Стандарт)' },
                                            { w: 40, h: 30, label: '40x30 мм' },
                                            { w: 30, h: 20, label: '30x20 мм (Мини)' },
                                            { w: 72, h: 10, label: '72x10 мм (Оправы)' },
                                        ].map((preset, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => {
                                                    setLabelWidth(preset.w);
                                                    setLabelHeight(preset.h);
                                                }}
                                                className={`py-2 px-1 text-center rounded-xl text-[10px] font-bold border transition-all ${
                                                    labelWidth === preset.w && labelHeight === preset.h
                                                        ? 'bg-primary-50 border-primary-500 text-primary-700 ring-1 ring-primary-500 shadow-sm'
                                                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                                }`}
                                            >
                                                {preset.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Custom inputs */}
                                    <div className="grid grid-cols-2 gap-3 pt-1">
                                        <div>
                                            <span className="block text-[11px] text-gray-400 font-medium mb-1">Ширина (мм)</span>
                                            <input
                                                type="number"
                                                value={labelWidth}
                                                onChange={e => setLabelWidth(Math.max(15, Number(e.target.value)))}
                                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent font-medium"
                                                placeholder="58"
                                            />
                                        </div>
                                        <div>
                                            <span className="block text-[11px] text-gray-400 font-medium mb-1">Высота (мм)</span>
                                            <input
                                                type="number"
                                                value={labelHeight}
                                                onChange={e => setLabelHeight(Math.max(10, Number(e.target.value)))}
                                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent font-medium"
                                                placeholder="30"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Custom Toggles */}
                                <div className="space-y-2.5 pt-1">
                                    <label className="block text-sm font-semibold text-gray-900">2. Дополнительные опции:</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <label className="flex items-center gap-2 p-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl cursor-pointer transition-colors border border-gray-100">
                                            <input
                                                type="checkbox"
                                                checked={includeName}
                                                onChange={e => setIncludeName(e.target.checked)}
                                                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                            />
                                            <div>
                                                <span className="text-xs font-semibold text-gray-800">Название</span>
                                            </div>
                                        </label>
                                        <label className="flex items-center gap-2 p-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl cursor-pointer transition-colors border border-gray-100">
                                            <input
                                                type="checkbox"
                                                checked={includeBrand}
                                                onChange={e => setIncludeBrand(e.target.checked)}
                                                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                            />
                                            <div>
                                                <span className="text-xs font-semibold text-gray-800">Бренд</span>
                                            </div>
                                        </label>
                                        <label className="flex items-center gap-2 p-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl cursor-pointer transition-colors border border-gray-100">
                                            <input
                                                type="checkbox"
                                                checked={includePrice}
                                                onChange={e => setIncludePrice(e.target.checked)}
                                                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                            />
                                            <div>
                                                <span className="text-xs font-semibold text-gray-800">Цена</span>
                                            </div>
                                        </label>
                                    </div>
                                    
                                    {/* Print Alignment selector */}
                                    <div className="mt-3">
                                        <span className="block text-[11px] text-gray-400 font-bold mb-1 uppercase tracking-wider">Корректировка сдвига (Для Gprinter/Xprinter)</span>
                                        <select
                                            value={printAlignment}
                                            onChange={e => setPrintAlignment(e.target.value as 'left' | 'center' | 'right')}
                                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white shadow-sm"
                                        >
                                            <option value="left">По умолчанию (Слева)</option>
                                            <option value="center">Сдвинуть в центр (+4 мм вправо)</option>
                                            <option value="right">Сдвинуть вправо (+8 мм вправо - Для Gprinter)</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Direct WebUSB & Web Serial Print Block */}
                                <div className="space-y-3 pt-4 border-t border-gray-100">
                                    <div className="flex items-center justify-between">
                                        <label className="block text-sm font-semibold text-gray-900">
                                            3. Прямая печать (Без драйверов и ОС):
                                        </label>
                                        <span className="text-[10px] bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">
                                            Premium
                                        </span>
                                    </div>

                                    {usbError && (
                                        <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-2xl text-[11px] text-rose-700 font-medium space-y-1.5 animate-fadeIn">
                                            <div className="font-bold flex items-center gap-1">
                                                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                                                Ошибка принтера: {usbError}
                                            </div>
                                            <p className="text-rose-600/90 leading-normal">
                                                {usbError.includes('claimInterface') || usbError.includes('Access denied') || usbError.includes('security') || usbError.includes('transferOut') ? (
                                                    <>
                                                        <strong>Причина:</strong> Операционная система macOS/Windows заблокировала прямое USB-подключение (CUPS драйвер удерживает принтер).<br />
                                                        <strong>Решение:</strong> Попробуйте <strong>Способ Б (Serial/COM)</strong> ниже, который легко обходит блокировку ОС, либо удалите принтер из системных настроек Printers.
                                                    </>
                                                ) : (
                                                    'Убедитесь, что принтер включен, кабель USB подключен надежно, и вы используете Chrome/Edge.'
                                                )}
                                            </p>
                                        </div>
                                    )}
                                    
                                    <div className="p-4 bg-gray-50 border border-gray-200/65 rounded-2xl space-y-4">
                                        {/* Status info */}
                                        <div className="flex items-center justify-between border-b border-gray-200/60 pb-2">
                                            <span className="text-xs text-gray-500 font-medium">Статус принтера:</span>
                                            {usbDevice ? (
                                                <span className="text-xs text-emerald-600 font-bold flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                                    USB-соединение установлено: {usbDevice.productName || 'Printer'}
                                                </span>
                                            ) : serialPort ? (
                                                <span className="text-xs text-emerald-600 font-bold flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                                    Serial-соединение установлено (COM)
                                                </span>
                                            ) : (
                                                <span className="text-xs text-amber-500 font-bold">Не подключен</span>
                                            )}
                                        </div>

                                        {/* Option buttons */}
                                        <div className="grid grid-cols-2 gap-3">
                                            {/* Way A: WebUSB */}
                                            <div className="space-y-1.5">
                                                <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider">Способ А (Прямой USB)</span>
                                                <button
                                                    type="button"
                                                    onClick={connectUsbPrinter}
                                                    disabled={usbConnecting}
                                                    className={`w-full py-2 px-2 text-xs font-bold rounded-xl transition-all border shadow-sm flex items-center justify-center gap-1.5 ${
                                                        usbDevice 
                                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                                                            : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
                                                    }`}
                                                >
                                                    {usbConnecting ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <Printer className="w-3.5 h-3.5" />
                                                    )}
                                                    {usbDevice ? 'USB Подключен' : 'Найти USB'}
                                                </button>
                                            </div>

                                            {/* Way B: Web Serial */}
                                            <div className="space-y-1.5">
                                                <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider">Способ Б (Serial/COM)</span>
                                                {!serialPort && (
                                                    <select
                                                        value={baudRate}
                                                        onChange={e => setBaudRate(Number(e.target.value))}
                                                        className="w-full border border-gray-200 rounded-xl px-2 py-1 text-[10px] font-bold focus:ring-1 focus:ring-primary-500 bg-white mb-1 shadow-sm"
                                                    >
                                                        <option value={9600}>9600 (Стандарт Xprinter)</option>
                                                        <option value={38400}>38400 (Стандарт Godex)</option>
                                                        <option value={115200}>115200 (Zebra/Высокая)</option>
                                                    </select>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={connectSerialPrinter}
                                                    disabled={serialConnecting}
                                                    className={`w-full py-2 px-2 text-xs font-bold rounded-xl transition-all border shadow-sm flex items-center justify-center gap-1.5 ${
                                                        serialPort 
                                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                                                            : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
                                                    }`}
                                                >
                                                    {serialConnecting ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <Bot className="w-3.5 h-3.5" />
                                                    )}
                                                    {serialPort ? 'Serial Подключен' : 'Найти Serial'}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Serial Troubleshooting Hint */}
                                        {serialPort && (
                                            <div className="text-[10px] text-blue-700 font-semibold leading-normal bg-blue-50/70 p-2.5 rounded-xl border border-blue-100/50 mt-1 animate-fadeIn">
                                                💡 <strong>Принтер молчит?</strong> Нажмите кнопку «Отключить» ниже, измените скорость (например, выберите <strong>115200</strong>) и подключитесь заново!
                                            </div>
                                        )}

                                        {/* Language selector (only visible if any is connected) */}
                                        {(usbDevice || serialPort) && (
                                            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200/50">
                                                <div>
                                                    <span className="block text-[10px] text-gray-400 font-bold mb-1 uppercase tracking-wider">Язык принтера</span>
                                                    <select
                                                        value={printerLanguage}
                                                        onChange={e => setPrinterLanguage(e.target.value as 'tspl' | 'zpl')}
                                                        className="w-full border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-bold focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white shadow-sm"
                                                    >
                                                        <option value="tspl">TSPL (Xprinter, TSC)</option>
                                                        <option value="zpl">ZPL (Zebra, Godex)</option>
                                                    </select>
                                                </div>
                                                <div className="flex items-end">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setUsbDevice(null);
                                                            setSerialPort(null);
                                                            setUsbError(null);
                                                        }}
                                                        className="w-full py-1.5 border border-rose-200 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors bg-white shadow-sm"
                                                    >
                                                        Отключить
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Sticky Footer */}
                            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3 z-10">
                                <button
                                    onClick={() => setPrintProduct(null)}
                                    className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                    Отмена
                                </button>
                                {usbDevice ? (
                                    <>
                                        <button
                                            onClick={() => {
                                                handlePrintLabel(printProduct, labelWidth, labelHeight, includePrice, includeBrand);
                                                setPrintProduct(null);
                                            }}
                                            className="flex-1 py-3 border border-indigo-100 hover:bg-indigo-50/50 text-indigo-700 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                                        >
                                            Через браузер
                                        </button>
                                        <button
                                            onClick={() => {
                                                printViaUsb();
                                                setPrintProduct(null);
                                            }}
                                            className="flex-1 py-3 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-primary-100 flex items-center justify-center gap-2"
                                        >
                                            <Printer className="w-4 h-4" /> По USB
                                        </button>
                                    </>
                                ) : serialPort ? (
                                    <>
                                        <button
                                            onClick={() => {
                                                handlePrintLabel(printProduct, labelWidth, labelHeight, includePrice, includeBrand);
                                                setPrintProduct(null);
                                            }}
                                            className="flex-1 py-3 border border-indigo-100 hover:bg-indigo-50/50 text-indigo-700 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                                        >
                                            Через браузер
                                        </button>
                                        <button
                                            onClick={() => {
                                                printViaSerial();
                                                setPrintProduct(null);
                                            }}
                                            className="flex-1 py-3 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-primary-100 flex items-center justify-center gap-2"
                                        >
                                            <Printer className="w-4 h-4" /> По Serial
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => {
                                            handlePrintLabel(printProduct, labelWidth, labelHeight, includePrice, includeBrand);
                                            setPrintProduct(null);
                                        }}
                                        className="flex-1 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-md shadow-primary-100"
                                    >
                                        <Printer className="w-4 h-4" /> Распечатать
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
