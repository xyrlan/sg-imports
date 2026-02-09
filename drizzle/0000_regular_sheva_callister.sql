CREATE TYPE "public"."container_type" AS ENUM('GP_20', 'GP_40', 'HC_40', 'RF_20', 'RF_40');--> statement-breakpoint
CREATE TYPE "public"."currency" AS ENUM('BRL', 'USD', 'CNY', 'EUR');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('COMMERCIAL_INVOICE', 'PACKING_LIST', 'BILL_OF_LADING', 'IMPORT_DECLARATION', 'ORIGIN_CERTIFICATE', 'SISCOMEX_RECEIPT', 'ICMS_PROOF', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."expense_type" AS ENUM('TAX_II', 'TAX_IPI', 'TAX_PIS', 'TAX_COFINS', 'TAX_ICMS', 'FREIGHT_INTL', 'FREIGHT_LOCAL', 'STORAGE', 'HANDLING', 'CUSTOMS_BROKER', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."incoterm" AS ENUM('EXW', 'FOB', 'CIF', 'DDP');--> statement-breakpoint
CREATE TYPE "public"."order_type" AS ENUM('ORDER', 'DIRECT_ORDER');--> statement-breakpoint
CREATE TYPE "public"."organization_role" AS ENUM('OWNER', 'ADMIN', 'OPERATOR', 'VIEWER');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'PAID', 'OVERDUE', 'WAITING_EXCHANGE', 'EXCHANGED');--> statement-breakpoint
CREATE TYPE "public"."quote_status" AS ENUM('DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'CONVERTED');--> statement-breakpoint
CREATE TYPE "public"."quote_type" AS ENUM('STANDARD', 'PROFORMA', 'SIMULATION');--> statement-breakpoint
CREATE TYPE "public"."shipment_status" AS ENUM('PENDING', 'PRODUCTION', 'BOOKED', 'IN_TRANSIT', 'CUSTOMS_CLEARANCE', 'RELEASED', 'DELIVERED', 'CANCELED');--> statement-breakpoint
CREATE TYPE "public"."shipment_step" AS ENUM('CONTRACT_CREATION', 'MERCHANDISE_PAYMENT', 'DOCUMENT_PREPARATION', 'SHIPPING', 'DELIVERY', 'COMPLETION');--> statement-breakpoint
CREATE TYPE "public"."shipment_type" AS ENUM('FCL', 'FCL_PARTIAL', 'LCL');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('MERCHANDISE', 'BALANCE', 'FREIGHT', 'TAXES', 'SERVICE_FEE');--> statement-breakpoint
CREATE TABLE "addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"street" text NOT NULL,
	"number" text NOT NULL,
	"complement" text,
	"neighborhood" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"postal_code" text NOT NULL,
	"country" text DEFAULT 'Brazil' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carriers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"scac_code" text,
	CONSTRAINT "carriers_scac_code_unique" UNIQUE("scac_code")
);
--> statement-breakpoint
CREATE TABLE "exchange_contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"contract_number" text NOT NULL,
	"broker_name" text,
	"closed_at" timestamp NOT NULL,
	"vet_date" timestamp,
	"amount_usd" numeric(12, 2) NOT NULL,
	"exchange_rate" numeric(10, 4) NOT NULL,
	"effective_rate" numeric(10, 4),
	"swift_file_url" text,
	"contract_file_url" text
);
--> statement-breakpoint
CREATE TABLE "hs_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"ii" numeric(5, 2) DEFAULT '0',
	"ipi" numeric(5, 2) DEFAULT '0',
	"pis" numeric(5, 2) DEFAULT '0',
	"cofins" numeric(5, 2) DEFAULT '0',
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hs_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "integration_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" uuid,
	"provider" text NOT NULL,
	"endpoint" text NOT NULL,
	"method" text NOT NULL,
	"request_payload" jsonb,
	"response_payload" jsonb,
	"status_code" integer,
	"is_error" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid DEFAULT gen_random_uuid(),
	"role" "organization_role" NOT NULL,
	"organization_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "memberships_organization_id_profile_id_pk" PRIMARY KEY("organization_id","profile_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"organization_id" uuid,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" text DEFAULT 'INFO',
	"read" boolean DEFAULT false,
	"action_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"trade_name" text,
	"document" text NOT NULL,
	"email" text,
	"phone" text,
	"tax_regime" text,
	"state_registry" text,
	"order_type" "order_type" DEFAULT 'ORDER' NOT NULL,
	"min_order_value" numeric(10, 2) DEFAULT '0',
	"billing_address_id" uuid,
	"delivery_address_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_document_unique" UNIQUE("document")
);
--> statement-breakpoint
CREATE TABLE "ports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"country" text NOT NULL,
	CONSTRAINT "ports_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"name" text NOT NULL,
	"price_usd" numeric(10, 2) NOT NULL,
	"height" numeric(10, 2),
	"width" numeric(10, 2),
	"length" numeric(10, 2),
	"net_weight" numeric(10, 3)
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"internal_code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"photos" text[],
	"box_quantity" integer NOT NULL,
	"box_weight" numeric(10, 3) NOT NULL,
	"hs_code_id" uuid,
	"supplier_id" uuid,
	"siscomex_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "products_siscomex_id_unique" UNIQUE("siscomex_id")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"full_name" text,
	"avatar_url" text,
	"phone" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "quote_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"price_usd" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"type" "quote_type" DEFAULT 'STANDARD' NOT NULL,
	"status" "quote_status" DEFAULT 'DRAFT' NOT NULL,
	"name" text NOT NULL,
	"target_dolar" numeric(10, 4) NOT NULL,
	"incoterm" "incoterm" DEFAULT 'FOB' NOT NULL,
	"port_origin_id" uuid,
	"port_dest_id" uuid,
	"generated_shipment_id" uuid,
	"metadata" jsonb,
	"simulated_product" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_fee_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"percentage" numeric(5, 2) DEFAULT '2.5',
	"minimum_value" numeric(10, 2) DEFAULT '3060.00',
	"currency" "currency" DEFAULT 'BRL',
	"apply_to_china" boolean DEFAULT true,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "service_fee_configs_organization_id_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
