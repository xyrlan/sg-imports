-- Migration: Add simulated_product_snapshot to quote_items for SIMULATION support
-- Run with: psql $DIRECT_URL -f scripts/migrate-quote-items-simulation.sql
-- Or: bunx dotenv -e .env -- psql -f scripts/migrate-quote-items-simulation.sql

-- 1. Add simulated_product_snapshot column (nullable)
ALTER TABLE "quote_items" ADD COLUMN IF NOT EXISTS "simulated_product_snapshot" jsonb;

-- 2. Make variant_id nullable (for simulated items)
ALTER TABLE "quote_items" ALTER COLUMN "variant_id" DROP NOT NULL;

-- 3. Add check constraint (variant_id OR simulated_product_snapshot must be set)
-- Drop first if it exists (idempotent)
ALTER TABLE "quote_items" DROP CONSTRAINT IF EXISTS "quote_items_variant_or_simulated";
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_variant_or_simulated" 
  CHECK (("variant_id" IS NOT NULL) OR ("simulated_product_snapshot" IS NOT NULL));
