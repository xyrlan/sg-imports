CREATE TYPE "public"."charge_type" AS ENUM('PERCENTAGE', 'FIXED');--> statement-breakpoint
CREATE TYPE "public"."difal" AS ENUM('INSIDE', 'OUTSIDE');--> statement-breakpoint
CREATE TYPE "public"."fee_basis" AS ENUM('PER_BOX', 'PER_BL', 'PER_WM', 'PER_CONTAINER');--> statement-breakpoint
CREATE TYPE "public"."rate_type" AS ENUM('AFRMM', 'INTL_INSURANCE', 'CUSTOMS_BROKER_SDA', 'CONTAINER_UNSTUFFING', 'CONTAINER_WASHING', 'PIS_DEFAULT', 'COFINS_DEFAULT');--> statement-breakpoint
CREATE TYPE "public"."rate_unit" AS ENUM('PERCENT', 'FIXED_BRL', 'FIXED_USD', 'PER_CONTAINER_BRL');--> statement-breakpoint
CREATE TABLE "global_platform_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rate_type" "rate_type" NOT NULL,
	"value" numeric(12, 4) DEFAULT '0' NOT NULL,
	"unit" "rate_unit" DEFAULT 'PERCENT' NOT NULL,
	"currency" "currency" DEFAULT 'BRL',
	"description" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "global_platform_rates_rate_type_unique" UNIQUE("rate_type")
);
--> statement-breakpoint
CREATE TABLE "siscomex_fee_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registration_value" numeric(12, 2) DEFAULT '0' NOT NULL,
	"additions" jsonb DEFAULT '[]'::jsonb,
	"additions_11_to_20" jsonb DEFAULT '[]'::jsonb,
	"additions_21_to_50" jsonb DEFAULT '[]'::jsonb,
	"additions_51_and_above" jsonb DEFAULT '[]'::jsonb,
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
ALTER TABLE "storage_periods" ADD COLUMN "charge_type" charge_type DEFAULT 'PERCENTAGE' NOT NULL;--> statement-breakpoint
ALTER TABLE "storage_periods" ADD COLUMN "rate" numeric(12, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "storage_periods" ADD COLUMN "is_daily_rate" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "storage_rules" ADD COLUMN "shipment_type" "shipment_type" DEFAULT 'FCL' NOT NULL;--> statement-breakpoint
ALTER TABLE "storage_rules" ADD COLUMN "additional_fees" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "storage_periods" DROP COLUMN "daily_rate";