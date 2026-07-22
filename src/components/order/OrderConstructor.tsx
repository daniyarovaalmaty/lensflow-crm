'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { CreateOrderSchema, type CreateOrderDTO, ColorsByDk } from '@/types/order';
import { EyeParametersCard } from './EyeParametersCard';
import { ReadOnlyEyeCard } from './ReadOnlyEyeCard';
import { MediLensCalculator } from './MediLensCalculator';
import { Copy, Package, User, Building2, Truck, Receipt, Zap, Clock, Plus, Minus, Droplets, Wrench, ShoppingCart, Camera, Eye, Factory, X, Sparkles, CheckCircle } from 'lucide-react';
import { parseOrderTableRow } from '@/lib/orderParser';

interface CatalogProduct {
    id: string;
    name: string;
    category: string;
    sku: string | null;
    description: string | null;
    price?: number; // undefined for doctors
    priceByDk?: Record<string, number> | null; // DK-specific prices: { "50": 15000, "100": 18500, ... }
    distributorPriceByDk?: Record<string, number> | null; // Distributor-specific DK prices
    unit: string;
}

interface SelectedProduct {
    productId: string;
    name: string;
    category: string;
    qty: number;
    price: number;
}

const CATEGORY_ICONS: Record<string, any> = {
    lens: Package,
    solution: Droplets,
    accessory: Wrench,
};

const CATEGORY_COLORS: Record<string, string> = {
    lens: 'bg-blue-100 text-blue-700',
    solution: 'bg-emerald-100 text-emerald-700',
    accessory: 'bg-orange-100 text-orange-700',
};

const CATEGORY_LABELS: Record<string, string> = {
    lens: 'Линзы',
    solution: 'Растворы',
    accessory: 'Аксессуары',
};

interface OrderConstructorProps {
    opticId: string;
    onSubmit: (data: CreateOrderDTO & { products?: SelectedProduct[] }) => Promise<void>;
}