CREATE TABLE "shipment_change_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" uuid NOT NULL,
	"requested_by_id" uuid NOT NULL,
	"status" text DEFAULT 'PENDING',
	"description" text NOT NULL,
	"changes_json" jsonb,
	"admin_response" text,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipment_containers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" uuid NOT NULL,
	"container_number" text,
	"type" "container_type" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipment_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" uuid NOT NULL,
	"type" "document_type" NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"status" text DEFAULT 'PENDING',
	"rejection_reason" text,
	"uploaded_by_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipment_expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" uuid NOT NULL,
	"category" "expense_type" NOT NULL,
	"description" text NOT NULL,
	"value" numeric(10, 2) NOT NULL,
	"currency" "currency" DEFAULT 'BRL' NOT NULL,
	"exchange_rate" numeric(10, 4) DEFAULT '1',
	"status" "payment_status" DEFAULT 'PENDING' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipment_step_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" uuid NOT NULL,
	"step" "shipment_step" NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"completed_by_id" uuid,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "shipments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"code" integer GENERATED ALWAYS AS IDENTITY (sequence name "shipments_code_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"status" "shipment_status" DEFAULT 'PENDING' NOT NULL,
	"booking_number" text,
	"master_bl" text,
	"carrier_id" uuid,
	"shipment_type" "shipment_type" DEFAULT 'FCL' NOT NULL,
	"total_products_usd" numeric(12, 2) DEFAULT '0',
	"total_costs_brl" numeric(12, 2) DEFAULT '0',
	"etd" timestamp,
	"eta" timestamp,
	"current_step" "shipment_step" DEFAULT 'CONTRACT_CREATION' NOT NULL,
	"zap_sign_id" text,
	"zap_sign_token" text,
	"zap_sign_status" text DEFAULT 'created',
	"ships_go_id" text,
	"ships_go_tracking_url" text,
	"ships_go_last_update" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shipments_zap_sign_id_unique" UNIQUE("zap_sign_id"),
	CONSTRAINT "shipments_ships_go_id_unique" UNIQUE("ships_go_id")
);
--> statement-breakpoint
CREATE TABLE "storage_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_id" uuid NOT NULL,
	"days_from" integer NOT NULL,
	"days_to" integer,
	"daily_rate" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "storage_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"terminal_id" uuid NOT NULL,
	"type" "container_type" NOT NULL,
	"currency" "currency" DEFAULT 'BRL' NOT NULL,
	"min_value" numeric(10, 2) DEFAULT '0',
	"free_days" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"tax_id" text,
	"country_code" text DEFAULT 'CN',
	"email" text,
	"address" text,
	"siscomex_id" text,
	CONSTRAINT "suppliers_siscomex_id_unique" UNIQUE("siscomex_id")
);
--> statement-breakpoint
CREATE TABLE "terminals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"shipment_id" uuid,
	"type" "transaction_type" NOT NULL,
	"status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"amount_brl" numeric(12, 2),
	"amount_usd" numeric(12, 2),
	"exchange_rate" numeric(10, 4),
	"gateway_id" text,
	"gateway_url" text,
	"proof_url" text,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exchange_contracts" ADD CONSTRAINT "exchange_contracts_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_logs" ADD CONSTRAINT "integration_logs_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_hs_code_id_hs_codes_id_fk" FOREIGN KEY ("hs_code_id") REFERENCES "public"."hs_codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_fee_configs" ADD CONSTRAINT "service_fee_configs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_change_requests" ADD CONSTRAINT "shipment_change_requests_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_change_requests" ADD CONSTRAINT "shipment_change_requests_requested_by_id_profiles_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_containers" ADD CONSTRAINT "shipment_containers_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_documents" ADD CONSTRAINT "shipment_documents_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_documents" ADD CONSTRAINT "shipment_documents_uploaded_by_id_profiles_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_expenses" ADD CONSTRAINT "shipment_expenses_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_step_history" ADD CONSTRAINT "shipment_step_history_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_step_history" ADD CONSTRAINT "shipment_step_history_completed_by_id_profiles_id_fk" FOREIGN KEY ("completed_by_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storage_periods" ADD CONSTRAINT "storage_periods_rule_id_storage_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."storage_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storage_rules" ADD CONSTRAINT "storage_rules_terminal_id_terminals_id_fk" FOREIGN KEY ("terminal_id") REFERENCES "public"."terminals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;