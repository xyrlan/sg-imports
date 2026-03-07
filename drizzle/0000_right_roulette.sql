CREATE TYPE "public"."charge_type" AS ENUM('PERCENTAGE', 'FIXED');--> statement-breakpoint
CREATE TYPE "public"."container_type" AS ENUM('GP_20', 'GP_40', 'HC_40', 'RF_20', 'RF_40');--> statement-breakpoint
CREATE TYPE "public"."currency" AS ENUM('BRL', 'USD', 'CNY', 'EUR');--> statement-breakpoint
CREATE TYPE "public"."difal" AS ENUM('INSIDE', 'OUTSIDE');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('COMMERCIAL_INVOICE', 'PACKING_LIST', 'BILL_OF_LADING', 'IMPORT_DECLARATION', 'ORIGIN_CERTIFICATE', 'SISCOMEX_RECEIPT', 'ICMS_PROOF', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."expense_type" AS ENUM('TAX_II', 'TAX_IPI', 'TAX_PIS', 'TAX_COFINS', 'TAX_ICMS', 'FREIGHT_INTL', 'FREIGHT_LOCAL', 'STORAGE', 'HANDLING', 'CUSTOMS_BROKER', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."fee_basis" AS ENUM('PER_BOX', 'PER_BL', 'PER_WM', 'PER_CONTAINER');--> statement-breakpoint
CREATE TYPE "public"."freight_proposal_status" AS ENUM('DRAFT', 'SENT', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."incoterm" AS ENUM('EXW', 'FOB', 'CIF', 'DDP');--> statement-breakpoint
CREATE TYPE "public"."order_type" AS ENUM('ORDER', 'DIRECT_ORDER');--> statement-breakpoint
CREATE TYPE "public"."organization_role" AS ENUM('OWNER', 'ADMIN', 'EMPLOYEE', 'SELLER', 'CUSTOMS_BROKER', 'VIEWER');--> statement-breakpoint
CREATE TYPE "public"."packaging_type" AS ENUM('BOX', 'PALLET', 'BAG');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'PAID', 'OVERDUE', 'WAITING_EXCHANGE', 'EXCHANGED');--> statement-breakpoint
CREATE TYPE "public"."pricing_scope" AS ENUM('CARRIER', 'PORT', 'SPECIFIC');--> statement-breakpoint
CREATE TYPE "public"."quote_status" AS ENUM('DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'CONVERTED');--> statement-breakpoint
CREATE TYPE "public"."quote_type" AS ENUM('STANDARD', 'PROFORMA', 'SIMULATION');--> statement-breakpoint
CREATE TYPE "public"."rate_type" AS ENUM('AFRMM', 'INTL_INSURANCE', 'CUSTOMS_BROKER_SDA', 'CONTAINER_UNSTUFFING', 'CONTAINER_WASHING', 'PIS_DEFAULT', 'COFINS_DEFAULT');--> statement-breakpoint
CREATE TYPE "public"."rate_unit" AS ENUM('PERCENT', 'FIXED_BRL', 'FIXED_USD', 'PER_CONTAINER_BRL');--> statement-breakpoint
CREATE TYPE "public"."shipment_status" AS ENUM('PENDING', 'PRODUCTION', 'BOOKED', 'IN_TRANSIT', 'CUSTOMS_CLEARANCE', 'RELEASED', 'DELIVERED', 'CANCELED');--> statement-breakpoint
CREATE TYPE "public"."shipment_step" AS ENUM('CONTRACT_CREATION', 'MERCHANDISE_PAYMENT', 'DOCUMENT_PREPARATION', 'SHIPPING', 'DELIVERY', 'COMPLETION');--> statement-breakpoint
CREATE TYPE "public"."shipping_modality" AS ENUM('AIR', 'SEA_LCL', 'SEA_FCL', 'SEA_FCL_PARTIAL', 'EXPRESS');--> statement-breakpoint
CREATE TYPE "public"."system_role" AS ENUM('USER', 'SUPER_ADMIN', 'SUPER_ADMIN_EMPLOYEE');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('MERCHANDISE', 'BALANCE', 'FREIGHT', 'TAXES', 'SERVICE_FEE');--> statement-breakpoint
CREATE TYPE "public"."wallet_transaction_type" AS ENUM('CREDIT', 'DEBIT');--> statement-breakpoint
CREATE TYPE "public"."webhook_status" AS ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');--> statement-breakpoint
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
	"status" text,
	CONSTRAINT "carriers_scac_code_unique" UNIQUE("scac_code")
);
--> statement-breakpoint
CREATE TABLE "currency_exchange_brokers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exchange_contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"broker_id" uuid,
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
CREATE TABLE "global_platform_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rate_type" "rate_type" NOT NULL,
	"value" numeric(12, 4) DEFAULT '0' NOT NULL,
	"unit" "rate_unit" DEFAULT 'PERCENT' NOT NULL,
	"description" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "global_platform_rates_rate_type_unique" UNIQUE("rate_type")
);
--> statement-breakpoint
CREATE TABLE "global_service_fee_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"minimum_wage_brl" numeric(10, 2) DEFAULT '1530.00' NOT NULL,
	"default_multiplier" integer DEFAULT 2 NOT NULL,
	"default_percentage" numeric(5, 2) DEFAULT '2.5',
	"default_apply_to_china" boolean DEFAULT true,
	"updated_at" timestamp DEFAULT now() NOT NULL
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
	"antidumping_tax" numeric(5, 2) DEFAULT '0',
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
	"social_contract_url" text,
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
CREATE TABLE "product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"sku" text NOT NULL,
	"name" text NOT NULL,
	"price_usd" numeric(10, 2) NOT NULL,
	"units_per_carton" integer DEFAULT 1 NOT NULL,
	"carton_height" numeric(10, 2) DEFAULT '0' NOT NULL,
	"carton_width" numeric(10, 2) DEFAULT '0' NOT NULL,
	"carton_length" numeric(10, 2) DEFAULT '0' NOT NULL,
	"carton_weight" numeric(10, 3) DEFAULT '0' NOT NULL,
	"attributes" jsonb,
	"tiered_price_info" jsonb,
	"height" numeric(10, 2),
	"width" numeric(10, 2),
	"length" numeric(10, 2),
	"net_weight" numeric(10, 3),
	"unit_weight" numeric(10, 3),
	"packaging_type" "packaging_type",
	CONSTRAINT "product_variants_org_sku" UNIQUE("organization_id","sku")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"style_code" text,
	"name" text NOT NULL,
	"description" text,
	"photos" text[],
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
	"document_photo_url" text,
	"address_proof_url" text,
	"system_role" "system_role" DEFAULT 'USER' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "quote_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_id" uuid NOT NULL,
	"variant_id" uuid,
	"simulated_product_snapshot" jsonb,
	"quantity" integer NOT NULL,
	"price_usd" numeric(10, 2) NOT NULL,
	"weight_snapshot" numeric(12, 3) DEFAULT '0' NOT NULL,
	"cbm_snapshot" numeric(12, 6) DEFAULT '0' NOT NULL,
	"unit_price_usd_snapshot" numeric(10, 4) DEFAULT '0' NOT NULL,
	"ii_rate_snapshot" numeric(5, 2) DEFAULT '0' NOT NULL,
	"ipi_rate_snapshot" numeric(5, 2) DEFAULT '0' NOT NULL,
	"pis_rate_snapshot" numeric(5, 2) DEFAULT '0' NOT NULL,
	"cofins_rate_snapshot" numeric(5, 2) DEFAULT '0' NOT NULL,
	"ii_value_snapshot" numeric(12, 4) DEFAULT '0' NOT NULL,
	"ipi_value_snapshot" numeric(12, 4) DEFAULT '0' NOT NULL,
	"pis_value_snapshot" numeric(12, 4) DEFAULT '0' NOT NULL,
	"cofins_value_snapshot" numeric(12, 4) DEFAULT '0' NOT NULL,
	CONSTRAINT "quote_items_variant_or_simulated" CHECK (("quote_items"."variant_id" IS NOT NULL) OR ("quote_items"."simulated_product_snapshot" IS NOT NULL))
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
	"shipping_modality" "shipping_modality",
	"exchange_rate_iof" numeric(10, 4),
	"total_cbm" numeric(12, 6),
	"total_weight" numeric(12, 3),
	"total_chargeable_weight" numeric(12, 3) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_fee_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"minimum_value_multiplier" integer DEFAULT 2 NOT NULL,
	"percentage" numeric(5, 2) DEFAULT '2.5',
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
	"shipment_type" "shipping_modality" DEFAULT 'SEA_FCL' NOT NULL,
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
CREATE TABLE "siscomex_fee_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registration_value" numeric(12, 2) DEFAULT '0' NOT NULL,
	"additions" jsonb DEFAULT '[]'::jsonb,
	"additions_11_to_20" numeric(12, 2) DEFAULT '0' NOT NULL,
	"additions_21_to_50" numeric(12, 2) DEFAULT '0' NOT NULL,
	"additions_51_and_above" numeric(12, 2) DEFAULT '0' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "state_icms_rates" (
	"state" text NOT NULL,
	"difal" "difal" NOT NULL,
	"icms_rate" numeric(5, 2) NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "state_icms_rates_state_difal_pk" PRIMARY KEY("state","difal")
);
--> statement-breakpoint
CREATE TABLE "storage_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_id" uuid NOT NULL,
	"days_from" integer NOT NULL,
	"days_to" integer,
	"charge_type" charge_type DEFAULT 'PERCENTAGE' NOT NULL,
	"rate" numeric(12, 2) NOT NULL,
	"is_daily_rate" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "storage_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"terminal_id" uuid NOT NULL,
	"shipment_type" "shipping_modality" DEFAULT 'SEA_FCL' NOT NULL,
	"container_type" "container_type",
	"currency" "currency" DEFAULT 'BRL' NOT NULL,
	"min_value" numeric(10, 2) DEFAULT '0',
	"free_days" integer DEFAULT 0,
	"cif_insurance" numeric(5, 2) DEFAULT '0',
	"additional_fees" jsonb DEFAULT '[]'::jsonb
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
CREATE TABLE "suppliers_wallet_transactions" (
	"id" uuid DEFAULT gen_random_uuid(),
	"wallet_id" uuid NOT NULL,
	"exchange_contract_id" uuid,
	"order_id" uuid NOT NULL,
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
ALTER TABLE "exchange_contracts" ADD CONSTRAINT "exchange_contracts_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exchange_contracts" ADD CONSTRAINT "exchange_contracts_broker_id_currency_exchange_brokers_id_fk" FOREIGN KEY ("broker_id") REFERENCES "public"."currency_exchange_brokers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "freight_proposals" ADD CONSTRAINT "freight_proposals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "freight_proposals" ADD CONSTRAINT "freight_proposals_international_freight_id_international_freights_id_fk" FOREIGN KEY ("international_freight_id") REFERENCES "public"."international_freights"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "freight_proposals" ADD CONSTRAINT "freight_proposals_created_by_id_profiles_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_logs" ADD CONSTRAINT "integration_logs_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "international_freights" ADD CONSTRAINT "international_freights_carrier_id_carriers_id_fk" FOREIGN KEY ("carrier_id") REFERENCES "public"."carriers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "international_freights" ADD CONSTRAINT "international_freights_port_of_loading_id_ports_id_fk" FOREIGN KEY ("port_of_loading_id") REFERENCES "public"."ports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "international_freights" ADD CONSTRAINT "international_freights_port_of_discharge_id_ports_id_fk" FOREIGN KEY ("port_of_discharge_id") REFERENCES "public"."ports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_items" ADD CONSTRAINT "pricing_items_pricing_rule_id_pricing_rules_id_fk" FOREIGN KEY ("pricing_rule_id") REFERENCES "public"."pricing_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_items" ADD CONSTRAINT "pricing_items_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_carrier_id_carriers_id_fk" FOREIGN KEY ("carrier_id") REFERENCES "public"."carriers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_port_id_ports_id_fk" FOREIGN KEY ("port_id") REFERENCES "public"."ports"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "shipment_freight_receipts" ADD CONSTRAINT "shipment_freight_receipts_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_freight_receipts" ADD CONSTRAINT "shipment_freight_receipts_carrier_id_carriers_id_fk" FOREIGN KEY ("carrier_id") REFERENCES "public"."carriers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_freight_receipts" ADD CONSTRAINT "shipment_freight_receipts_port_of_loading_id_ports_id_fk" FOREIGN KEY ("port_of_loading_id") REFERENCES "public"."ports"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_freight_receipts" ADD CONSTRAINT "shipment_freight_receipts_port_of_discharge_id_ports_id_fk" FOREIGN KEY ("port_of_discharge_id") REFERENCES "public"."ports"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_freight_receipts" ADD CONSTRAINT "shipment_freight_receipts_document_id_shipment_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."shipment_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_step_history" ADD CONSTRAINT "shipment_step_history_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_step_history" ADD CONSTRAINT "shipment_step_history_completed_by_id_profiles_id_fk" FOREIGN KEY ("completed_by_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storage_periods" ADD CONSTRAINT "storage_periods_rule_id_storage_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."storage_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storage_rules" ADD CONSTRAINT "storage_rules_terminal_id_terminals_id_fk" FOREIGN KEY ("terminal_id") REFERENCES "public"."terminals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sub_suppliers" ADD CONSTRAINT "sub_suppliers_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers_wallet_transactions" ADD CONSTRAINT "suppliers_wallet_transactions_wallet_id_suppliers_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."suppliers_wallets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers_wallet_transactions" ADD CONSTRAINT "suppliers_wallet_transactions_exchange_contract_id_exchange_contracts_id_fk" FOREIGN KEY ("exchange_contract_id") REFERENCES "public"."exchange_contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers_wallet_transactions" ADD CONSTRAINT "suppliers_wallet_transactions_order_id_shipments_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers_wallet_transactions" ADD CONSTRAINT "suppliers_wallet_transactions_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers_wallets" ADD CONSTRAINT "suppliers_wallets_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "webhook_events_status_created_at_idx" ON "webhook_events" USING btree ("status","created_at");