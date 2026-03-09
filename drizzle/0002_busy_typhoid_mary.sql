ALTER TABLE "international_freight_ports_of_discharge" RENAME TO "int_freight_ports_discharge";--> statement-breakpoint
ALTER TABLE "international_freight_ports_of_loading" RENAME TO "int_freight_ports_loading";--> statement-breakpoint
ALTER TABLE "int_freight_ports_discharge" DROP CONSTRAINT "international_freight_ports_of_discharge_international_freight_id_international_freights_id_fk";
--> statement-breakpoint
ALTER TABLE "int_freight_ports_discharge" DROP CONSTRAINT "international_freight_ports_of_discharge_port_id_ports_id_fk";
--> statement-breakpoint
ALTER TABLE "int_freight_ports_loading" DROP CONSTRAINT "international_freight_ports_of_loading_international_freight_id_international_freights_id_fk";
--> statement-breakpoint
ALTER TABLE "int_freight_ports_loading" DROP CONSTRAINT "international_freight_ports_of_loading_port_id_ports_id_fk";
--> statement-breakpoint
ALTER TABLE "int_freight_ports_discharge" DROP CONSTRAINT "international_freight_ports_of_discharge_international_freight_id_port_id_pk";--> statement-breakpoint
ALTER TABLE "int_freight_ports_loading" DROP CONSTRAINT "international_freight_ports_of_loading_international_freight_id_port_id_pk";--> statement-breakpoint
ALTER TABLE "int_freight_ports_discharge" ADD CONSTRAINT "int_freight_discharge_pk" PRIMARY KEY("international_freight_id","port_id");--> statement-breakpoint
ALTER TABLE "int_freight_ports_loading" ADD CONSTRAINT "int_freight_loading_pk" PRIMARY KEY("international_freight_id","port_id");--> statement-breakpoint
ALTER TABLE "int_freight_ports_discharge" ADD CONSTRAINT "int_freight_ports_discharge_international_freight_id_international_freights_id_fk" FOREIGN KEY ("international_freight_id") REFERENCES "public"."international_freights"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "int_freight_ports_discharge" ADD CONSTRAINT "int_freight_ports_discharge_port_id_ports_id_fk" FOREIGN KEY ("port_id") REFERENCES "public"."ports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "int_freight_ports_loading" ADD CONSTRAINT "int_freight_ports_loading_international_freight_id_international_freights_id_fk" FOREIGN KEY ("international_freight_id") REFERENCES "public"."international_freights"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "int_freight_ports_loading" ADD CONSTRAINT "int_freight_ports_loading_port_id_ports_id_fk" FOREIGN KEY ("port_id") REFERENCES "public"."ports"("id") ON DELETE cascade ON UPDATE no action;