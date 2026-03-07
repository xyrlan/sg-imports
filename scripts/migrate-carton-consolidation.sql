-- Migration: Consolidate product_variants to carton nomenclature
-- Removes box_quantity and box_weight; migrates data to units_per_carton and carton_*
-- Run in Supabase SQL Editor before deploying new code.
-- Minimum sale unit: 1 carton. All freight/CBM calculations use carton_* fields.

BEGIN;

-- 1. Migrate data: copy box_quantity -> units_per_carton (prefer box_quantity when present)
UPDATE product_variants
SET units_per_carton = COALESCE(box_quantity, units_per_carton, 1)
WHERE box_quantity IS NOT NULL;

-- 2. Migrate data: copy box_weight -> carton_weight (when carton_weight is null or zero)
UPDATE product_variants
SET carton_weight = COALESCE(NULLIF(carton_weight, 0), box_weight)
WHERE box_weight IS NOT NULL;

-- 3. Fill NULLs with defaults before ALTER (carton dimensions for CBM)
UPDATE product_variants SET carton_height = 0 WHERE carton_height IS NULL;
UPDATE product_variants SET carton_width = 0 WHERE carton_width IS NULL;
UPDATE product_variants SET carton_length = 0 WHERE carton_length IS NULL;
UPDATE product_variants SET carton_weight = 0 WHERE carton_weight IS NULL;
UPDATE product_variants SET units_per_carton = 1 WHERE units_per_carton IS NULL;

-- 4. Alter carton columns to NOT NULL with defaults
ALTER TABLE product_variants
  ALTER COLUMN carton_height SET DEFAULT 0,
  ALTER COLUMN carton_height SET NOT NULL;

ALTER TABLE product_variants
  ALTER COLUMN carton_width SET DEFAULT 0,
  ALTER COLUMN carton_width SET NOT NULL;

ALTER TABLE product_variants
  ALTER COLUMN carton_length SET DEFAULT 0,
  ALTER COLUMN carton_length SET NOT NULL;

ALTER TABLE product_variants
  ALTER COLUMN carton_weight SET DEFAULT 0,
  ALTER COLUMN carton_weight SET NOT NULL;

-- 5. Drop obsolete columns
ALTER TABLE product_variants DROP COLUMN IF EXISTS box_quantity;
ALTER TABLE product_variants DROP COLUMN IF EXISTS box_weight;

COMMIT;
