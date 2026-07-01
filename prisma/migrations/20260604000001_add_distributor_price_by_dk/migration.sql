-- AlterTable: add distributorPriceByDk to products
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "distributorPriceByDk" JSONB;

-- Update the trial lens product to set correct prices:
-- Clinic/optic price: 12 000 ₸ (as shown in UI)
-- Distributor price: 7 600 ₸ (from official price list)
UPDATE "products"
SET
  "price" = 12000,
  "distributorPriceByDk" = '{"50": 7600}'::jsonb
WHERE "sku" = 'ML-TRIAL-DK50';

-- Update spherical lens DK pricing for distributors:
-- DK 100: 17 500, DK 125: 18 500, DK 180: 20 500
UPDATE "products"
SET "distributorPriceByDk" = '{"100": 17500, "125": 18500, "180": 20500}'::jsonb
WHERE "description" = 'spherical' AND "category" = 'lens';

-- Update toric lens DK pricing for distributors:
-- DK 100: 18 500, DK 125: 19 500, DK 180: 21 500
UPDATE "products"
SET "distributorPriceByDk" = '{"100": 18500, "125": 19500, "180": 21500}'::jsonb
WHERE "description" = 'toric' AND "category" = 'lens';
