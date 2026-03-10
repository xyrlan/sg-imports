ALTER TABLE "storage_rules" ALTER COLUMN "cif_insurance" SET DATA TYPE numeric(10, 6);--> statement-breakpoint
ALTER TABLE "storage_rules" ALTER COLUMN "cif_insurance" SET DEFAULT '0';