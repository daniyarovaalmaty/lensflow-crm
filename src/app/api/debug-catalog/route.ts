import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    // Mock optic_manager logic
    const session = {
        user: {
            role: 'optic',
            subRole: 'optic_manager',
            organizationId: 'cmm670hv5000004l1d80q9l4e'
        }
    };
    
    const products = await prisma.product.findMany({
        where: { isActive: true },
        select: {
            id: true,
            name: true,
            category: true,
            description: true,
            price: true,
            isActive: true
        }
    });

    let effectiveOrgId = session.user.organizationId;
    let priceList: any = null;

    const org = await prisma.organization.findUnique({
        where: { id: effectiveOrgId },
        select: { metadata: true, parentId: true },
    });
    priceList = (org?.metadata as any)?.priceList;

    if (priceList?.lenses) {
        const patched = products.map((product) => {
            if (product.category !== 'lens') return product;
            const desc = product.description || '';
            
            if (desc.startsWith('toric_') && priceList.lenses.toric) {
                const dk = desc.split('_')[1];
                const customPrice = priceList.lenses.toric[dk];
                if (customPrice != null) return { ...product, price: customPrice };
            }
            if (desc.startsWith('spherical_') && priceList.lenses.spherical) {
                const dk = desc.split('_')[1];
                const customPrice = priceList.lenses.spherical[dk];
                if (customPrice != null) return { ...product, price: customPrice };
            }
            if ((desc === 'probe' || desc === 'rgp') && priceList.lenses.probe) {
                const customPrice = priceList.lenses.probe['50'];
                if (customPrice != null) return { ...product, price: customPrice };
            }
            return product;
        });
        return NextResponse.json({ patchedLength: patched.filter(p => p.category === 'lens').length, patched });
    }

    return NextResponse.json({ originalLength: products.filter(p => p.category === 'lens').length, products });
}
