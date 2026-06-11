const odChar = 'toric';
const osChar = 'toric';
const odQty = 1;
const osQty = 1;
const odDk = '100';
const osDk = '125';
const odTrial = false;
const osTrial = false;

const distPriceList = {
  lenses: {
    probe: { '50': 7600 },
    toric: { '100': 18500, '125': 19500, '180': 21500 },
    spherical: { '100': 17500, '125': 18500, '180': 20500 }
  }
};

const getLensPrice = (product, dk, characteristic, isTrial) => {
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
    return 0;
};

const lensProducts = [{ description: 'toric' }];
const resolveLensProduct = (char, dk, isTrial) => {
    return lensProducts.find((p) => p.description === char);
};

const odProduct = odChar ? resolveLensProduct(odChar, odDk, odTrial) : undefined;
const osProduct = osChar ? resolveLensProduct(osChar, osDk, osTrial) : undefined;

const odUnitPrice = odProduct ? getLensPrice(odProduct, odDk, odChar, odTrial) : 0;
const osUnitPrice = osProduct ? getLensPrice(osProduct, osDk, osChar, osTrial) : 0;

const odPrice = odUnitPrice * odQty;
const osPrice = osUnitPrice * osQty;

console.log("odPrice:", odPrice);
console.log("osPrice:", osPrice);
console.log("totalPrice:", odPrice + osPrice);
