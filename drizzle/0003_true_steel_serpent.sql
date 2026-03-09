ALTER TABLE "pricing_items" DROP CONSTRAINT "pricing_items_shipment_id_shipments_id_fk";
--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD COLUMN "port_direction" text DEFAULT 'BOTH' NOT NULL;--> statement-breakpoint
ALTER TABLE "pricing_items" DROP COLUMN "shipment_id";--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_scope_integrity" CHECK ((
        ("pricing_rules"."scope" = 'CARRIER' AND "pricing_rules"."port_id" IS NULL AND "pricing_rules"."container_type" IS NULL)
        OR ("pricing_rules"."scope" = 'PORT' AND "pricing_rules"."port_id" IS NOT NULL AND "pricing_rules"."container_type" IS NULL)
        OR ("pricing_rules"."scope" = 'SPECIFIC' AND "pricing_rules"."port_id" IS NOT NULL AND "pricing_rules"."container_type" IS NOT NULL)
      ));