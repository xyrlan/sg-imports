ALTER TABLE "quote_items" ADD COLUMN "siscomex_value_snapshot" numeric(12, 4) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "quote_items" ADD COLUMN "afrmm_value_snapshot" numeric(12, 4) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "quote_items" ADD COLUMN "icms_rate_snapshot" numeric(5, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "quote_items" ADD COLUMN "icms_value_snapshot" numeric(12, 4) DEFAULT '0' NOT NULL;