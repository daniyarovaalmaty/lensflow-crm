const fs = require('fs');
const path = './src/app/api/optic/finances/accounts/route.ts';
let content = fs.readFileSync(path, 'utf8');

const replacement = `
        const accounts = await prisma.companyAccount.findMany({
            where: { organizationId: user.organizationId },
            orderBy: { createdAt: 'asc' },
        });

        // Calculate total cash from sales to add to the main cash register
        const sales = await prisma.sale.findMany({
            where: {
                organizationId: user.organizationId,
                paymentStatus: { not: 'refunded' }
            }
        });
        
        let totalCashFromSales = 0;
        sales.forEach(s => {
            if (s.paymentMethod === 'cash') {
                totalCashFromSales += s.total;
            } else if (s.paymentMethod === 'mixed' && s.invoiceData) {
                const inv = s.invoiceData as any;
                if (inv.split && Array.isArray(inv.split)) {
                    inv.split.forEach((sp: any) => {
                        if (sp.method === 'cash') totalCashFromSales += Number(sp.amount);
                    });
                } else {
                    totalCashFromSales += Number(inv.cashAmount || inv.cash || 0);
                }
            }
        });

        let addedCash = false;
        const modifiedAccounts = accounts.map(acc => {
            const nameLower = acc.name.toLowerCase();
            const isCashAccount = nameLower.includes('касса') || nameLower.includes('наличн') || nameLower === 'основная касса';
            if (isCashAccount && !addedCash) {
                addedCash = true;
                return { ...acc, balance: acc.balance + totalCashFromSales };
            }
            return acc;
        });

        return NextResponse.json(modifiedAccounts);
`;

content = content.replace(
    /const accounts = await prisma\.companyAccount\.findMany\(\{[\s\S]*?return NextResponse\.json\(accounts\);/,
    replacement.trim()
);

fs.writeFileSync(path, content);
console.log('Fixed accounts route');
