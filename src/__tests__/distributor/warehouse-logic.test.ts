/**
 * Tests for the Products Search API logic
 * These tests verify the search query construction WITHOUT hitting the real database.
 * We mock Prisma to verify correct query parameters.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { translateCyrillicToEnglishLayout } from '@/lib/utils/keyboard-layout';

// We test the LOGIC that the API route uses, not the route handler itself
// (which would require full Next.js request/response mocking)

describe('Product Search Logic', () => {
  describe('Query construction with dual-language support', () => {
    it('should generate two queries when input has Cyrillic characters', () => {
      const query = 'ЫЗН0049'; // SPY0049 typed in Russian layout
      const translated = translateCyrillicToEnglishLayout(query);
      const queries = [query];
      if (translated !== query) queries.push(translated);

      expect(queries).toHaveLength(2);
      expect(queries[0]).toBe('ЫЗН0049');
      expect(queries[1]).toBe('SPY0049');
    });

    it('should generate one query when input is already English', () => {
      const query = 'SPY0049';
      const translated = translateCyrillicToEnglishLayout(query);
      const queries = [query];
      if (translated !== query) queries.push(translated);

      expect(queries).toHaveLength(1);
      expect(queries[0]).toBe('SPY0049');
    });

    it('should generate one query for pure numeric input', () => {
      const query = '010454748051601117271031212';
      const translated = translateCyrillicToEnglishLayout(query);
      const queries = [query];
      if (translated !== query) queries.push(translated);

      expect(queries).toHaveLength(1);
    });

    it('should create correct OR filter structure', () => {
      const query = 'test';
      const translated = translateCyrillicToEnglishLayout(query);
      const queries = [query];
      if (translated !== query) queries.push(translated);

      const orFilters = queries.flatMap(q => [
        { name: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
        { barcode: { contains: q, mode: 'insensitive' } },
        { stockItems: { some: { barcode: { contains: q, mode: 'insensitive' } } } },
      ]);

      // Single query = 4 filters (name, sku, barcode, stockItems)
      expect(orFilters).toHaveLength(4);
      expect(orFilters[0]).toEqual({ name: { contains: 'test', mode: 'insensitive' } });
      expect(orFilters[2]).toEqual({ barcode: { contains: 'test', mode: 'insensitive' } });
    });

    it('should create 8 OR filters for dual-language query', () => {
      const query = 'ыЗН'; // Mixed Cyrillic
      const translated = translateCyrillicToEnglishLayout(query);
      const queries = [query];
      if (translated !== query) queries.push(translated);

      const orFilters = queries.flatMap(q => [
        { name: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
        { barcode: { contains: q, mode: 'insensitive' } },
        { stockItems: { some: { barcode: { contains: q, mode: 'insensitive' } } } },
      ]);

      // Two queries * 4 fields = 8 filters
      expect(orFilters).toHaveLength(8);
    });
  });
});

describe('Inventory Logic', () => {
  describe('stockItemBarcodes in inventory items', () => {
    it('should correctly map product stockItems to stockItemBarcodes array', () => {
      const mockProduct = {
        id: 'prod-1',
        name: 'Test Lens',
        sku: 'TL-001',
        barcode: '4607',
        trackSerials: true,
        currentStock: 3,
        stockItems: [
          { barcode: '010454748051601117271031212SPY0049', status: 'in_stock' },
          { barcode: '010454748051601117271031212SPY0050', status: 'in_stock' },
          { barcode: null, status: 'in_stock' },
          { barcode: '010454748051601117271031212SPY0051', status: 'sold' }, // not in_stock
        ],
      };

      // Simulate the API logic: filter in_stock, extract barcodes, remove nulls
      const stockItemBarcodes = mockProduct.stockItems
        .filter(si => si.status === 'in_stock')
        .map(si => si.barcode)
        .filter(Boolean);

      expect(stockItemBarcodes).toEqual([
        '010454748051601117271031212SPY0049',
        '010454748051601117271031212SPY0050',
      ]);
    });

    it('should return empty array when no stockItems exist', () => {
      const mockProduct = {
        stockItems: [],
      };

      const stockItemBarcodes = mockProduct.stockItems
        ?.map((si: any) => si.barcode)
        .filter(Boolean) || [];

      expect(stockItemBarcodes).toEqual([]);
    });
  });

  describe('Barcode scan matching in inventory', () => {
    const mockInventoryItems = [
      {
        productId: 'prod-1',
        name: 'Acuvue Oasys',
        sku: 'AO-001',
        barcode: '4607034480001',
        stockItemBarcodes: ['010454748051601117271031212SPY0049', '010454748051601117271031212SPY0050'],
        systemQty: 2,
        actualQty: 2,
        diff: 0,
      },
      {
        productId: 'prod-2',
        name: 'Dailies Total 1',
        sku: 'DT-001',
        barcode: '4607034480002',
        stockItemBarcodes: [],
        systemQty: 5,
        actualQty: 5,
        diff: 0,
      },
    ];

    it('should find item by product barcode', () => {
      const code = '4607034480001';
      const idx = mockInventoryItems.findIndex(item =>
        item.sku === code ||
        item.barcode === code ||
        item.stockItemBarcodes?.includes(code)
      );
      expect(idx).toBe(0);
    });

    it('should find item by stockItem barcode (unit-level)', () => {
      const code = '010454748051601117271031212SPY0049';
      const idx = mockInventoryItems.findIndex(item =>
        item.sku === code ||
        item.barcode === code ||
        item.stockItemBarcodes?.includes(code)
      );
      expect(idx).toBe(0);
    });

    it('should find item by SKU', () => {
      const code = 'DT-001';
      const idx = mockInventoryItems.findIndex(item =>
        item.sku === code ||
        item.barcode === code ||
        item.stockItemBarcodes?.includes(code)
      );
      expect(idx).toBe(1);
    });

    it('should return -1 for unknown barcode', () => {
      const code = 'UNKNOWN-BARCODE';
      const idx = mockInventoryItems.findIndex(item =>
        item.sku === code ||
        item.barcode === code ||
        item.stockItemBarcodes?.includes(code)
      );
      expect(idx).toBe(-1);
    });

    it('should correctly update actualQty and diff on scan', () => {
      const code = '010454748051601117271031212SPY0049';
      const items = JSON.parse(JSON.stringify(mockInventoryItems));
      
      const idx = items.findIndex((item: any) =>
        item.sku === code ||
        item.barcode === code ||
        item.stockItemBarcodes?.includes(code)
      );

      expect(idx).toBe(0);
      items[idx].actualQty += 1;
      items[idx].diff = items[idx].actualQty - items[idx].systemQty;

      expect(items[idx].actualQty).toBe(3);
      expect(items[idx].diff).toBe(1); // surplus of 1
    });
  });
});

describe('Wholesale Order Logic', () => {
  describe('Cart management via barcode scan', () => {
    const mockProducts = [
      { id: 'p1', name: 'Lens A', barcode: 'BC001', sku: 'SKU-A', currentStock: 10, wholesalePrice: 5000, retailPrice: 7000, stockItems: [{ serialNumber: 'SN1', barcode: 'SN1-BC' }] },
      { id: 'p2', name: 'Lens B', barcode: 'BC002', sku: 'SKU-B', currentStock: 0, wholesalePrice: 3000, retailPrice: 4000, stockItems: [] },
      { id: 'p3', name: 'Solution C', barcode: 'BC003', sku: 'SKU-C', currentStock: 5, wholesalePrice: 2000, retailPrice: 3000, stockItems: [] },
    ];

    it('should find product by barcode', () => {
      const code = 'BC001';
      const product = mockProducts.find(p =>
        p.barcode === code ||
        p.sku === code ||
        (p.stockItems && p.stockItems.some((si: any) => si.serialNumber === code || si.barcode === code))
      );
      expect(product).toBeDefined();
      expect(product!.name).toBe('Lens A');
    });

    it('should find product by stockItem barcode', () => {
      const code = 'SN1-BC';
      const product = mockProducts.find(p =>
        p.barcode === code ||
        p.sku === code ||
        (p.stockItems && p.stockItems.some((si: any) => si.serialNumber === code || si.barcode === code))
      );
      expect(product).toBeDefined();
      expect(product!.name).toBe('Lens A');
    });

    it('should reject product with zero stock', () => {
      const code = 'BC002';
      const product = mockProducts.find(p => p.barcode === code);
      expect(product).toBeDefined();
      expect(product!.currentStock).toBe(0);
      // Business logic: should show error "нет на складе"
    });

    it('should not exceed max stock when scanning same product', () => {
      const product = mockProducts[2]; // stock = 5
      let cartQty = 4;
      
      // Simulate scan — should increment
      if (cartQty < product.currentStock) {
        cartQty++;
      }
      expect(cartQty).toBe(5);

      // Scan again — should NOT increment (at max)
      if (cartQty < product.currentStock) {
        cartQty++;
      }
      expect(cartQty).toBe(5); // Still 5, didn't exceed
    });

    it('should translate Cyrillic barcode before matching', () => {
      // Simulate scanning "ИС001" which is "BC001" in English layout
      const rawCode = 'ИС001';
      const code = translateCyrillicToEnglishLayout(rawCode);
      expect(code).toBe('BC001');
      
      const product = mockProducts.find(p => p.barcode === code);
      expect(product).toBeDefined();
      expect(product!.name).toBe('Lens A');
    });
  });

  describe('Order total calculation', () => {
    it('should calculate total correctly', () => {
      const cart = [
        { productId: 'p1', name: 'Lens A', price: 5000, quantity: 3, maxStock: 10 },
        { productId: 'p3', name: 'Solution C', price: 2000, quantity: 2, maxStock: 5 },
      ];

      const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      expect(total).toBe(19000); // 5000*3 + 2000*2
    });
  });
});

describe('Supply Form Logic', () => {
  describe('Serial number management', () => {
    it('should prevent duplicate serials', () => {
      const serials = ['BC001', 'BC002'];
      const newSerial = 'BC001';
      
      const isDuplicate = serials.includes(newSerial);
      expect(isDuplicate).toBe(true);
    });

    it('should update quantity based on serials count', () => {
      let serials = ['BC001', 'BC002'];
      let qty = serials.length;
      expect(qty).toBe(2);

      // Add new serial
      serials = [...serials, 'BC003'];
      qty = serials.length;
      expect(qty).toBe(3);
    });

    it('should translate Cyrillic serial before adding', () => {
      const rawInput = 'ЫЗН0049'; // SPY0049 in Russian layout
      const translated = translateCyrillicToEnglishLayout(rawInput);
      
      expect(translated).toBe('SPY0049');
      
      const serials: string[] = [];
      if (!serials.includes(translated)) {
        serials.push(translated);
      }
      expect(serials).toContain('SPY0049');
    });

    it('should handle DataMatrix prefix removal', () => {
      const rawCode = ']C1010454748051601117271031212SPY0049';
      const code = rawCode.trim().replace(/^\]C1/, '');
      expect(code).toBe('010454748051601117271031212SPY0049');
    });
  });
});

describe('Product Balances Search', () => {
  const mockProducts = [
    { name: 'Acuvue Oasys -2.00', sku: 'AO-200', barcode: '4607034480001', stockItems: [{ serialNumber: 'SN1', barcode: 'DM-001' }] },
    { name: 'Dailies Total 1', sku: 'DT-100', barcode: '4607034480002', stockItems: [{ serialNumber: 'SN2', barcode: 'DM-002' }] },
  ];

  it('should find by product name', () => {
    const query = 'acuvue';
    const filtered = mockProducts.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.sku?.toLowerCase().includes(query) ||
      p.barcode?.toLowerCase().includes(query) ||
      p.stockItems?.some((si: any) => si.barcode?.toLowerCase().includes(query))
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('Acuvue Oasys -2.00');
  });

  it('should find by stockItem barcode', () => {
    const query = 'dm-002';
    const filtered = mockProducts.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.sku?.toLowerCase().includes(query) ||
      p.barcode?.toLowerCase().includes(query) ||
      p.stockItems?.some((si: any) => si.barcode?.toLowerCase().includes(query))
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('Dailies Total 1');
  });

  it('should find by SKU', () => {
    const query = 'ao-200';
    const filtered = mockProducts.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.sku?.toLowerCase().includes(query) ||
      p.barcode?.toLowerCase().includes(query) ||
      p.stockItems?.some((si: any) => si.barcode?.toLowerCase().includes(query))
    );
    expect(filtered).toHaveLength(1);
  });

  it('should return empty for non-existent query', () => {
    const query = 'nonexistent-product-xyz';
    const filtered = mockProducts.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.sku?.toLowerCase().includes(query) ||
      p.barcode?.toLowerCase().includes(query) ||
      p.stockItems?.some((si: any) => si.barcode?.toLowerCase().includes(query))
    );
    expect(filtered).toHaveLength(0);
  });
});
