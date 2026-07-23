export interface GS1Data {
    gtin?: string;
    expirationDate?: Date;
    batchNumber?: string;
    serialNumber?: string;
    rawBlocks: string[];
}

export function parseGS1Barcode(barcode: string): GS1Data {
    if (!barcode) return { rawBlocks: [] };
    
    const data: GS1Data = { rawBlocks: [] };
    let current = barcode;

    while (current.length > 0) {
        if (current.startsWith('01') && current.length >= 16) {
            data.gtin = current.substring(2, 16);
            data.rawBlocks.push(current.substring(0, 16));
            current = current.substring(16);
        } else if (current.startsWith('17') && current.length >= 8) {
            const dateStr = current.substring(2, 8);
            // GS1 date format YYMMDD
            const year = 2000 + parseInt(dateStr.substring(0, 2), 10);
            const month = parseInt(dateStr.substring(2, 4), 10) - 1; // 0-indexed month
            const day = parseInt(dateStr.substring(4, 6), 10);
            data.expirationDate = new Date(year, month, day);
            data.rawBlocks.push(current.substring(0, 8));
            current = current.substring(8);
        } else if (current.startsWith('10')) {
            // Batch / Lot Number (variable length)
            data.batchNumber = current.substring(2);
            data.rawBlocks.push(current);
            current = ''; // Assuming it's the last part
        } else if (current.startsWith('21')) {
            // Serial Number (variable length)
            data.serialNumber = current.substring(2);
            data.rawBlocks.push(current);
            current = ''; // Assuming it's the last part
        } else {
            // Unrecognized Application Identifier or malformed string
            data.rawBlocks.push(current);
            break;
        }
    }

    return data;
}

export function formatGS1Barcode(barcode: string): string[] {
    const parsed = parseGS1Barcode(barcode);
    if (parsed.rawBlocks.length > 0) {
        return parsed.rawBlocks;
    }
    return [barcode];
}