export function OrderConstructor({ opticId, onSubmit }: OrderConstructorProps) {
    const { data: session } = useSession();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formErrors, setFormErrors] = useState<string[]>([]);
    const errorsRef = useRef<HTMLDivElement>(null);
    const [distributorClients, setDistributorClients] = useState<any[]>([]);
    const [contracts, setContracts] = useState<any[]>([]);
    const [smartParseInput, setSmartParseInput] = useState('');
    const [smartParseSuccess, setSmartParseSuccess] = useState(false);

    const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
    const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
    const [rgpPhotos, setRgpPhotos] = useState<{ od?: File; os?: File }>({});
    const [orgDiscount, setOrgDiscount] = useState<number>(0);
    const [partnerLab, setPartnerLab] = useState<{ id: string; name: string } | null>(null);
    const [singleEye, setSingleEye] = useState<'both' | 'od' | 'os'>('both');
    const [distributors, setDistributors] = useState<{ id: string; name: string; city?: string }[]>([]);
    const [selectedDistributorId, setSelectedDistributorId] = useState<string>('');
    const [recipientType, setRecipientType] = useState<'laboratory' | 'distributor'>('laboratory');
    const [branches, setBranches] = useState<{ id: string; name: string; recipientType?: string; recipientOrgId?: string | null; recipientLabel?: string; inn?: string | null; deliveryAddress?: string | null; address?: string | null; directorName?: string | null; city?: string | null }[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<string>('');
    const [confirmData, setConfirmData] = useState<any>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const subRole = session?.user?.subRole || '';
    const userRole = session?.user?.role || '';
    const isProcurement = subRole === 'optic_procurement';
    const isDistributor = userRole === 'distributor';
    const canSeePrices = userRole === 'optic'
        ? ['optic_manager', 'optic_accountant'].includes(subRole)
        : true;

    const {
        register,
        handleSubmit,
        setValue,
        getValues,
        watch,
        formState: { errors },
    } = useForm<CreateOrderDTO>({
        resolver: zodResolver(CreateOrderSchema),
        defaultValues: {
            optic_id: opticId,
            doctor: ['optic_doctor', 'optic_ophthalmologist', 'optic_orthokeratologist'].includes(subRole) ? (session?.user?.profile?.fullName || '') : '',
            is_urgent: false,
            patient: {
                name: '',
                phone: '',
            },
            company: '',
            inn: '',
            delivery_method: '',
            delivery_address: '',
            doctor_email: '',
            config: {
                type: 'medilens',
                eyes: {
                    od: { qty: 1 },
                    os: { qty: 1 },
                },
            },
        },
    });

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/catalog');
                if (res.ok) {
                    const data = await res.json();
                    setCatalog(data);
                }
            } catch (e) { console.error(e); }
        })();
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/distributors');
                if (res.ok) setDistributors(await res.json());
            } catch (e) { /* no distributors is fine */ }
        })();

        // Fetch user's contracts
        if (!isDistributor && !isProcurement) {
            (async () => {
                try {
                    const res = await fetch('/api/optic/contracts');
                    if (res.ok) setContracts(await res.json());
                } catch (e) {}
            })();
        }
    }, [isDistributor, isProcurement]);

    useEffect(() => {
        if (session?.user?.role === 'distributor') {
            fetch('/api/distributor/clients')
                .then(r => r.json())
                .then(data => {
                    if (Array.isArray(data)) setDistributorClients(data);
                })
                .catch(err => console.error('Failed to fetch distributor clients:', err));
        }
    }, [session?.user?.role]);

    // Load branches for non-distributor users
    useEffect(() => {
        if (isDistributor) return;
        (async () => {
            try {
                const res = await fetch('/api/organizations/branches');
                if (res.ok) setBranches(await res.json());
            } catch (e) { /* ignore */ }
        })();
    }, [isDistributor]);

    // Auto-select recipient and contract when branch is selected
    useEffect(() => {
        if (!selectedBranchId) return;
        const branch = branches.find(b => b.id === selectedBranchId);
        if (!branch) return;

        // Auto-fill form from selected branch
        if (branch.name) setValue('company', branch.name, { shouldValidate: true, shouldDirty: true });
        if (branch.inn) setValue('inn', branch.inn || '', { shouldValidate: true, shouldDirty: true });
        if (branch.deliveryAddress || branch.address) setValue('delivery_address', branch.deliveryAddress || branch.address || '', { shouldValidate: true, shouldDirty: true });

        const rType = (branch.recipientType as 'laboratory' | 'distributor') || 'laboratory';
        setRecipientType(rType);
        if (rType === 'distributor' && branch.recipientOrgId) {
            setSelectedDistributorId(branch.recipientOrgId);
        } else {
            setSelectedDistributorId('');
        }

        // Auto-select contract
        if (contracts.length > 0) {
            const branchContract = contracts.find(c => c.clientId === selectedBranchId);
            if (branchContract) {
                setValue('contract_id', branchContract.id, { shouldValidate: true });
            } else {
                const hqContract = contracts.find(c => c.client?.type === 'headquarters' || c.client?.type === 'standalone' || c.clientId === session?.user?.organizationId);
                if (hqContract) {
                    setValue('contract_id', hqContract.id, { shouldValidate: true });
                } else {
                    setValue('contract_id', '', { shouldValidate: true });
                }
            }
        }
    }, [selectedBranchId, branches, contracts, setValue, session?.user?.organizationId]);

    // Auto-select user's branch
    useEffect(() => {
        if (branches.length > 0 && !selectedBranchId) {
            const userOrgId = session?.user?.organizationId;
            const myBranch = branches.find(b => b.id === userOrgId);
            if (myBranch) {
                setSelectedBranchId(myBranch.id);
            } else if (branches.length === 1) {
                setSelectedBranchId(branches[0].id);
            }
        }
    }, [branches, selectedBranchId, session?.user?.organizationId]);

    // Fetch organization profile for auto-fill
    useEffect(() => {
        if (!session?.user?.organizationId) return;
        (async () => {
            try {
                const res = await fetch('/api/profile');
                if (res.ok) {
                    const data = await res.json();
                    if (data.organization) {
                        const org = data.organization;
                        if (org.name) setValue('company', org.name);
                        if (org.inn) setValue('inn', org.inn);
                        if (org.address) setValue('delivery_address', org.address);
                        if (org.discountPercent != null) setOrgDiscount(org.discountPercent);
                        if (org.defaultLab) setPartnerLab(org.defaultLab);
                    }
                }
            } catch (e) { console.error(e); }
        })();
    }, [session?.user?.organizationId]);

    // Lens products from catalog (matched by description field = characteristic code)
    const VALID_LENS_DESCRIPTIONS = new Set(['toric', 'spherical', 'rgp', 'probe', 'trial']);
    const lensProducts = useMemo(
        () => catalog.filter(p => p.category === 'lens' && p.description != null && VALID_LENS_DESCRIPTIONS.has(p.description)),
        [catalog]
    );

    const additionalProducts = useMemo(() => catalog.filter(p => p.category !== 'lens'), [catalog]);

    const availableContracts = useMemo(() => {
        if (!selectedBranchId) return contracts;
        return contracts.filter(c => c.clientId === selectedBranchId || c.client?.type === 'headquarters' || c.client?.type === 'standalone' || c.clientId === session?.user?.organizationId);
    }, [contracts, selectedBranchId, session?.user?.organizationId]);

    // Map characteristic code → catalog product
    // When DK=50, it's always a trial lens — find the trial product
    const getLensProduct = (characteristic: string, dk?: string) => {
        // DK 50 or the "Пробная" (probe) characteristic = trial lens.
        // Catalog stores the trial product with description 'trial'.
        if (dk === '50' || characteristic === 'probe') {
            const trialProduct = lensProducts.find(p =>
                p.sku === 'ML-TRIAL-DK50' ||
                (p.description && p.description.toLowerCase().includes('trial')) ||
                p.description === 'probe'
            );
            if (trialProduct) return trialProduct;
        }
        return lensProducts.find(p => p.description === characteristic);
    };

    // Get price for a lens based on DK (mirrors backend getLensPrice logic)
    // For distributors, use distributorPriceByDk if available
    const getLensPrice = (product: CatalogProduct | undefined, dk: string): number => {
        if (!product) return 0;
        // Distributor pricing
        if (isDistributor && product.distributorPriceByDk && typeof product.distributorPriceByDk === 'object') {
            const dkPrice = product.distributorPriceByDk[dk];
            if (dkPrice != null) return dkPrice;
        }
        // Standard pricing
        if (product.priceByDk && typeof product.priceByDk === 'object') {
            const dkPrice = product.priceByDk[dk];
            if (dkPrice != null) return dkPrice;
        }
        return product.price || 0;
    };

    // Representative price for the "Тип линз" card. Prefer DK-based pricing
    // (distributor prices for distributors) so the card matches what the order
    // actually charges; fall back to the base `price` field.
    const getLensDisplayPrice = (product: CatalogProduct): number => {
        const dkMap = (isDistributor && product.distributorPriceByDk) || product.priceByDk;
        if (dkMap && typeof dkMap === 'object') {
            const vals = Object.values(dkMap).filter((v): v is number => typeof v === 'number' && v > 0);
            if (vals.length) return Math.min(...vals);
        }
        return product.price || 0;
    };

    const addProduct = (product: CatalogProduct) => {
        setSelectedProducts(prev => {
            const existing = prev.find(p => p.productId === product.id);
            if (existing) {
                return prev.map(p => p.productId === product.id ? { ...p, qty: p.qty + 1 } : p);
            }
            return [...prev, { productId: product.id, name: product.name, category: product.category, qty: 1, price: product.price || 0 }];
        });
    };

    const updateProductQty = (productId: string, delta: number) => {
        setSelectedProducts(prev => {
            return prev.map(p => {
                if (p.productId !== productId) return p;
                const newQty = p.qty + delta;
                return newQty <= 0 ? null! : { ...p, qty: newQty };
            }).filter(Boolean);
        });
    };

    const removeProduct = (productId: string) => {
        setSelectedProducts(prev => prev.filter(p => p.productId !== productId));
    };

    // Form has been moved up to fix React hooks linting/compile issues

    // Mirror OD to OS — set each field individually to trigger watchers
    const mirrorODtoOS = () => {
        const odValues = getValues('config.eyes.od');
        const fields = Object.keys(odValues) as Array<keyof typeof odValues>;
        fields.forEach(field => {
            setValue(`config.eyes.os.${field}` as any, odValues[field], { shouldValidate: true, shouldDirty: true });
        });
    };

    // Show errors inline and scroll to them
    const showFormErrors = (errors: string[]) => {
        setFormErrors(errors);
        setTimeout(() => {
            errorsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    };

    // Form submission
    const onFormSubmit = async (data: CreateOrderDTO) => {
        if (isSubmitting) return;
        // Custom validation: ensure key fields are filled
        const validationErrors: string[] = [];

        // Patient name is required
        if (!data.patient?.name || data.patient.name.trim().length < 2) {
            validationErrors.push('Укажите имя пациента (минимум 2 символа)');
        }

        // Patient phone is required for integration
        if (!data.patient?.phone || data.patient.phone.trim().length < 10) {
            validationErrors.push('Укажите корректный номер телефона пациента');
        }

        // At least one eye must have qty > 0
        const odQtyVal = Number(data.config?.eyes?.od?.qty) || 0;
        const osQtyVal = Number(data.config?.eyes?.os?.qty) || 0;
        if (odQtyVal === 0 && osQtyVal === 0) {
            validationErrors.push('Укажите количество хотя бы для одного глаза (OD или OS)');
        }

        // Validate OD eye parameters if qty > 0
        if (odQtyVal > 0) {
            const od = data.config?.eyes?.od;
            if (!od?.characteristic) validationErrors.push('OD: выберите характеристику (тип линзы)');
            if (!od?.isRgp && od?.km == null) validationErrors.push('OD: укажите Km');
            if (od?.dia == null) validationErrors.push('OD: укажите DIA');
            if (!od?.dk) validationErrors.push('OD: выберите Dk');
        }

        // Validate OS eye parameters if qty > 0
        if (osQtyVal > 0) {
            const os = data.config?.eyes?.os;
            if (!os?.characteristic) validationErrors.push('OS: выберите характеристику (тип линзы)');
            if (!os?.isRgp && os?.km == null) validationErrors.push('OS: укажите Km');
            if (os?.dia == null) validationErrors.push('OS: укажите DIA');
            if (!os?.dk) validationErrors.push('OS: выберите Dk');
        }

        // Recipient validation
        if (recipientType === 'distributor' && !selectedDistributorId) {
            validationErrors.push('Выберите дистрибьютора для этого заказа');
        }

        // Branch validation
        if (!isDistributor && branches.length > 0 && !selectedBranchId) {
            validationErrors.push('Выберите филиал для этого заказа');
        }

        if (validationErrors.length > 0) {
            showFormErrors(validationErrors);
            return;
        }

        setFormErrors([]);
        setIsSubmitting(true);
        try {
            // Convert RGP photos to compressed base64 and attach to config
            const submitData: any = { ...data, products: selectedProducts.length > 0 ? selectedProducts : undefined };
            if (isDistributor) {
                // Distributor always: order belongs to them + goes to lab
                submitData.distributorOrgId = session?.user?.organizationId;
                if (partnerLab?.id) {
                    submitData.labOrgId = partnerLab.id;
                }
            } else if (recipientType === 'distributor' && selectedDistributorId) {
                submitData.distributorOrgId = selectedDistributorId;
            } else if (recipientType === 'laboratory') {
                submitData.distributorOrgId = undefined; // lab order
                if (partnerLab?.id) {
                    submitData.labOrgId = partnerLab.id;
                }
            }
            // Set branch as the order's organization
            if (!isDistributor && selectedBranchId) {
                submitData.branchOrgId = selectedBranchId;
            }
            if (rgpPhotos.od || rgpPhotos.os) {
                const MAX_SIZE = 1200; // max dimension in px
                const QUALITY = 0.7;   // JPEG quality
                const MAX_FILE_MB = 2;

                const compressImage = (file: File): Promise<{ name: string; data: string; mimeType: string; size: number }> =>
                    new Promise((resolve, reject) => {
                        // PDFs — send as-is but check size
                        if (file.type === 'application/pdf') {
                            if (file.size > MAX_FILE_MB * 1024 * 1024) {
                                reject(new Error(`Файл "${file.name}" слишком большой (${(file.size / 1024 / 1024).toFixed(1)}MB). Максимум ${MAX_FILE_MB}MB.`));
                                return;
                            }
                            const reader = new FileReader();
                            reader.onload = () => resolve({ name: file.name, data: (reader.result as string).split(',')[1], mimeType: file.type, size: file.size });
                            reader.onerror = reject;
                            reader.readAsDataURL(file);
                            return;
                        }
                        // Images — compress via canvas
                        const img = new Image();
                        img.onload = () => {
                            let w = img.width, h = img.height;
                            if (w > MAX_SIZE || h > MAX_SIZE) {
                                const ratio = Math.min(MAX_SIZE / w, MAX_SIZE / h);
                                w = Math.round(w * ratio);
                                h = Math.round(h * ratio);
                            }
                            const canvas = document.createElement('canvas');
                            canvas.width = w;
                            canvas.height = h;
                            const ctx = canvas.getContext('2d')!;
                            ctx.drawImage(img, 0, 0, w, h);
                            const dataUrl = canvas.toDataURL('image/jpeg', QUALITY);
                            const base64 = dataUrl.split(',')[1];
                            const jpgName = file.name.replace(/\.[^.]+$/, '.jpg');
                            resolve({ name: jpgName, data: base64, mimeType: 'image/jpeg', size: Math.round(base64.length * 0.75) });
                        };
                        img.onerror = () => reject(new Error(`Не удалось загрузить изображение "${file.name}"`));
                        img.src = URL.createObjectURL(file);
                    });

                try {
                    const rgpFiles: any = {};
                    if (rgpPhotos.od) rgpFiles.od = await compressImage(rgpPhotos.od);
                    if (rgpPhotos.os) rgpFiles.os = await compressImage(rgpPhotos.os);
                    (submitData as any).rgpFiles = rgpFiles;
                } catch (compressErr: any) {
                    showFormErrors([compressErr.message || 'Ошибка при обработке файла']);
                    setIsSubmitting(false);
                    return;
                }
            }
            setConfirmData(submitData);
            setShowConfirmModal(true);
        } finally {
            setIsSubmitting(false);
        }
    };

    const doSubmit = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await onSubmit(confirmData);
            setShowConfirmModal(false);
            setConfirmData(null);
        } catch (e: any) {
            showFormErrors([e.message || 'Ошибка при отправке заказа']);
        } finally {
            setIsSubmitting(false);
        }
    };

    const onFormError = (errs: any) => {
        console.error('Form validation errors:', errs);
        const extractMessages = (obj: any): string[] => {
            if (!obj || typeof obj !== 'object' || obj instanceof Element) return [];
            const msgs: string[] = [];
            for (const key of Object.keys(obj)) {
                if (key === 'ref' || key === 'type') continue;
                if (obj[key]?.message && typeof obj[key].message === 'string') {
                    msgs.push(obj[key].message);
                } else if (typeof obj[key] === 'object' && obj[key] !== null && !(obj[key] instanceof Element)) {
                    msgs.push(...extractMessages(obj[key]));
                }
            }
            return msgs;
        };
        const messages = extractMessages(errs);
        if (messages.length > 0) {
            showFormErrors(messages);
        }
    };

    // Price calculation
    const DISCOUNT_PCT = orgDiscount;
    const [urgentSurchargePct, setUrgentSurchargePct] = useState(0);
    useEffect(() => {
        fetch('/api/settings').then(r => r.json()).then(s => {
            setUrgentSurchargePct(s.urgentSurchargePercent ?? 0);
        }).catch(() => {});
    }, []);
    const isUrgent = watch('is_urgent');
    const odCharacteristic = watch('config.eyes.od.characteristic');
    const osCharacteristic = watch('config.eyes.os.characteristic');
    const odDk = watch('config.eyes.od.dk') || '';
    const osDk = watch('config.eyes.os.dk') || '';
    const odQty = Number(watch('config.eyes.od.qty')) || 0;
    const osQty = Number(watch('config.eyes.os.qty')) || 0;
    const isRgpOD = watch('config.eyes.od.isRgp') || false;
    const isRgpOS = watch('config.eyes.os.isRgp') || false;
    const isTrialOD = odDk === '50';
    const isTrialOS = osDk === '50';
    const hasAnyRgp = isRgpOD || isRgpOS;

    const [companyValue, innValue] = watch(['company', 'inn']);
    const odColor = watch('config.eyes.od.color') || '';
    const osColor = watch('config.eyes.os.color') || '';
    const prevOdColorRef = useRef(odColor);
    const prevOsColorRef = useRef(osColor);

    useEffect(() => {
        if (session?.user?.role === 'distributor' && companyValue && distributorClients.length > 0) {
            const matchedClient = distributorClients.find(c => c.name.toLowerCase() === companyValue.toLowerCase());
            if (matchedClient && matchedClient.inn && !innValue) {
                setValue('inn', matchedClient.inn);
            }
        }
    }, [companyValue, distributorClients, innValue, session?.user?.role, setValue]);

    useEffect(() => {
        if (odDk && osDk && odDk === osDk) {
            // OD color changed
            if (odColor !== prevOdColorRef.current) {
                prevOdColorRef.current = odColor;
                if (odColor && !osColor) {
                    const lower = odColor.toLowerCase();
                    let newOsColor = '';
                    if (lower.includes('blue')) {
                        if (lower.includes('f2mid')) newOsColor = 'Contraperm F2Mid green';
                        else if (lower.includes('extra')) newOsColor = 'Optimum extra violet';
                        else if (lower.includes('extreme')) newOsColor = 'Optimum extreme violet';
                        else if (lower.includes('infinite')) newOsColor = 'Optimum infinite red';
                    } else if (lower.includes('green')) {
                        if (lower.includes('f2mid')) newOsColor = 'Contraperm F2Mid dark blue';
                        else if (lower.includes('extra')) newOsColor = 'Optimum extra violet';
                        else if (lower.includes('extreme')) newOsColor = 'Optimum extreme grey';
                        else if (lower.includes('infinite')) newOsColor = 'Optimum infinite red';
                    }
                    if (newOsColor) {
                        setValue('config.eyes.os.color', newOsColor, { shouldValidate: true, shouldDirty: true });
                        prevOsColorRef.current = newOsColor;
                    }
                }
            }
            
            // OS color changed
            if (osColor !== prevOsColorRef.current) {
                prevOsColorRef.current = osColor;
                if (osColor && !odColor) {
                    const lower = osColor.toLowerCase();
                    let newOdColor = '';
                    if (lower.includes('violet') || lower.includes('grey') || lower.includes('red')) {
                        if (lower.includes('extra')) newOdColor = 'Optimum extra blue';
                        else if (lower.includes('extreme')) newOdColor = 'Optimum extreme blue';
                        else if (lower.includes('infinite')) newOdColor = 'Optimum infinite blue';
                    } else if (lower.includes('green') && lower.includes('f2mid')) {
                        newOdColor = 'Contraperm F2Mid dark blue';
                    }
                    if (newOdColor) {
                        setValue('config.eyes.od.color', newOdColor, { shouldValidate: true, shouldDirty: true });
                        prevOdColorRef.current = newOdColor;
                    }
                }
            }
        }
    }, [odColor, osColor, odDk, osDk, setValue]);

    // Lens price from catalog based on characteristic + DK
    // Uses priceByDk when available (matches backend calculation)
    // RGP lenses have custom pricing (set by accountant), so price = 0
    // If it's a trial lens (DK 50), the effective product is 'probe'
    const effectiveOdCharacteristic = isRgpOD ? 'rgp' : (isTrialOD ? 'probe' : (odCharacteristic || ''));
    const effectiveOsCharacteristic = isRgpOS ? 'rgp' : (isTrialOS ? 'probe' : (osCharacteristic || ''));
    
    const odLensProduct = getLensProduct(effectiveOdCharacteristic);
    const osLensProduct = getLensProduct(effectiveOsCharacteristic);
    const odUnitPrice = isRgpOD ? 0 : getLensPrice(odLensProduct, odDk);
    const osUnitPrice = isRgpOS ? 0 : getLensPrice(osLensProduct, osDk);
    const odLensPrice = odUnitPrice * odQty;
    const osLensPrice = osUnitPrice * osQty;
    const lensTotal = odLensPrice + osLensPrice;

    // Additional products total (solutions, accessories)
    const additionalTotal = selectedProducts.reduce((sum, p) => sum + p.price * p.qty, 0);
    const basePrice = lensTotal + additionalTotal;
    const discountAmt = Math.round(basePrice * DISCOUNT_PCT / 100);
    const priceAfterDiscount = basePrice - discountAmt;
    const urgentSurcharge = isUrgent ? Math.round(priceAfterDiscount * urgentSurchargePct / 100) : 0;
    const totalPrice = priceAfterDiscount + urgentSurcharge;

    const handleSmartParse = () => {
        if (!smartParseInput.trim()) return;
        const parsed = parseOrderTableRow(smartParseInput);
        
        if (parsed.company) setValue('company', parsed.company, { shouldValidate: true, shouldDirty: true });
        if (parsed.patientName) setValue('patient.name', parsed.patientName, { shouldValidate: true, shouldDirty: true });
        
        // Notes
        if (parsed.notes) {
            const currentNotes = getValues('notes') || '';
            setValue('notes', currentNotes ? `${currentNotes}\n${parsed.notes}` : parsed.notes, { shouldValidate: true, shouldDirty: true });
        }

        const resolveColor = (dk: string | undefined, colorName: string | undefined) => {
            if (!dk || !colorName) return undefined;
            const available = ColorsByDk[dk] || [];
            const lower = colorName.toLowerCase();
            let search = '';
            if (lower.includes('синий') || lower.includes('blue')) search = 'blue';
            if (lower.includes('фиолет') || lower.includes('violet')) search = 'violet';
            if (lower.includes('зел') || lower.includes('green')) search = 'green';
            if (lower.includes('красн') || lower.includes('red')) search = 'red';
            if (lower.includes('сер') || lower.includes('grey') || lower.includes('gray')) search = 'grey';
            
            if (search) {
                return available.find((c: string) => c.toLowerCase().includes(search)) || colorName;
            }
            return colorName;
        };

        // OD
        if (parsed.od) {
            if (parsed.od.characteristic) setValue('config.eyes.od.characteristic', parsed.od.characteristic, { shouldValidate: true, shouldDirty: true });
            if (parsed.od.km !== undefined) setValue('config.eyes.od.km', parsed.od.km, { shouldValidate: true, shouldDirty: true });
            if (parsed.od.tp !== undefined) setValue('config.eyes.od.tp', parsed.od.tp, { shouldValidate: true, shouldDirty: true });
            if (parsed.od.dia !== undefined) setValue('config.eyes.od.dia', parsed.od.dia, { shouldValidate: true, shouldDirty: true });
            if (parsed.od.tor !== undefined) setValue('config.eyes.od.tor', parsed.od.tor, { shouldValidate: true, shouldDirty: true });
            if (parsed.od.e1 !== undefined) setValue('config.eyes.od.e1', parsed.od.e1, { shouldValidate: true, shouldDirty: true });
            if (parsed.od.e2 !== undefined) setValue('config.eyes.od.e2', parsed.od.e2, { shouldValidate: true, shouldDirty: true });
            if (parsed.od.dk) setValue('config.eyes.od.dk', parsed.od.dk as any, { shouldValidate: true, shouldDirty: true });
            if (parsed.od.compression_factor !== undefined) setValue('config.eyes.od.compression_factor', parsed.od.compression_factor, { shouldValidate: true, shouldDirty: true });
            if (parsed.od.myorthok !== undefined) setValue('config.eyes.od.myorthok', parsed.od.myorthok, { shouldValidate: true, shouldDirty: true });
            if (parsed.od.qty !== undefined) setValue('config.eyes.od.qty', parsed.od.qty, { shouldValidate: true, shouldDirty: true });
            const odColor = parsed.od.color;
            if (odColor) {
                setTimeout(() => {
                    const currentDk = getValues('config.eyes.od.dk');
                    const resolved = resolveColor(currentDk, odColor) || odColor;
                    setValue('config.eyes.od.color', resolved, { shouldValidate: true, shouldDirty: true });
                }, 100);
            }
        } else {
            setValue('config.eyes.od.qty', 0, { shouldValidate: true, shouldDirty: true });
        }

        // OS
        if (parsed.os) {
            if (parsed.os.characteristic) setValue('config.eyes.os.characteristic', parsed.os.characteristic, { shouldValidate: true, shouldDirty: true });
            if (parsed.os.km !== undefined) setValue('config.eyes.os.km', parsed.os.km, { shouldValidate: true, shouldDirty: true });
            if (parsed.os.tp !== undefined) setValue('config.eyes.os.tp', parsed.os.tp, { shouldValidate: true, shouldDirty: true });
            if (parsed.os.dia !== undefined) setValue('config.eyes.os.dia', parsed.os.dia, { shouldValidate: true, shouldDirty: true });
            if (parsed.os.tor !== undefined) setValue('config.eyes.os.tor', parsed.os.tor, { shouldValidate: true, shouldDirty: true });
            if (parsed.os.e1 !== undefined) setValue('config.eyes.os.e1', parsed.os.e1, { shouldValidate: true, shouldDirty: true });
            if (parsed.os.e2 !== undefined) setValue('config.eyes.os.e2', parsed.os.e2, { shouldValidate: true, shouldDirty: true });
            if (parsed.os.dk) setValue('config.eyes.os.dk', parsed.os.dk as any, { shouldValidate: true, shouldDirty: true });
            if (parsed.os.compression_factor !== undefined) setValue('config.eyes.os.compression_factor', parsed.os.compression_factor, { shouldValidate: true, shouldDirty: true });
            if (parsed.os.myorthok !== undefined) setValue('config.eyes.os.myorthok', parsed.os.myorthok, { shouldValidate: true, shouldDirty: true });
            if (parsed.os.qty !== undefined) setValue('config.eyes.os.qty', parsed.os.qty, { shouldValidate: true, shouldDirty: true });
            const osColor = parsed.os.color;
            if (osColor) {
                setTimeout(() => {
                    const currentDk = getValues('config.eyes.os.dk');
                    const resolved = resolveColor(currentDk, osColor) || osColor;
                    setValue('config.eyes.os.color', resolved, { shouldValidate: true, shouldDirty: true });
                }, 100);
            }
        } else {
            setValue('config.eyes.os.qty', 0, { shouldValidate: true, shouldDirty: true });
        }

        setSmartParseSuccess(true);
        setTimeout(() => setSmartParseSuccess(false), 3000);
    };

    return (
        <form onSubmit={handleSubmit(onFormSubmit, onFormError)} className="max-w-5xl mx-auto space-y-8">
            {isDistributor && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card border-2 border-emerald-100 bg-emerald-50/30">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">Умная вставка из таблицы</h2>
                            <p className="text-sm text-gray-500">Скопируйте строку заказа из Excel и вставьте сюда</p>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <input 
                            type="text" 
                            value={smartParseInput}
                            onChange={e => setSmartParseInput(e.target.value)}
                            placeholder="2026 06 10    ZKK 11    Ердос Темирлан    2    Toric..."
                            className="input flex-1 font-mono text-sm bg-white"
                        />
                        <button 
                            type="button" 
                            onClick={handleSmartParse}
                            className="btn btn-primary whitespace-nowrap gap-2 bg-emerald-600 hover:bg-emerald-700 border-transparent text-white"
                        >
                            <Sparkles className="w-4 h-4" /> Заполнить форму
                        </button>
                    </div>
                    {smartParseSuccess && (
                        <p className="text-sm text-emerald-600 mt-3 font-medium flex items-center gap-1.5">
                            <CheckCircle className="w-4 h-4" /> Форма успешно заполнена! Проверьте данные ниже.
                        </p>
                    )}
                </motion.div>
            )}

            {/* Urgency Picker */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`card border-2 transition-colors ${isUrgent ? 'border-amber-400 bg-amber-50' : 'border-transparent'
                    }`}
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isUrgent ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500'
                        }`}>
                        {isUrgent ? <Zap className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Тип заказа</h2>
                        <p className="text-sm text-gray-500">
                            {isUrgent
                                ? `Срочный — инженер приступит сразу, редактирование невозможно${urgentSurchargePct > 0 ? ` (+${urgentSurchargePct}% к стоимости)` : ''}`
                                : 'Обычный — у вас будет 2 часа на редактирование после создания'}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => setValue('is_urgent', false)}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${!isUrgent
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                            }`}
                    >
                        <Clock className="w-5 h-5 shrink-0" />
                        <div className="text-left">
                            <div className="font-semibold">Обычный</div>
                            <div className="text-xs opacity-70">2 часа на редактирование</div>
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => setValue('is_urgent', true)}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${isUrgent
                            ? 'border-amber-500 bg-amber-50 text-amber-700'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                            }`}
                    >
                        <Zap className="w-5 h-5 shrink-0" />
                        <div className="text-left">
                            <div className="font-semibold">Срочный</div>
                            <div className="text-xs opacity-70">Без редактирования, в порядке срочной очереди</div>
                        </div>
                    </button>
                </div>

                {/* Hidden input for react-hook-form */}
                <input type="hidden" {...register('is_urgent', { setValueAs: v => v === true || v === 'true' })} />
            </motion.div>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card"
            >
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                        <Building2 className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">Информация о заказе</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1.5">
                            Компания
                        </label>
                        <input
                            id="company"
                            type="text"
                            list={session?.user?.role === 'distributor' ? "distributor-clients" : undefined}
                            {...register('company')}
                            className="input"
                            placeholder="Ozat clinic"
                        />
                        {session?.user?.role === 'distributor' && (
                            <datalist id="distributor-clients">
                                {distributorClients.map((client) => (
                                    <option key={client.id} value={client.name} />
                                ))}
                            </datalist>
                        )}
                    </div>

                    <div>
                        <label htmlFor="inn" className="block text-sm font-medium text-gray-700 mb-1.5">
                            ИНН
                        </label>
                        <input
                            id="inn"
                            type="text"
                            {...register('inn')}
                            className="input"
                            placeholder="ИНН компании"
                        />
                    </div>

                    <div>
                        <label htmlFor="delivery_method" className="block text-sm font-medium text-gray-700 mb-1.5">
                            Способ доставки
                        </label>
                        <input
                            id="delivery_method"
                            type="text"
                            {...register('delivery_method')}
                            className="input"
                            placeholder="Курьер, самовывоз..."
                        />
                    </div>

                    <div>
                        <label htmlFor="delivery_address" className="block text-sm font-medium text-gray-700 mb-1.5">
                            Адрес доставки
                        </label>
                        <input
                            id="delivery_address"
                            type="text"
                            {...register('delivery_address')}
                            className="input"
                            placeholder="Астана, Пр. Мангилик ел 27"
                        />
                    </div>

                    {!isDistributor && availableContracts.length > 0 && (
                        <div className="md:col-span-2">
                            <label htmlFor="contract_id" className="block text-sm font-medium text-gray-700 mb-1.5">
                                Договор
                            </label>
                            <select
                                id="contract_id"
                                {...register('contract_id')}
                                className="input w-full bg-white"
                            >
                                <option value="">-- Без договора --</option>
                                {availableContracts.map(c => (
                                    <option key={c.id} value={c.id}>
                                        № {c.number} от {new Date(c.date).toLocaleDateString('ru-RU')} ({c.provider?.name}) {c.client?.type === 'branch' ? `[Филиал: ${c.client.name}]` : '[Головная компания]'}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Branch Selection */}
            {!isDistributor && branches.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card border-2 border-violet-100"
                >
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">Филиал</h2>
                            <p className="text-sm text-gray-500">Для какого филиала этот заказ?</p>
                        </div>
                        <span className="ml-auto text-xs font-semibold text-red-500 bg-red-50 px-2 py-1 rounded-full">Обязательно</span>
                    </div>

                    {branches.length === 0 ? (
                        <div className="text-sm text-amber-600 bg-amber-50 rounded-xl p-3 flex items-center gap-2">
                            <span>⚠️</span> Загрузка филиалов...
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {branches.map(branch => {
                                    const isSelected = selectedBranchId === branch.id;
                                    const isLab = (branch.recipientType || 'laboratory') === 'laboratory';
                                    return (
                                        <button
                                            key={branch.id}
                                            type="button"
                                            onClick={() => setSelectedBranchId(branch.id)}
                                            className={`flex flex-col gap-2 p-4 rounded-2xl border-2 transition-all text-left ${
                                                isSelected
                                                    ? 'border-violet-500 bg-violet-50 shadow-sm'
                                                    : 'border-gray-200 hover:border-violet-300 hover:bg-violet-50/40'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base ${
                                                    isSelected ? 'bg-violet-500' : 'bg-gray-100'
                                                }`}>
                                                    🏪
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className={`text-sm font-bold truncate ${
                                                        isSelected ? 'text-violet-800' : 'text-gray-700'
                                                    }`}>
                                                        {branch.name}
                                                    </div>
                                                    {branch.city && (
                                                        <div className={`text-xs mt-0.5 font-medium ${isSelected ? 'text-violet-600' : 'text-gray-500'}`}>
                                                            г. {branch.city}
                                                        </div>
                                                    )}
                                                </div>
                                                {isSelected && (
                                                    <div className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center flex-shrink-0">
                                                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                            {/* Routing hint */}
                                            <div className={`text-xs px-2 py-1 rounded-lg font-medium flex items-center gap-1 ${
                                                isLab
                                                    ? 'bg-blue-50 text-blue-600'
                                                    : 'bg-orange-50 text-orange-600'
                                            }`}>
                                                {isLab ? '🔬' : '🚚'} {branch.recipientLabel || (isLab ? 'Лаборатория' : 'Дистрибьютор')}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Auto-routing confirmation banner */}
                            {selectedBranchId && (() => {
                                const branch = branches.find(b => b.id === selectedBranchId);
                                if (!branch) return null;
                                const isLab = (branch.recipientType || 'laboratory') === 'laboratory';
                                return (
                                    <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${
                                        isLab ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-orange-50 text-orange-700 border border-orange-200'
                                    }`}>
                                        {isLab ? '🔬' : '🚚'}
                                        <span>
                                            Заказ будет отправлен в <strong>{branch.recipientLabel || (isLab ? 'Лабораторию' : 'ЦКК')}</strong>
                                        </span>
                                        <span className="ml-auto text-xs opacity-60">авто-маршрут</span>
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </motion.div>
            )}

            {/* Recipient Selection — distributors always send to lab */}
            {isDistributor ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card border-2 border-blue-100"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                            <Factory className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-lg font-semibold text-gray-900">Получатель заказа</h2>
                            <p className="text-sm text-blue-700 font-medium">MedInvision Lab</p>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                            <span className="text-xs font-semibold text-blue-600">Лаборатория</span>
                        </div>
                    </div>
                </motion.div>
            ) : (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card border-2 border-indigo-100"
            >
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                            <Truck className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">Получатель заказа</h2>
                            <p className="text-sm text-gray-500">Куда отправляется этот заказ?</p>
                        </div>
                        <span className="ml-auto text-xs font-semibold text-red-500 bg-red-50 px-2 py-1 rounded-full">Обязательно</span>
                    </div>

                    {/* Primary choice */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                        <button
                            type="button"
                            onClick={() => { setRecipientType('laboratory'); setSelectedDistributorId(''); }}
                            className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                                recipientType === 'laboratory'
                                    ? 'border-blue-500 bg-blue-50 shadow-sm'
                                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/40'
                            }`}
                        >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                recipientType === 'laboratory' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                            }`}>
                                <Factory className="w-6 h-6" />
                            </div>
                            <div>
                                <div className={`text-sm font-bold ${
                                    recipientType === 'laboratory' ? 'text-blue-800' : 'text-gray-700'
                                }`}>В Лабораторию {partnerLab ? `(${partnerLab.name})` : ''}</div>
                                <div className="text-xs text-gray-500 mt-0.5">Изготовление линз</div>
                            </div>
                            {recipientType === 'laboratory' && (
                                <div className="ml-auto w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => setRecipientType('distributor')}
                            className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                                recipientType === 'distributor'
                                    ? 'border-purple-500 bg-purple-50 shadow-sm'
                                    : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/40'
                            }`}
                        >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                recipientType === 'distributor' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'
                            }`}>
                                <Truck className="w-6 h-6" />
                            </div>
                            <div>
                                <div className={`text-sm font-bold ${
                                    recipientType === 'distributor' ? 'text-purple-800' : 'text-gray-700'
                                }`}>Дистрибьютору</div>
                                <div className="text-xs text-gray-500 mt-0.5">Очки, линзы, аксессуары</div>
                            </div>
                            {recipientType === 'distributor' && (
                                <div className="ml-auto w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            )}
                        </button>
                    </div>

                    {/* Distributor list — shown only when distributor is selected */}
                    {recipientType === 'distributor' && (
                        <div className="mt-1">
                            <p className="text-sm font-medium text-gray-700 mb-2">Выберите дистрибьютора:</p>
                            {distributors.length === 0 ? (
                                <div className="text-sm text-red-500 bg-red-50 rounded-xl p-3">
                                    ⚠️ Нет активных дистрибьюторов. Обратитесь к администратору.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {distributors.map(dist => (
                                        <button
                                            key={dist.id}
                                            type="button"
                                            onClick={() => setSelectedDistributorId(dist.id)}
                                            className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                                                selectedDistributorId === dist.id
                                                    ? 'border-purple-500 bg-purple-50 text-purple-800'
                                                    : 'border-gray-200 text-gray-600 hover:border-purple-300'
                                            }`}
                                        >
                                            <Truck className="w-4 h-4 flex-shrink-0" />
                                            <div>
                                                <div className="text-sm font-semibold">{dist.name}</div>
                                                {dist.city && <div className="text-xs opacity-70">{dist.city}</div>}
                                            </div>
                                            {selectedDistributorId === dist.id && (
                                                <div className="ml-auto w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center">
                                                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </motion.div>
            )}


            {/* Patient Information */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="card"
            >
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
                        <User className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">Пациент и врач</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="patient-name" className="block text-sm font-medium text-gray-700 mb-1.5">
                            Пациент *
                        </label>
                        <input
                            id="patient-name"
                            type="text"
                            {...register('patient.name')}
                            className="input"
                            placeholder="Даир Мансур"
                        />
                        {errors.patient?.name && (
                            <p className="mt-1 text-sm text-red-600">{errors.patient.name.message}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="patient-phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                            Телефон пациента *
                        </label>
                        <input
                            id="patient-phone"
                            type="text"
                            {...register('patient.phone')}
                            className="input"
                            placeholder="+7 700 000 00 00"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Пациент получит SMS с доступом к порталу MedMundus
                        </p>
                        {errors.patient?.phone && (
                            <p className="mt-1 text-sm text-red-600">{errors.patient.phone.message}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="doctor" className="block text-sm font-medium text-gray-700 mb-1.5">
                            Врач *
                        </label>
                        <input
                            id="doctor"
                            type="text"
                            {...register('doctor')}
                            className="input"
                            placeholder="ФИО врача"
                        />
                        {errors.doctor && (
                            <p className="mt-1 text-sm text-red-600">{errors.doctor.message}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="doctor_email" className="block text-sm font-medium text-gray-700 mb-1.5">
                            Email врача
                        </label>
                        <input
                            id="doctor_email"
                            type="email"
                            {...register('doctor_email')}
                            className="input"
                            placeholder="doctor@clinic.com"
                        />
                    </div>
                </div>
            </motion.div>

            {/* Single Eye Toggle */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
                className="card"
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center">
                        <Eye className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Количество глаз</h2>
                        <p className="text-sm text-gray-500">Заказ на оба глаза или только на один</p>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    {[
                        { value: 'both' as const, label: 'Оба глаза', sub: 'OD + OS' },
                        { value: 'od' as const, label: 'Только OD', sub: 'Правый глаз' },
                        { value: 'os' as const, label: 'Только OS', sub: 'Левый глаз' },
                    ].map(opt => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                                setSingleEye(opt.value);
                                if (opt.value === 'od') setValue('config.eyes.os.qty', 0 as any);
                                if (opt.value === 'os') setValue('config.eyes.od.qty', 0 as any);
                                if (opt.value === 'both') {
                                    if (Number(watch('config.eyes.od.qty')) === 0) setValue('config.eyes.od.qty', 1 as any);
                                    if (Number(watch('config.eyes.os.qty')) === 0) setValue('config.eyes.os.qty', 1 as any);
                                }
                            }}
                            className={`p-3 rounded-xl border-2 text-center transition-all ${singleEye === opt.value
                                ? 'border-violet-500 bg-violet-50 text-violet-700'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                }`}
                        >
                            <div className="font-semibold text-sm">{opt.label}</div>
                            <div className="text-xs opacity-70 mt-0.5">{opt.sub}</div>
                        </button>
                    ))}
                </div>
            </motion.div>

            {/* Eye Parameters */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-6"
            >
                {/* Calculator */}
                <MediLensCalculator onApplyToEye={(eye, data) => {
                    Object.entries(data).forEach(([key, val]) => {
                        setValue(`config.eyes.${eye}.${key}` as any, val, { shouldValidate: true, shouldDirty: true });
                    });
                }} />

                {/* Mirror Button */}
                {singleEye === 'both' && (
                    <div className="flex justify-center mb-4">
                        <button
                            type="button"
                            onClick={mirrorODtoOS}
                            className="btn btn-secondary gap-2"
                        >
                            <Copy className="w-4 h-4" />
                            Копировать параметры OD → OS
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* OD (Right Eye) */}
                    <EyeParametersCard
                        eye="od"
                        label="OD (Правый глаз)"
                        register={register}
                        errors={errors}
                        watch={watch}
                        setValue={setValue}
                        disabled={singleEye === 'os'}
                        rgpFile={rgpPhotos.od}
                        onRgpFileChange={(file) => setRgpPhotos(prev => ({ ...prev, od: file ?? undefined }))}
                    />

                    {/* OS (Left Eye) */}
                    <EyeParametersCard
                        eye="os"
                        label="OS (Левый глаз)"
                        register={register}
                        errors={errors}
                        watch={watch}
                        setValue={setValue}
                        disabled={singleEye === 'od'}
                        rgpFile={rgpPhotos.os}
                        onRgpFileChange={(file) => setRgpPhotos(prev => ({ ...prev, os: file ?? undefined }))}
                    />
                </div>
            </motion.div>

            {/* Lens Type — shows lens products from catalog linked to characteristics */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="card"
            >
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                        <Package className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Тип линз</h2>
                        <p className="text-sm text-gray-500">Выберите характеристику в параметрах глаз — товар определится автоматически</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {lensProducts.map(product => {
                        const isSelected = odLensProduct?.id === product.id || osLensProduct?.id === product.id;
                        const isRgp = product.description === 'rgp';
                        // When this lens is selected for an eye, show the exact price for
                        // that eye's DK; otherwise show the lowest price as a reference.
                        const cardPrice =
                            (odLensProduct?.id === product.id && odDk) ? getLensPrice(product, odDk) :
                            (osLensProduct?.id === product.id && osDk) ? getLensPrice(product, osDk) :
                            getLensDisplayPrice(product);
                        return (
                            <div
                                key={product.id}
                                className={`p-4 rounded-xl border-2 text-center transition-all ${isSelected
                                    ? 'border-primary-500 bg-primary-50'
                                    : 'border-gray-200 bg-gray-50'
                                    }`}
                            >
                                <p className="font-semibold text-sm text-gray-900">{product.name}</p>
                                {canSeePrices && (
                                    <p className={`text-xs mt-1 ${isRgp ? 'text-amber-600 font-medium' : 'text-gray-500'}`}>
                                        {isRgp ? 'Цена индивидуальная' : `${cardPrice.toLocaleString('ru-RU')} ₸/${product.unit}`}
                                    </p>
                                )}
                                {isSelected && (
                                    <span className="inline-block mt-2 text-xs font-semibold text-primary-600 bg-primary-100 px-2 py-0.5 rounded-full">
                                        Выбрано
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </motion.div>


            {/* Notes */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="card"
            >
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Комментарий
                </label>
                <textarea
                    id="notes"
                    {...register('notes')}
                    rows={3}
                    className="input resize-none"
                    placeholder="Любые дополнительные комментарии к заказу..."
                />
            </motion.div>

            {/* Additional Products (solutions, accessories only — lenses are auto-selected from characteristic) */}
            {additionalProducts.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.32 }}
                    className="card"
                >
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                            <ShoppingCart className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">Доп. товары</h2>
                            <p className="text-sm text-gray-500">Растворы, аксессуары и другое</p>
                        </div>
                    </div>

                    {/* Category groups (excluding lens) */}
                    {['solution', 'accessory'].map(cat => {
                        const catProducts = additionalProducts.filter(p => p.category === cat);
                        if (catProducts.length === 0) return null;
                        const CatIcon = CATEGORY_ICONS[cat] || Package;
                        return (
                            <div key={cat} className="mb-4 last:mb-0">
                                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                    <CatIcon className="w-4 h-4" />
                                    {CATEGORY_LABELS[cat] || cat}
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {catProducts.map(product => {
                                        const selected = selectedProducts.find(s => s.productId === product.id);
                                        return (
                                            <div
                                                key={product.id}
                                                className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${selected
                                                    ? 'border-primary-500 bg-primary-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-sm text-gray-900 truncate">{product.name}</div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {canSeePrices && product.price !== undefined && (
                                                            <span className="text-xs font-semibold text-gray-600">
                                                                {product.price.toLocaleString('ru-RU')} ₸/{product.unit}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {selected ? (
                                                    <div className="flex items-center gap-2 ml-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => updateProductQty(product.id, -1)}
                                                            className="w-7 h-7 rounded-lg bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                                                        >
                                                            <Minus className="w-3.5 h-3.5" />
                                                        </button>
                                                        <span className="text-sm font-bold w-6 text-center">{selected.qty}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => updateProductQty(product.id, 1)}
                                                            className="w-7 h-7 rounded-lg bg-primary-500 hover:bg-primary-600 text-white flex items-center justify-center transition-colors"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => addProduct(product)}
                                                        className="ml-3 w-7 h-7 rounded-lg bg-gray-100 hover:bg-primary-100 hover:text-primary-600 flex items-center justify-center transition-colors text-gray-400"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </motion.div>
            )}

            {/* Price Summary — hidden only for clinic doctors (optic_doctor) */}
            {canSeePrices && basePrice > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="card border-2 border-primary-100"
                >
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                            <Receipt className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900">Стоимость заказа</h2>
                    </div>

                    <div className="space-y-3">
                        {/* Lens prices from characteristic */}
                        {odLensProduct && odUnitPrice > 0 && (
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">OD: {odLensProduct.name} × {odQty}</span>
                                <span className="font-medium text-gray-900">{odLensPrice.toLocaleString('ru-RU')} ₸</span>
                            </div>
                        )}
                        {osLensProduct && osUnitPrice > 0 && (
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">OS: {osLensProduct.name} × {osQty}</span>
                                <span className="font-medium text-gray-900">{osLensPrice.toLocaleString('ru-RU')} ₸</span>
                            </div>
                        )}
                        {(isRgpOD || isRgpOS) && (
                            <div className="flex justify-between items-center text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                                <span>RGP — цена индивидуальная</span>
                                <span className="font-medium">по запросу</span>
                            </div>
                        )}

                        {/* Additional products */}
                        {selectedProducts.map(sp => (
                            <div key={sp.productId} className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">{sp.name}: {sp.qty} × {sp.price.toLocaleString('ru-RU')} ₸</span>
                                <span className="font-medium text-gray-900">
                                    {(sp.qty * sp.price).toLocaleString('ru-RU')} ₸
                                </span>
                            </div>
                        ))}

                        {/* Discount row */}
                        <div className="flex justify-between items-center text-sm text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">
                            <span>Скидка постоянного клиента ({DISCOUNT_PCT}%)</span>
                            <span className="font-medium">-{discountAmt.toLocaleString('ru-RU')} ₸</span>
                        </div>

                        {/* Urgent surcharge */}
                        {isUrgent && (
                            <div className="flex justify-between items-center text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                                <span>Срочность (+{urgentSurchargePct}%)</span>
                                <span className="font-medium">+{urgentSurcharge.toLocaleString('ru-RU')} ₸</span>
                            </div>
                        )}

                        <div className="border-t border-gray-200 pt-3 mt-3 flex justify-between items-center">
                            <span className="text-base font-semibold text-gray-900">Итого:</span>
                            <span className="text-xl font-bold text-primary-600">
                                {totalPrice.toLocaleString('ru-RU')} ₸
                            </span>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Validation Errors Banner */}
            {formErrors.length > 0 && (
                <motion.div
                    ref={errorsRef}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border-2 border-red-200 bg-red-50 p-5"
                >
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-red-800 mb-2">Заполните все обязательные поля</h3>
                            <ul className="space-y-1">
                                {formErrors.map((err, i) => (
                                    <li key={i} className="text-sm text-red-700 flex items-start gap-1.5">
                                        <span className="mt-0.5">•</span>
                                        <span>{err}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Submit */}
            <div className="flex justify-end gap-4">
                <button type="button" className="btn btn-secondary">
                    Сохранить черновик
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn btn-primary"
                >
                    {isSubmitting ? 'Создание...' : 'Создать заказ'}
                </button>
            </div>

            {/* Confirm Modal */}
            {showConfirmModal && confirmData && (
                <div className="fixed inset-0 z-[100] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <h3 className="text-xl font-bold text-gray-900">Подтверждение заказа</h3>
                            <button type="button" onClick={() => setShowConfirmModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-6">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-500 block mb-1">Пациент</span>
                                    <strong className="text-gray-900">{confirmData.patient?.name}</strong>
                                </div>
                                <div>
                                    <span className="text-gray-500 block mb-1">Телефон</span>
                                    <strong className="text-gray-900">{confirmData.patient?.phone}</strong>
                                </div>
                                <div>
                                    <span className="text-gray-500 block mb-1">Компания</span>
                                    <strong className="text-gray-900">{confirmData.company || '—'}</strong>
                                </div>
                                <div>
                                    <span className="text-gray-500 block mb-1">Тип заказа</span>
                                    <strong className={confirmData.is_urgent ? "text-amber-600 font-bold" : "text-primary-600 font-bold"}>
                                        {confirmData.is_urgent ? "Срочный" : "Обычный"}
                                    </strong>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {confirmData.config?.eyes?.od?.characteristic && Number(confirmData.config?.eyes?.od?.qty) > 0 && (
                                    <ReadOnlyEyeCard eye="od" label="OD (Правый глаз)" config={confirmData.config.eyes.od} qty={Number(confirmData.config.eyes.od.qty)} />
                                )}
                                {confirmData.config?.eyes?.os?.characteristic && Number(confirmData.config?.eyes?.os?.qty) > 0 && (
                                    <ReadOnlyEyeCard eye="os" label="OS (Левый глаз)" config={confirmData.config.eyes.os} qty={Number(confirmData.config.eyes.os.qty)} />
                                )}
                            </div>

                            {confirmData.products && confirmData.products.length > 0 && (
                                <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100/50">
                                    <h4 className="font-semibold text-emerald-900 text-sm uppercase tracking-wide mb-3">Дополнительные товары</h4>
                                    <ul className="space-y-2 text-sm">
                                        {confirmData.products.map((p: any, idx: number) => (
                                            <li key={idx} className="flex justify-between items-center border-b border-emerald-100/50 pb-2 last:border-0 last:pb-0">
                                                <span>{p.name}</span>
                                                <strong className="text-emerald-700">{p.qty} шт.</strong>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {canSeePrices && (
                                <div className="bg-gray-50 rounded-xl p-4 flex justify-between items-center border border-gray-200">
                                    <span className="font-medium text-gray-700">Итоговая сумма:</span>
                                    <span className="text-xl font-bold text-gray-900">{totalPrice.toLocaleString('ru-RU')} ₸</span>
                                </div>
                            )}

                            <p className="text-xs text-gray-500 text-center">
                                Проверьте все параметры перед отправкой заказа.
                            </p>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-3 justify-end">
                            <button type="button" onClick={() => setShowConfirmModal(false)} className="btn btn-secondary px-6">
                                Отмена
                            </button>
                            <button type="button" onClick={doSubmit} disabled={isSubmitting} className="btn btn-primary px-8">
                                {isSubmitting ? 'Отправка...' : 'Подтвердить и отправить'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </form>
    );
}
