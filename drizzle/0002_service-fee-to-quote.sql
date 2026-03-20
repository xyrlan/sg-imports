-- Step 1: Add service_fee_snapshot to quotes
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "service_fee_snapshot" numeric(12, 4);

-- Step 2: Migrate service_fee_configs from organization to quote
-- Old org-level configs are no longer relevant; new quote-level configs will be created on demand
DELETE FROM "service_fee_configs";

-- Drop old FK and unique constraint
ALTER TABLE "service_fee_configs" DROP CONSTRAINT IF EXISTS "service_fee_configs_organization_id_organizations_id_fk";
ALTER TABLE "service_fee_configs" DROP CONSTRAINT IF EXISTS "service_fee_configs_organization_id_unique";

-- Drop old column
ALTER TABLE "service_fee_configs" DROP COLUMN IF EXISTS "organization_id";

-- Add new quote_id column
ALTER TABLE "service_fee_configs" ADD COLUMN IF NOT EXISTS "quote_id" uuid NOT NULL;

-- Add FK and unique constraint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'service_fee_configs_quote_id_quotes_id_fk') THEN
    ALTER TABLE "service_fee_configs" ADD CONSTRAINT "service_fee_configs_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'service_fee_configs_quote_id_unique') THEN
    ALTER TABLE "service_fee_configs" ADD CONSTRAINT "service_fee_configs_quote_id_unique" UNIQUE("quote_id");
  END IF;
END $$;
