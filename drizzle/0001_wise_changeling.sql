CREATE TABLE "international_freight_ports_of_discharge" (
	"international_freight_id" uuid NOT NULL,
	"port_id" uuid NOT NULL,
	CONSTRAINT "international_freight_ports_of_discharge_international_freight_id_port_id_pk" PRIMARY KEY("international_freight_id","port_id")
);
--> statement-breakpoint
CREATE TABLE "international_freight_ports_of_loading" (
	"international_freight_id" uuid NOT NULL,
	"port_id" uuid NOT NULL,
	CONSTRAINT "international_freight_ports_of_loading_international_freight_id_port_id_pk" PRIMARY KEY("international_freight_id","port_id")
);
--> statement-breakpoint
ALTER TABLE "international_freights" DROP CONSTRAINT "international_freights_port_of_loading_id_ports_id_fk";
--> statement-breakpoint
ALTER TABLE "international_freights" DROP CONSTRAINT "international_freights_port_of_discharge_id_ports_id_fk";
--> statement-breakpoint
ALTER TABLE "international_freight_ports_of_discharge" ADD CONSTRAINT "international_freight_ports_of_discharge_international_freight_id_international_freights_id_fk" FOREIGN KEY ("international_freight_id") REFERENCES "public"."international_freights"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "international_freight_ports_of_discharge" ADD CONSTRAINT "international_freight_ports_of_discharge_port_id_ports_id_fk" FOREIGN KEY ("port_id") REFERENCES "public"."ports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "international_freight_ports_of_loading" ADD CONSTRAINT "international_freight_ports_of_loading_international_freight_id_international_freights_id_fk" FOREIGN KEY ("international_freight_id") REFERENCES "public"."international_freights"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "international_freight_ports_of_loading" ADD CONSTRAINT "international_freight_ports_of_loading_port_id_ports_id_fk" FOREIGN KEY ("port_id") REFERENCES "public"."ports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT INTO "international_freight_ports_of_loading" ("international_freight_id", "port_id")
SELECT "id", "port_of_loading_id" FROM "international_freights" WHERE "port_of_loading_id" IS NOT NULL;--> statement-breakpoint
INSERT INTO "international_freight_ports_of_discharge" ("international_freight_id", "port_id")
SELECT "id", "port_of_discharge_id" FROM "international_freights" WHERE "port_of_discharge_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "international_freights" DROP COLUMN "port_of_loading_id";--> statement-breakpoint
ALTER TABLE "international_freights" DROP COLUMN "port_of_discharge_id";