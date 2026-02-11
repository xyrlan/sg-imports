-- Create global service fee config (singleton)
CREATE TABLE IF NOT EXISTS "global_service_fee_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"minimum_wage_brl" numeric(10, 2) DEFAULT '1530.00' NOT NULL,
	"default_multiplier" integer DEFAULT 2 NOT NULL,
	"default_percentage" numeric(5, 2) DEFAULT '2.5',
	"default_apply_to_china" boolean DEFAULT true,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Insert default global config
INSERT INTO "global_service_fee_config" ("id", "minimum_wage_brl", "default_multiplier", "default_percentage", "default_apply_to_china")
SELECT gen_random_uuid(), '1530.00', 2, '2.5', true
WHERE NOT EXISTS (SELECT 1 FROM "global_service_fee_config" LIMIT 1);
--> statement-breakpoint

-- Add minimum_value_multiplier to service_fee_configs
ALTER TABLE "service_fee_configs" ADD COLUMN IF NOT EXISTS "minimum_value_multiplier" integer DEFAULT 2 NOT NULL;
--> statement-breakpoint

-- Migrate existing data: infer multiplier from minimum_value / 1530, clamp to 2-4
UPDATE "service_fee_configs"
SET "minimum_value_multiplier" = LEAST(4, GREATEST(2, ROUND((COALESCE("minimum_value"::numeric, 3060) / 1530)::numeric)::integer));
--> statement-breakpoint

-- Drop obsolete columns
ALTER TABLE "service_fee_configs" DROP COLUMN IF EXISTS "minimum_value";
--> statement-breakpoint
ALTER TABLE "service_fee_configs" DROP COLUMN IF EXISTS "currency";
