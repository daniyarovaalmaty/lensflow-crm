export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { CreateOrderSchema } from '@/types/order';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

/**
 * GET /api/orders - Get orders
 * Laboratory sees ALL orders, clinics/doctors see only their own
 */
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const opticId = searchParams.get('optic_id');

        // Build where clause based on role
        const where: any = {};

        if (session.user.role === 'laboratory') {
            // Lab sees: direct orders (no distributor) OR orders forwarded to this lab by a distributor
            where.OR = [
                { distributorOrgId: null },
                { labOrgId: session.user.organizationId },
            ];
            where.status = { not: 'draft' };
        } else if (session.user.role === 'distributor') {
            // Distributor sees only orders assigned to them
            where.distributorOrgId = session.user.organizationId;
            where.status = { not: 'draft' };
        } else if (session.user.role === 'optic') {
            const orgId = session.user.organizationId;
            const org = orgId ? await prisma.organization.findUnique({ where: { id: orgId }, select: { id: true, type: true, parentId: true } }) : null;

            if (session.user.subRole === 'optic_procurement' || session.user.subRole === 'optic_manager' || org?.type === 'headquarters') {
                // Procurement and Managers see orders for ALL branches of their parent org
                let relatedOrgIds: string[] = orgId ? [orgId] : [];
                if (org?.type === 'headquarters') {
                    const branches = await prisma.organization.findMany({ where: { parentId: orgId }, select: { id: true } });
                    relatedOrgIds = [orgId, ...branches.map((b: any) => b.id)];
                } else if (org?.parentId) {
                    const siblings = await prisma.organization.findMany({ where: { parentId: org.parentId }, select: { id: true } });
                    relatedOrgIds = [org.parentId, ...siblings.map((b: any) => b.id)];
                }
                where.organizationId = { in: relatedOrgIds };
            } else {
                // Regular clinic user sees only its org orders
                where.organizationId = session.user.organizationId;
            }
        } else if (session.user.role === 'doctor') {
            // Doctor sees only their orders
            where.createdById = session.user.id;
        }


        if (status) {
            // Map status string to enum value
            const statusMap: Record<string, string> = {
                'draft': 'draft',
                'new': 'new_order',
                'in_production': 'in_production',
                'ready': 'ready',
                'rework': 'rework',
                'docs_prep': 'docs_prep',
                'accountant_review': 'accountant_review',
                'docs_ready': 'docs_ready',
                'shipped': 'shipped',
                'out_for_delivery': 'out_for_delivery',
                'delivered': 'delivered',
                'cancelled': 'cancelled',
            };
            where.status = statusMap[status] || status;
        }

        if (opticId) {
            where.organizationId = opticId;
        }

        // Fetch all orders regardless of how old they are
        // (Removed 30-day exclusion for delivered orders)

        const orders = await prisma.order.findMany({
            where,
            include: {
                patient: true,
                createdBy: { select: { fullName: true, email: true } },
                organization: { select: { name: true, inn: true, deliveryAddress: true } },
                labOrg: { select: { name: true, inn: true, deliveryAddress: true, bankName: true, bik: true, iban: true } },
                distributorOrg: { select: { name: true, inn: true, deliveryAddress: true, bankName: true, bik: true, iban: true } },
                engineer: { select: { fullName: true } },
                contract: {
                    select: {
                        number: true,
                        date: true,
                        provider: { select: { name: true, inn: true, address: true, bankName: true, bik: true, iban: true } },
                        client: { select: { name: true, inn: true, address: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
        });

        // Pre-fetch missing contracts for orgs
        const orgsWithMissingContracts = orders.filter((o: any) => !o.contract && o.organizationId).map((o: any) => o.organizationId);
        const uniqueOrgs = [...new Set(orgsWithMissingContracts)];
        const fallbackContracts = await prisma.contract.findMany({
            where: { clientId: { in: uniqueOrgs as string[] }, status: 'active' },
            include: {
                provider: { select: { name: true, inn: true, address: true, bankName: true, bik: true, iban: true } },
                client: { select: { name: true, inn: true, address: true } }
            },
            orderBy: { date: 'desc' }
        });
        const contractMap = new Map();
        fallbackContracts.forEach(c => {
            if (!contractMap.has(c.clientId)) {
                contractMap.set(c.clientId, c);
            }
        });

        // Transform to match frontend expected format
        const transformed = orders.map((order: any) => {
            // Map status enum back to string
            const statusMap: Record<string, string> = {
                'draft': 'draft',
                'new_order': 'new',
                'in_production': 'in_production',
                'ready': 'ready',
                'rework': 'rework',
                'docs_prep': 'docs_prep',
                'accountant_review': 'accountant_review',
                'docs_ready': 'docs_ready',
                'shipped': 'shipped',
                'out_for_delivery': 'out_for_delivery',
                'delivered': 'delivered',
                'cancelled': 'cancelled',
            };

            // Strip heavy base64 RGP file data from list response (keep metadata only)
            const lensConfig = { ...(order.lensConfig as any) };
            if (lensConfig.rgpFiles) {
                const stripped: any = {};
                for (const [eye, file] of Object.entries(lensConfig.rgpFiles as Record<string, any>)) {
                    stripped[eye] = { name: file.name, mimeType: file.mimeType, size: file.size };
                }
                lensConfig.rgpFiles = stripped;
            }

            const fallbackContract = order.organizationId ? contractMap.get(order.organizationId) : undefined;

            return {
                id: order.id,
                order_id: order.orderNumber,
                meta: {
                    optic_id: order.organizationId || '',
                    optic_name: order.organization?.name || order.opticName || '',
                    doctor: order.doctorName || order.createdBy?.fullName || '',
                    created_at: order.createdAt.toISOString(),
                    updated_at: order.updatedAt.toISOString(),
                    lab_org_id: order.labOrgId || null,
                    distributor_org_id: order.distributorOrgId || null,
                    engineer_name: order.engineer?.fullName || undefined,
                },
                patient: order.patient ? {
                    id: order.patient.id,
                    name: order.patient.name,
                    phone: order.patient.phone,
                    email: order.patient.email || undefined,
                    notes: order.patient.notes || undefined,
                } : { name: '', phone: '' },
                config: lensConfig,
                company: order.company || undefined,
                inn: order.inn || undefined,
                delivery_method: order.deliveryMethod || undefined,
                delivery_address: order.deliveryAddress || undefined,
                doctor_email: order.doctorEmail || undefined,
                status: statusMap[order.status] || order.status,
                is_urgent: order.isUrgent,
                edit_deadline: order.editDeadline?.toISOString(),
                tracking_number: order.trackingNumber || undefined,
                production_started_at: order.productionStartedAt?.toISOString(),
                production_completed_at: order.productionCompletedAt?.toISOString(),
                shipped_at: order.shippedAt?.toISOString(),
                delivered_at: order.deliveredAt?.toISOString(),
                notes: order.notes || undefined,
                payment_status: order.paymentStatus,
                defects: (order.defects as any[]) || [],
                comments: (order.comments as any[]) || [],
                total_price: order.totalPrice || 0,
                discount_percent: order.discountPercent ?? 0,
                products: (order.products as any[]) || [],
                document_name_od: order.documentNameOd || undefined,
                document_name_os: order.documentNameOs || undefined,
                price_od: order.priceOd || undefined,
                price_os: order.priceOs || undefined,
                delivery_confirmed: (order as any).deliveryConfirmed ?? undefined,
                lab_org_id: (order as any).labOrgId || null,
                contract: order.contract ? {
                    number: order.contract.number,
                    date: order.contract.date.toISOString(),
                    provider: order.contract.provider,
                    client: order.contract.client,
                } : (fallbackContract ? {
                    number: fallbackContract.number,
                    date: fallbackContract.date.toISOString(),
                    provider: fallbackContract.provider,
                    client: fallbackContract.client,
                } : undefined),
                optic_inn: order.organization?.inn || undefined,
                optic_address: order.organization?.deliveryAddress || undefined,
                lab_org: order.labOrg ? {
                    name: order.labOrg.name,
                    inn: order.labOrg.inn,
                    address: order.labOrg.deliveryAddress,
                    bankName: order.labOrg.bankName,
                    bik: order.labOrg.bik,
                    iban: order.labOrg.iban,
                } : undefined,
                distributor_org: order.distributorOrg ? {
                    name: order.distributorOrg.name,
                    inn: order.distributorOrg.inn,
                    address: order.distributorOrg.deliveryAddress,
                    bankName: order.distributorOrg.bankName,
                    bik: order.distributorOrg.bik,
                    iban: order.distributorOrg.iban,
                } : undefined,
            };
        });

        return NextResponse.json(transformed);
    } catch (error) {
        console.error('GET /api/orders error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch orders' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/orders - Create new order
 */
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = await request.json();

        // Validate with Zod
        const validatedData = CreateOrderSchema.parse(body);

        // Generate order ID in AB01 sequential format
        // Convert letter-pair + number to a single sequential integer for proper comparison
        const orderToSeq = (letters: string, num: number): number => {
            const c1 = letters.charCodeAt(0) - 65; // A=0, B=1, ...
            const c2 = letters.charCodeAt(1) - 65;
            return (c1 * 26 + c2) * 99 + num; // Each letter-pair holds 99 numbers (01-99)
        };
        const seqToOrder = (seq: number): string => {
            const num = ((seq - 1) % 99) + 1;
            const letterIdx = Math.floor((seq - 1) / 99);
            const c1 = Math.floor(letterIdx / 26);
            const c2 = letterIdx % 26;
            const letters = String.fromCharCode(65 + c1, 65 + c2);
            return `${letters}${num.toString().padStart(2, '0')}`;
        };

        const generateOrderNumber = async (): Promise<string> => {
            // Fetch ALL non-LX order numbers to find the true maximum
            const allOrders = await prisma.order.findMany({
                where: { orderNumber: { not: { startsWith: 'LX-' } } },
                select: { orderNumber: true },
            });
            
            let maxSeq = 0; // Before AB01
            for (const o of allOrders) {
                const match = o.orderNumber.match(/^([A-Z]{2})(\d+)$/);
                if (match) {
                    const seq = orderToSeq(match[1], parseInt(match[2], 10));
                    if (seq > maxSeq) maxSeq = seq;
                }
            }
            
            return seqToOrder(maxSeq + 1);
        };

        const now = new Date();
        const is_urgent = validatedData.is_urgent ?? false;
        const edit_deadline = is_urgent
            ? now
            : new Date(now.getTime() + 2 * 60 * 60 * 1000);

        // Find or create patient
        let patientId: string | undefined;
        if (validatedData.patient) {
            const patient = await prisma.patient.create({
                data: {
                    name: validatedData.patient.name,
                    phone: validatedData.patient.phone || '',
                    email: validatedData.patient.email || undefined,
                    notes: validatedData.patient.notes || undefined,
                    organizationId: session.user.organizationId || undefined,
                },
            });
            patientId = patient.id;
        }

        // ── Calculate totalPrice from catalog ──
        // Get org discount (or user personal discount for independent doctors)
        let DISCOUNT_PCT = 0;
        if (session.user.organizationId) {
            const org = await prisma.organization.findUnique({
                where: { id: session.user.organizationId },
                select: { discountPercent: true },
            });
            if (org) DISCOUNT_PCT = org.discountPercent;
        } else {
            // Independent doctor — check personal discount
            const user = await prisma.user.findUnique({
                where: { id: session.user.id },
                select: { discountPercent: true },
            });
            if (user?.discountPercent != null) DISCOUNT_PCT = user.discountPercent;
        }
        // Read surcharge from LabSettings
        const labSettings = await prisma.labSettings.upsert({
            where: { id: 'default' },
            create: { id: 'default' },
            update: {},
        });
        const URGENT_SURCHARGE_PCT = labSettings.urgentSurchargePercent;
        const URGENT_DISCOUNT_PCT = labSettings.urgentDiscountPercent;
        const config = validatedData.config as any;
        let odChar = config?.eyes?.od?.characteristic || '';
        let osChar = config?.eyes?.os?.characteristic || '';
        if (config?.eyes?.od?.isRgp) odChar = 'rgp';
        if (config?.eyes?.os?.isRgp) osChar = 'rgp';
        const odQty = Number(config?.eyes?.od?.qty) || 0;
        const osQty = Number(config?.eyes?.os?.qty) || 0;
        const odDk = config?.eyes?.od?.dk || '';
        const osDk = config?.eyes?.os?.dk || '';
        const odTrial = config?.eyes?.od?.trial || false;
        const osTrial = config?.eyes?.os?.trial || false;

        // Lookup lens catalog prices (with DK-specific pricing) and name1c
        let odPrice = 0;
        let osPrice = 0;
        let odUnitPrice = 0;
        let osUnitPrice = 0;
        let documentNameOd: string | undefined;
        let documentNameOs: string | undefined;

        if (odChar || osChar) {
            const lensProducts = await prisma.product.findMany({
                where: { category: 'lens', isActive: true },
                select: { description: true, sku: true, price: true, priceByDk: true, distributorPriceByDk: true, name1c: true },
            });

            // Load custom price list: distributor or optic org
            let distPriceList: any = null;
            if (session.user.role === 'distributor' && session.user.organizationId) {
                const distOrg = await prisma.organization.findUnique({
                    where: { id: session.user.organizationId },
                    select: { metadata: true },
                });
                distPriceList = (distOrg?.metadata as any)?.priceList || null;
            } else if (session.user.role === 'optic') {
                // For optic (including procurement): use branch org or user's org
                const effectiveOrgId = (session.user.subRole === 'optic_procurement' && body.branchOrgId)
                    ? body.branchOrgId
                    : session.user.organizationId;
                if (effectiveOrgId) {
                    const opticOrg = await prisma.organization.findUnique({
                        where: { id: effectiveOrgId },
                        select: { metadata: true, parentId: true },
                    });
                    // Check own metadata first, then HQ metadata
                    distPriceList = (opticOrg?.metadata as any)?.priceList || null;
                    if (!distPriceList && opticOrg?.parentId) {
                        const hqOrg = await prisma.organization.findUnique({
                            where: { id: opticOrg.parentId },
                            select: { metadata: true },
                        });
                        distPriceList = (hqOrg?.metadata as any)?.priceList || null;
                    }
                }
            }

            // Helper: resolve price from org priceList or catalog
            const getLensPrice = (product: any, dk: string, characteristic: string, isTrial: boolean): number => {
                // Custom price list takes priority
                if (distPriceList) {
                    const dkKey = String(dk);
                    if (isTrial || dk === '50') {
                        const probePrice = distPriceList.lenses?.probe?.[dkKey];
                        if (probePrice != null) return probePrice;
                    }
                    const charKey = characteristic === 'toric' ? 'toric' : 'spherical';
                    const charPrice = distPriceList.lenses?.[charKey]?.[dkKey];
                    if (charPrice != null) return charPrice;
                }
                // Distributor-specific catalog prices (mirrors frontend getLensPrice)
                if (session.user.role === 'distributor' && product.distributorPriceByDk && typeof product.distributorPriceByDk === 'object') {
                    const dp = (product.distributorPriceByDk as Record<string, number>)[dk];
                    if (dp != null) return dp;
                }
                // Global catalog fallback
                if (product.priceByDk && typeof product.priceByDk === 'object') {
                    const dkPrice = (product.priceByDk as Record<string, number>)[dk];
                    if (dkPrice != null) return dkPrice;
                }
                return product.price || 0;
            };



            // Resolve catalog product for a characteristic. "Пробная" (probe) / DK 50
            // map to the trial product (catalog description = 'trial').
            const resolveLensProduct = (char: string, dk: string, isTrial: boolean): any => {
                if (isTrial || dk === '50' || char === 'probe') {
                    const trial = lensProducts.find((p: any) =>
                        p.sku === 'ML-TRIAL-DK50' ||
                        (p.description && p.description.toLowerCase().includes('trial')) ||
                        p.description === 'probe'
                    );
                    if (trial) return trial;
                }
                return lensProducts.find((p: any) => p.description === char);
            };
            const odProduct: any = odChar ? resolveLensProduct(odChar, odDk, odTrial) : undefined;
            const osProduct: any = osChar ? resolveLensProduct(osChar, osDk, osTrial) : undefined;

            odUnitPrice = odProduct ? getLensPrice(odProduct, odDk, odChar, odTrial) : 0;
            osUnitPrice = osProduct ? getLensPrice(osProduct, osDk, osChar, osTrial) : 0;
            odPrice = odUnitPrice * odQty;
            osPrice = osUnitPrice * osQty;

            // Construct 1C document names: name1c already contains type (торическая/сферическая)
            // If DK=50, it's always "пробная" — replace the type word in name1c
            const buildDocName = (baseName1c: string | null, dk: string): string | undefined => {
                if (!baseName1c) return undefined;
                let name = baseName1c;
                if (dk === '50') {
                    // Replace торическая/сферическая with пробная for DK 50
                    name = name.replace(/торическая|сферическая/i, 'пробная');
                }
                const dkPart = dk ? `DK ${dk}` : '';
                return dkPart ? `${name}. ${dkPart}` : name;
            };

            if (odChar && odQty > 0) {
                documentNameOd = buildDocName(odProduct?.name1c || null, odDk);
            }
            if (osChar && osQty > 0) {
                documentNameOs = buildDocName(osProduct?.name1c || null, osDk);
            }
        }

        // Additional products — look up real prices from catalog (client may not have them)
        let additionalProducts = body.products as Array<{ productId?: string; name: string; qty: number; price: number; category?: string }> | undefined;
        if (additionalProducts && additionalProducts.length > 0) {
            const productIds = additionalProducts.map((p: any) => p.productId).filter(Boolean) as string[];
            if (productIds.length > 0) {
                const dbProducts = await prisma.product.findMany({
                    where: { id: { in: productIds } },
                    select: { id: true, price: true },
                });
                const priceMap = new Map(dbProducts.map((p: any) => [p.id, p.price]));
                additionalProducts = additionalProducts.map((p: any) => ({
                    ...p,
                    price: p.productId ? (priceMap.get(p.productId) ?? p.price) : p.price,
                }));
            }
        }
        const additionalTotal = (additionalProducts || []).reduce((sum: number, p) => sum + (p.price || 0) * (p.qty || 1), 0);

        const basePrice = odPrice + osPrice + additionalTotal;
        const discountAmt = Math.round(basePrice * DISCOUNT_PCT / 100);
        const priceAfterDiscount = basePrice - discountAmt;
        const urgentSurcharge = is_urgent ? Math.round(priceAfterDiscount * URGENT_SURCHARGE_PCT / 100) : 0;
        const totalPrice = priceAfterDiscount + urgentSurcharge;

        // Create order in database with retry mechanism for unique constraint
        let order;
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            try {
                const orderNumber = await generateOrderNumber();
                // Use the selected branch org if provided, otherwise fallback to the user's own org
                const orderOrgId = body.branchOrgId || session.user.organizationId || undefined;

                let initialStatus = 'new_order';
                if (orderOrgId) {
                    const org = await prisma.organization.findUnique({ where: { id: orderOrgId }, select: { requiresApproval: true, parentId: true } });
                    let requiresApproval = org?.requiresApproval;
                    if (!requiresApproval && org?.parentId) {
                        const parentOrg = await prisma.organization.findUnique({ where: { id: org.parentId }, select: { requiresApproval: true } });
                        if (parentOrg?.requiresApproval) requiresApproval = true;
                    }
                    if (requiresApproval) {
                        initialStatus = 'draft';
                    }
                }

                order = await prisma.order.create({
                    data: {
                        orderNumber,
                        status: initialStatus as any,
                        isUrgent: is_urgent,
                        organizationId: orderOrgId,
                        createdById: session.user.id,
                        patientId,
                        opticName: session.user.profile?.opticName || '',
                        doctorName: validatedData.doctor || session.user.profile?.fullName || '',
                        doctorEmail: validatedData.doctor_email || undefined,
                        company: validatedData.company || undefined,
                        inn: validatedData.inn || undefined,
                        deliveryMethod: validatedData.delivery_method || undefined,
                        deliveryAddress: validatedData.delivery_address || undefined,
                        lensConfig: { ...(validatedData.config as any), rgpFiles: body.rgpFiles || undefined } as any,
                        documentNameOd: documentNameOd || undefined,
                        documentNameOs: documentNameOs || undefined,
                        priceOd: odUnitPrice || undefined,
                        priceOs: osUnitPrice || undefined,
                        editDeadline: edit_deadline,
                        notes: validatedData.notes || undefined,
                        products: additionalProducts || undefined,
                        totalPrice,
                        discountPercent: DISCOUNT_PCT,
                        distributorOrgId: body.distributorOrgId || undefined,
                        labOrgId: body.labOrgId || undefined,
                        contractId: body.contract_id || undefined,
                    },
                    include: {
                        patient: true,
                        organization: { select: { name: true } },
                    },
                });
                break; // Success
            } catch (error: any) {
                // Detect unique constraint violation - Prisma P2002 OR PostgreSQL 23505 via DriverAdapter
                const isUniqueViolation = error.code === 'P2002' 
                    || error?.cause?.originalCode === '23505'
                    || JSON.stringify(error).includes('UniqueConstraintViolation')
                    || JSON.stringify(error).includes('23505');
                
                if (isUniqueViolation && attempts < maxAttempts - 1) {
                    attempts++;
                    continue; // Retry with a new orderNumber
                }
                throw error; // Rethrow if not unique violation or max attempts reached
            }
        }
        
        if (!order) {
            throw new Error('Failed to create order after multiple attempts');
        }

        // Transform response to match frontend format
        const response = {
            order_id: order.orderNumber,
            meta: {
                optic_id: order.organizationId || '',
                optic_name: order.organization?.name || order.opticName || '',
                doctor: order.doctorName || '',
                created_at: order.createdAt.toISOString(),
                updated_at: order.updatedAt.toISOString(),
            },
            patient: order.patient ? {
                id: order.patient.id,
                name: order.patient.name,
                phone: order.patient.phone,
                email: order.patient.email || undefined,
                notes: order.patient.notes || undefined,
            } : validatedData.patient,
            config: order.lensConfig,
            status: 'new',
            is_urgent: order.isUrgent,
            edit_deadline: order.editDeadline?.toISOString(),
            notes: order.notes || undefined,
            total_price: order.totalPrice,
            discount_percent: order.discountPercent,
            price_od: order.priceOd || undefined,
            price_os: order.priceOs || undefined,
            document_name_od: order.documentNameOd || undefined,
            document_name_os: order.documentNameOs || undefined,
            products: (order as any).products || [],
        };

        return NextResponse.json(response, { status: 201 });
    } catch (error: any) {
        console.error('POST /api/orders error:', error);

        if (error.name === 'ZodError') {
            const messages = error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join('; ');
            return NextResponse.json(
                { error: `Ошибка валидации: ${messages}`, details: error.errors },
                { status: 400 }
            );
        }

        // Prisma unique constraint (P2002) or PostgreSQL 23505 via DriverAdapter
        const isUniqueViolation = error.code === 'P2002' 
            || error?.cause?.originalCode === '23505'
            || JSON.stringify(error).includes('UniqueConstraintViolation');
        
        if (isUniqueViolation) {
            return NextResponse.json(
                { error: 'Конфликт номера заказа. Пожалуйста, попробуйте создать заказ ещё раз.' },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { error: error.message || 'Не удалось создать заказ' },
            { status: 500 }
        );
    }
}
