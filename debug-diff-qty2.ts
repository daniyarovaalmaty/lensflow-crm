import prisma from './src/lib/db/prisma';
import * as xlsx from 'xlsx';

async function main() {
    const medInnovation = await prisma.user.findUnique({
        where: { email: 'medinnovation.kaz2021@gmail.com' }
    });
    const orgId = medInnovation?.organizationId;
    if (!orgId) return;

    const warehouseFile = "/Users/daniyarovaruslanovna/Downloads/Medinnovation Склад 01.01.2026 (1).xlsx";
    const wbStock = xlsx.readFile(warehouseFile, { raw: false });
    const rawStock: any[][] = xlsx.utils.sheet_to_json(wbStock.Sheets["Отчеты"], { header: 1 });
    
    let currentModel = "";
    const expectedModelQty: Record<string, number> = {};

    for (let i = 1; i < rawStock.length; i++) {
        const row = rawStock[i];
        if (!row || row.length < 2) continue;

        if (row[0] && typeof row[0] === 'string' && row[0].trim() !== '') {
            currentModel = row[0].trim();
        }
        if (currentModel.startsWith('Всего') || currentModel === 'NAME PRODUCT' || currentModel === 'Итого') continue;

        const dioptryStr = row[1];
        if (!dioptryStr || dioptryStr.toString().trim() === '' || dioptryStr === 'dioptry') continue;

        const factStr = row[5];
        let qty = 0;
        if (factStr) {
            qty = parseInt(factStr.toString().trim(), 10);
            if (isNaN(qty)) qty = 0;
        }

        if (qty > 0 && currentModel) {
            expectedModelQty[currentModel] = (expectedModelQty[currentModel] || 0) + qty;
        }
    }

    const dbProducts = await prisma.opticProduct.findMany({
        where: { organizationId: orgId },
        select: { name: true, currentStock: true }
    });
    
    function findDbProduct(excelName: string) {
        let exact = dbProducts.find(p => p.name.trim() === excelName.trim());
        if (exact) return exact;
        
        let c = excelName.trim().replace(/C/g, 'С').replace(/c/g, 'с'); 
        let exactCyr = dbProducts.find(p => p.name.trim() === c);
        if (exactCyr) return exactCyr;

        let n = excelName.trim();
        if (n === 'T2') return dbProducts.find(p => p.name.includes('AJL RING'));
        if (n.includes('AJL VIsc 2%')) return dbProducts.find(p => p.name.includes('VISC 2%'));
        if (n.includes('AJL Visc 3%')) return dbProducts.find(p => p.name.includes('VISC 3%'));
        if (n.includes('AJL Cell 2%')) return dbProducts.find(p => p.name.includes('CELL 2%'));
        if (n.includes('V28LC')) return dbProducts.find(p => p.name.includes('VOLK MEDICAL'));
        if (n.includes('V78C-GN')) return dbProducts.find(p => p.name.includes('VOLK MEDICAL'));
        if (n.includes('V90C-SR')) return dbProducts.find(p => p.name.includes('VOLK MEDICAL'));
        if (n.includes('V90C')) return dbProducts.find(p => p.name.includes('VOLK MEDICAL'));
        if (n.includes('V78C')) return dbProducts.find(p => p.name.includes('VOLK MEDICAL'));
        if (n.includes('VG3')) return dbProducts.find(p => p.name.includes('VOLK MEDICAL'));
        if (n.includes('V3MIRANF+')) return dbProducts.find(p => p.name.includes('VOLK MEDICAL'));
        if (n.includes('G-6MIRROR NF')) return dbProducts.find(p => p.name.includes('VOLK MEDICAL'));
        if (n.includes('VIRID')) return dbProducts.find(p => p.name.includes('VOLK MEDICAL'));
        if (n.includes('VDGTLWF-BK')) return dbProducts.find(p => p.name.includes('VOLK MEDICAL'));
        if (n.includes('VDGTLWF-GD')) return dbProducts.find(p => p.name.includes('VOLK MEDICAL'));
        if (n.includes('VDGTLWF-RD')) return dbProducts.find(p => p.name.includes('VOLK MEDICAL'));
        if (n.includes('VSQUAD160')) return dbProducts.find(p => p.name.includes('VOLK MEDICAL'));
        
        let allVolk = dbProducts.filter(p => p.name.includes('VOLK MEDICAL'));
        for (let p of allVolk) {
            if (p.name.includes(n)) return p;
        }
        
        if (n === 'VDGTLHM') return dbProducts.find(p => p.name === 'VDGTLHM-BK');

        return null;
    }

    let diffCount = 0;
    // We must accumulate expected quantities for DB products!
    const dbExpected: Record<string, number> = {};
    for (const [excelName, expectedQty] of Object.entries(expectedModelQty)) {
        const dbProduct = findDbProduct(excelName);
        if (dbProduct) {
            dbExpected[dbProduct.name] = (dbExpected[dbProduct.name] || 0) + expectedQty;
        } else {
            console.log(`Still not found: ${excelName}`);
        }
    }
    
    for (const p of dbProducts) {
        let expected = dbExpected[p.name] || 0;
        if (p.currentStock !== expected) {
            console.log(`DIFF for ${p.name}: DB has ${p.currentStock}, expected ${expected}. Diff = ${expected - p.currentStock}`);
            diffCount++;
        }
    }

    if (diffCount === 0) {
        console.log("No differences found!");
    }
}
main();
