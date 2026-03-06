CREATE TYPE "public"."freight_proposal_status" AS ENUM('DRAFT', 'SENT', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."pricing_scope" AS ENUM('CARRIER', 'PORT', 'SPECIFIC');--> statement-breakpoint
CREATE TYPE "public"."wallet_transaction_type" AS ENUM('CREDIT', 'DEBIT');--> statement-breakpoint
CREATE TYPE "public"."webhook_status" AS ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TABLE "freight_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"international_freight_id" uuid NOT NULL,
	"status" "freight_proposal_status" DEFAULT 'DRAFT' NOT NULL,
	"freight_value" numeric(10, 2) NOT NULL,
	"total_value" numeric(10, 2) NOT NULL,
	"custom_taxes" jsonb,
	"transit_time_days" integer,
	"valid_until" timestamp,
	"pdf_url" text,
	"cnpj" text,
	"email" text,
	"reference" text,
	"incoterm" "incoterm" DEFAULT 'FOB',
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "international_freights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"carrier_id" uuid,
	"container_type" "container_type" NOT NULL,
	"port_of_loading_id" uuid NOT NULL,
	"port_of_discharge_id" uuid NOT NULL,
	"value" numeric(10, 2) NOT NULL,
	"currency" "currency" DEFAULT 'USD' NOT NULL,
	"free_time_days" integer DEFAULT 0,
	"expected_profit" numeric(10, 2),
	"valid_from" timestamp DEFAULT now() NOT NULL,
	"valid_to" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pricing_rule_id" uuid,
	"shipment_id" uuid,
	"name" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" "currency" DEFAULT 'BRL' NOT NULL,
	"basis" "fee_basis" DEFAULT 'PER_CONTAINER' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"carrier_id" uuid NOT NULL,
	"port_id" uuid,
	"container_type" "container_type",
	"scope" "pricing_scope" DEFAULT 'SPECIFIC' NOT NULL,
	"valid_from" timestamp NOT NULL,
	"valid_to" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipment_freight_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" uuid NOT NULL,
	"carrier_id" uuid NOT NULL,
	"container_type" "container_type" NOT NULL,
	"container_quantity" integer DEFAULT 1 NOT NULL,
	"port_of_loading_id" uuid NOT NULL,
	"port_of_discharge_id" uuid NOT NULL,
	"freight_value" numeric(10, 2) NOT NULL,
	"dolar_quotation" numeric(10, 4) NOT NULL,
	"document_id" uuid,
	"freight_expenses" jsonb DEFAULT '[]'::jsonb,
	"pricing_items" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shipment_freight_receipts_shipment_id_unique" UNIQUE("shipment_id")
);
--> statement-breakpoint
CREATE TABLE "sub_suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"name" text NOT NULL,
	"tax_id" text,
	"country_code" text DEFAULT 'CN',
	"email" text,
	"address" text,
	"siscomex_id" text,
	CONSTRAINT "sub_suppliers_siscomex_id_unique" UNIQUE("siscomex_id")
);
--> statement-breakpoint
CREATE TABLE "suppliers_wallet_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid NOT NULL,
	"exchange_contract_id" uuid,
	"order_id" uuid,
	"transaction_id" uuid,
	"amount" numeric(10, 2) NOT NULL,
	"type" "wallet_transaction_type" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "suppliers_wallet_transactions_wallet_id_order_id_type_pk" PRIMARY KEY("wallet_id","order_id","type")
);
--> statement-breakpoint
CREATE TABLE "suppliers_wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"balance_usd" numeric(10, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"event_type" text NOT NULL,
	"external_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "webhook_status" DEFAULT 'PENDING' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_events_provider_external_id_event_type_key" UNIQUE("provider","external_id","event_type")
);
--> statement-breakpoint
ALTER TABLE "freight_proposals" ADD CONSTRAINT "freight_proposals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "freight_proposals" ADD CONSTRAINT "freight_proposals_international_freight_id_international_freights_id_fk" FOREIGN KEY ("international_freight_id") REFERENCES "public"."international_freights"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "freight_proposals" ADD CONSTRAINT "freight_proposals_created_by_id_profiles_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "international_freights" ADD CONSTRAINT "international_freights_carrier_id_carriers_id_fk" FOREIGN KEY ("carrier_id") REFERENCES "public"."carriers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "international_freights" ADD CONSTRAINT "international_freights_port_of_loading_id_ports_id_fk" FOREIGN KEY ("port_of_loading_id") REFERENCES "public"."ports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "international_freights" ADD CONSTRAINT "international_freights_port_of_discharge_id_ports_id_fk" FOREIGN KEY ("port_of_discharge_id") REFERENCES "public"."ports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_items" ADD CONSTRAINT "pricing_items_pricing_rule_id_pricing_rules_id_fk" FOREIGN KEY ("pricing_rule_id") REFERENCES "public"."pricing_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_items" ADD CONSTRAINT "pricing_items_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_carrier_id_carriers_id_fk" FOREIGN KEY ("carrier_id") REFERENCES "public"."carriers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_port_id_ports_id_fk" FOREIGN KEY ("port_id") REFERENCES "public"."ports"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_freight_receipts" ADD CONSTRAINT "shipment_freight_receipts_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_freight_receipts" ADD CONSTRAINT "shipment_freight_receipts_carrier_id_carriers_id_fk" FOREIGN KEY ("carrier_id") REFERENCES "public"."carriers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_freight_receipts" ADD CONSTRAINT "shipment_freight_receipts_port_of_loading_id_ports_id_fk" FOREIGN KEY ("port_of_loading_id") REFERENCES "public"."ports"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_freight_receipts" ADD CONSTRAINT "shipment_freight_receipts_port_of_discharge_id_ports_id_fk" FOREIGN KEY ("port_of_discharge_id") REFERENCES "public"."ports"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_freight_receipts" ADD CONSTRAINT "shipment_freight_receipts_document_id_shipment_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."shipment_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sub_suppliers" ADD CONSTRAINT "sub_suppliers_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers_wallet_transactions" ADD CONSTRAINT "suppliers_wallet_transactions_wallet_id_suppliers_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."suppliers_wallets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers_wallet_transactions" ADD CONSTRAINT "suppliers_wallet_transactions_exchange_contract_id_exchange_contracts_id_fk" FOREIGN KEY ("exchange_contract_id") REFERENCES "public"."exchange_contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers_wallet_transactions" ADD CONSTRAINT "suppliers_wallet_transactions_order_id_shipments_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers_wallet_transactions" ADD CONSTRAINT "suppliers_wallet_transactions_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers_wallets" ADD CONSTRAINT "suppliers_wallets_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "webhook_events_status_created_at_idx" ON "webhook_events" USING btree ("status","created_at");