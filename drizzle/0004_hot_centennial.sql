ALTER TABLE "siscomex_fee_config" ALTER COLUMN "additions_11_to_20" SET DATA TYPE numeric(12, 2);--> statement-breakpoint
ALTER TABLE "siscomex_fee_config" ALTER COLUMN "additions_11_to_20" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "siscomex_fee_config" ALTER COLUMN "additions_11_to_20" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "siscomex_fee_config" ALTER COLUMN "additions_21_to_50" SET DATA TYPE numeric(12, 2);--> statement-breakpoint
ALTER TABLE "siscomex_fee_config" ALTER COLUMN "additions_21_to_50" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "siscomex_fee_config" ALTER COLUMN "additions_21_to_50" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "siscomex_fee_config" ALTER COLUMN "additions_51_and_above" SET DATA TYPE numeric(12, 2);--> statement-breakpoint
ALTER TABLE "siscomex_fee_config" ALTER COLUMN "additions_51_and_above" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "siscomex_fee_config" ALTER COLUMN "additions_51_and_above" SET NOT NULL;