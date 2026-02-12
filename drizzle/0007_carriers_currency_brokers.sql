CREATE TABLE "currency_exchange_brokers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "carriers" ADD COLUMN "status" text;--> statement-breakpoint
ALTER TABLE "exchange_contracts" ADD COLUMN "broker_id" uuid;--> statement-breakpoint
ALTER TABLE "exchange_contracts" ADD CONSTRAINT "exchange_contracts_broker_id_currency_exchange_brokers_id_fk" FOREIGN KEY ("broker_id") REFERENCES "public"."currency_exchange_brokers"("id") ON DELETE no action ON UPDATE no action;