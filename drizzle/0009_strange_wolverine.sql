ALTER TABLE "international_freights" DROP CONSTRAINT "int_freight_carrier_container_unique";--> statement-breakpoint
ALTER TABLE "international_freights" ALTER COLUMN "container_type" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "international_freights" ADD COLUMN "shipping_modality" "shipping_modality" DEFAULT 'SEA_FCL' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "int_freight_carrier_container_sea_fcl_unique" ON "international_freights" ("carrier_id", "container_type") WHERE "shipping_modality" = 'SEA_FCL' AND "carrier_id" IS NOT NULL AND "container_type" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "int_freight_carrier_air_unique" ON "international_freights" ("carrier_id") WHERE "shipping_modality" = 'AIR' AND "carrier_id" IS NOT NULL;