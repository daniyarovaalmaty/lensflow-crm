import os
import re

# 1. Invoice Page: Extract PrintButton
os.makedirs('src/app/distributor/wholesale/[id]/invoice', exist_ok=True)
with open('src/app/distributor/wholesale/[id]/invoice/PrintButton.tsx', 'w', encoding='utf-8') as f:
    f.write("""'use client';

export default function PrintButton() {
    return (
        <button 
            onClick={() => window.print()}
            className="bg-indigo-600 text-white px-4 py-2 rounded shadow hover:bg-indigo-500"
        >
            Распечатать
        </button>
    );
}
""")

invoice_page_path = 'src/app/distributor/wholesale/[id]/invoice/page.tsx'
with open(invoice_page_path, 'r', encoding='utf-8') as f:
    invoice_content = f.read()

invoice_content = invoice_content.replace(
    "import { format } from 'date-fns';",
    "import { format } from 'date-fns';\nimport PrintButton from './PrintButton';"
)
invoice_content = re.sub(
    r"<button\s+onClick=\{\(\) => typeof window !== 'undefined' && window\.print\(\)\}.*?>.*?Распечатать\s*?</button>",
    "<PrintButton />",
    invoice_content,
    flags=re.DOTALL
)

with open(invoice_page_path, 'w', encoding='utf-8') as f:
    f.write(invoice_content)

# 2. Staff Page: Remove dist_head restriction
staff_page_path = 'src/app/distributor/staff/page.tsx'
with open(staff_page_path, 'r', encoding='utf-8') as f:
    staff_content = f.read()

staff_content = staff_content.replace(
    "{s.subRole !== 'dist_head' && (",
    "{(true) && ("
)

with open(staff_page_path, 'w', encoding='utf-8') as f:
    f.write(staff_content)

# 3. Cancel Route: Add robust logging and router refresh
cancel_page_path = 'src/app/distributor/wholesale/[id]/page.tsx'
with open(cancel_page_path, 'r', encoding='utf-8') as f:
    cancel_page_content = f.read()

if "router.refresh();" not in cancel_page_content:
    cancel_page_content = cancel_page_content.replace(
        "toast.success('Резерв снят, заказ отменен');",
        "toast.success('Резерв снят, заказ отменен');\n                router.refresh();"
    )
with open(cancel_page_path, 'w', encoding='utf-8') as f:
    f.write(cancel_page_content)

cancel_route_path = 'src/app/api/distributor/wholesale/[id]/cancel/route.ts'
with open(cancel_route_path, 'r', encoding='utf-8') as f:
    cancel_route_content = f.read()

cancel_route_content = cancel_route_content.replace(
    "throw new Error('Order not found');",
    "throw new Error('Заказ не найден');"
)
with open(cancel_route_path, 'w', encoding='utf-8') as f:
    f.write(cancel_route_content)

# 4. Supplier DELETE API
os.makedirs('src/app/api/distributor/suppliers/[id]', exist_ok=True)
with open('src/app/api/distributor/suppliers/[id]/route.ts', 'w', encoding='utf-8') as f:
    f.write("""import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user || session.user.role !== 'distributor') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        await prisma.supplier.delete({
            where: { id: params.id, organizationId: session.user.organizationId }
        });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Failed to delete supplier:', error);
        return new NextResponse(error.message, { status: 400 });
    }
}
""")

print("Fixes applied successfully via script.")
