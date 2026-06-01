import prisma from '@/lib/db/prisma';
import type { Session } from 'next-auth';

export interface OrgScope {
    organizationId?: string;
    organizationIds?: string[];
    isHeadquarters: boolean;
    currentBranchId?: string;
}

export async function getOrgScope(
    session: Session,
    requestedBranchId?: string | null
): Promise<OrgScope> {
    const orgId = session.user.organizationId;
    const orgType = (session.user as any).orgType as string | undefined;

    if (!orgId) {
        return { isHeadquarters: false };
    }

    if (orgType === 'headquarters') {
        const branches = await prisma.organization.findMany({
            where: { parentId: orgId, status: 'active' },
            select: { id: true },
        });
        const branchIds = branches.map(b => b.id);
        const allIds = [orgId, ...branchIds];

        if (requestedBranchId && branchIds.includes(requestedBranchId)) {
            return {
                organizationId: requestedBranchId,
                organizationIds: allIds,
                isHeadquarters: true,
                currentBranchId: requestedBranchId,
            };
        }

        return {
            organizationId: orgId,
            organizationIds: allIds,
            isHeadquarters: true,
        };
    }

    if (orgType === 'branch') {
        return {
            organizationId: orgId,
            isHeadquarters: false,
        };
    }

    return {
        organizationId: orgId,
        isHeadquarters: false,
    };
}

export function orgWhere(scope: OrgScope, branchId?: string | null): { organizationId: string } | { organizationId: { in: string[] } } {
    if (branchId && scope.organizationIds?.includes(branchId)) {
        return { organizationId: branchId };
    }

    if (scope.isHeadquarters && scope.organizationIds && !branchId) {
        return { organizationId: { in: scope.organizationIds } };
    }

    if (scope.organizationId) {
        return { organizationId: scope.organizationId };
    }

    return { organizationId: '' };
}

export async function getUserBranches(userId: string, orgId: string) {
    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        include: {
            branches: {
                where: { status: 'active' },
                select: { id: true, name: true, address: true, city: true, phone: true },
                orderBy: { name: 'asc' },
            },
        },
    });

    return org?.branches || [];
}
